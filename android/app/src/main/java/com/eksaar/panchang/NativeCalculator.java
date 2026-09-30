package com.eksaar.panchang;

import android.annotation.SuppressLint;
import android.content.Context;
import android.webkit.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.json.*;

/** Invisible calculation runtime. No UI, network permission, native JS bridge or remote code. */
final class NativeCalculator {
  interface Result {
    void accept(Object value, String error);
  }

  interface Ready {
    void accept(String legacy, String error);
  }

  private final WebView runtime;
  private boolean ready = false, closed = false;
  private final ArrayDeque<Runnable> pending = new ArrayDeque<>();

  @SuppressLint("SetJavaScriptEnabled")
  NativeCalculator(Context context, Ready completion) {
    runtime = new WebView(context);
    WebSettings s = runtime.getSettings();
    s.setJavaScriptEnabled(true);
    s.setBlockNetworkLoads(true);
    s.setAllowFileAccess(false);
    s.setAllowContentAccess(false);
    s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    // Read the earlier Capacitor app's own localStorage once. Never erase it.
    s.setDomStorageEnabled(true);
    runtime.setWebViewClient(
        new WebViewClient() {
          @Override
          public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
            return true;
          }

          @Override
          public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
            return new WebResourceResponse(
                "text/plain", "UTF-8", new ByteArrayInputStream(new byte[0]));
          }

          @Override
          public void onPageFinished(WebView v, String url) {
            if (ready || closed) return;
            runtime.evaluateJavascript(
                "JSON.stringify({ready:typeof EksaarNative==='object',legacy:(()=>{try{return"
                    + " localStorage.getItem('eksaar-panchang-v2')}catch(e){return null}})()})",
                raw -> {
                  if (closed) return;
                  try {
                    JSONObject boot = new JSONObject((String) new JSONTokener(raw).nextValue());
                    if (!boot.optBoolean("ready")) throw new Exception();
                    ready = true;
                    s.setDomStorageEnabled(false);
                    completion.accept(
                        boot.isNull("legacy") ? null : boot.getString("legacy"), null);
                    while (!pending.isEmpty()) pending.remove().run();
                  } catch (Exception e) {
                    completion.accept(
                        null,
                        "The offline calculation engine could not start. Update Android System"
                            + " WebView and reopen the app.");
                  }
                });
          }

          @Override
          public boolean onRenderProcessGone(WebView v, RenderProcessGoneDetail detail) {
            closed = true;
            pending.clear();
            completion.accept(
                null,
                "The calculation process stopped. Reopen the app to continue; saved dates are"
                    + " safe.");
            v.destroy();
            return true;
          }
        });
    try (InputStream in = context.getAssets().open("native-engine.js")) {
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      byte[] b = new byte[8192];
      int n;
      while ((n = in.read(b)) != -1) out.write(b, 0, n);
      String js = out.toString(StandardCharsets.UTF_8.name()).replace("</script", "<\\/script");
      runtime.loadDataWithBaseURL(
          "https://localhost/",
          "<!doctype html><meta http-equiv=\"Content-Security-Policy\" content=\"default-src"
              + " 'none'; script-src 'unsafe-inline'\"><script>"
              + js
              + "</script>",
          "text/html",
          "UTF-8",
          null);
    } catch (Exception e) {
      completion.accept(
          null,
          "The bundled offline resources are missing. Please reinstall from the official release"
              + " after exporting your backup.");
    }
  }

  void run(JSONObject input, Result callback) {
    if (closed) {
      callback.accept(null, "Reopen the app to restart calculations.");
      return;
    }
    if (!ready) {
      pending.add(() -> run(input, callback));
      return;
    }
    runtime.evaluateJavascript(
        "EksaarNative.request(" + JSONObject.quote(input.toString()) + ")",
        raw -> {
          if (closed) return;
          try {
            JSONObject envelope = new JSONObject((String) new JSONTokener(raw).nextValue());
            if (envelope.has("error")) callback.accept(null, envelope.getString("error"));
            else callback.accept(envelope.get("value"), null);
          } catch (Exception e) {
            callback.accept(
                null, "This date could not be calculated. Please try another date or location.");
          }
        });
  }

  void close() {
    if (!closed) {
      closed = true;
      pending.clear();
      runtime.destroy();
    }
  }
}
