package com.eksaar.panchang;

import android.annotation.SuppressLint;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
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
  private String failure;
  private final Handler handler = new Handler(Looper.getMainLooper());
  private final LinkedHashMap<String, Work> pending = new LinkedHashMap<>();
  private Work active;

  private record Work(JSONObject input, Result callback) {}

  private Runnable timeout;

  private void fail(String message) {
    failure = message;
    if (timeout != null) handler.removeCallbacks(timeout);
    Work current = active;
    active = null;
    ArrayList<Work> rest = new ArrayList<>(pending.values());
    pending.clear();
    if (current != null) current.callback.accept(null, message);
    for (Work work : rest) work.callback.accept(null, message);
  }

  @SuppressLint("SetJavaScriptEnabled")
  NativeCalculator(Context context, Ready completion) {
    runtime = new WebView(context);
    timeout =
        () -> {
          if (!ready && !closed) {
            fail(
                "The offline engine did not start. Reopen the app and check that Android System"
                    + " WebView is up to date.");
            completion.accept(null, failure);
          }
        };
    handler.postDelayed(timeout, 25_000);
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
            if (ready || closed || failure != null) return;
            runtime.evaluateJavascript(
                "JSON.stringify({ready:typeof EksaarNative==='object',legacy:(()=>{try{return"
                    + " localStorage.getItem('eksaar-panchang-v2')}catch(e){return null}})()})",
                raw -> {
                  if (closed) return;
                  try {
                    JSONObject boot = new JSONObject((String) new JSONTokener(raw).nextValue());
                    if (!boot.optBoolean("ready")) throw new Exception();
                    ready = true;
                    handler.removeCallbacks(timeout);
                    s.setDomStorageEnabled(false);
                    completion.accept(
                        boot.isNull("legacy") ? null : boot.getString("legacy"), null);
                    drain();
                  } catch (Exception e) {
                    fail(
                        "The offline calculation engine could not start. Update Android System"
                            + " WebView and reopen the app.");
                    completion.accept(null, failure);
                  }
                });
          }

          @Override
          public boolean onRenderProcessGone(WebView v, RenderProcessGoneDetail detail) {
            closed = true;
            fail(
                "The calculation process stopped. Reopen the app to continue; saved dates are"
                    + " safe.");
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
      fail("The bundled offline resources could not be read.");
      completion.accept(
          null,
          "The bundled offline resources are missing. Please reinstall from the official release"
              + " after exporting your backup.");
    }
  }

  void run(JSONObject input, Result callback) {
    if (closed || failure != null) {
      callback.accept(null, failure == null ? "Reopen the app to restart calculations." : failure);
      return;
    }
    // Keep only the newest queued request of each kind when the user changes dates quickly.
    pending.put(input.optString("kind"), new Work(NativeState.copy(input), callback));
    drain();
  }

  private void drain() {
    if (!ready || closed || failure != null || active != null || pending.isEmpty()) return;
    String kind = pending.keySet().iterator().next();
    Work work = pending.remove(kind);
    active = work;
    timeout =
        () -> {
          if (active != work || closed) return;
          fail(
              "This calculation took too long. Reopen the app and try fewer saved dates or another"
                  + " place.");
          closed = true;
          runtime.destroy();
        };
    handler.postDelayed(timeout, 60_000);
    String quoted =
        JSONObject.quote(work.input.toString())
            .replace(String.valueOf((char) 0x2028), "\\u2028")
            .replace(String.valueOf((char) 0x2029), "\\u2029");
    runtime.evaluateJavascript(
        "EksaarNative.request(" + quoted + ")",
        raw -> {
          if (closed || active != work) return;
          handler.removeCallbacks(timeout);
          active = null;
          Object value = null;
          String problem = null;
          try {
            JSONObject envelope = new JSONObject((String) new JSONTokener(raw).nextValue());
            if (envelope.has("error")) problem = envelope.getString("error");
            else value = envelope.get("value");
          } catch (Exception e) {
            problem = "This date could not be calculated. Please try another date or location.";
          }
          work.callback.accept(value, problem);
          drain();
        });
  }

  void close() {
    if (!closed) {
      closed = true;
      handler.removeCallbacksAndMessages(null);
      pending.clear();
      active = null;
      runtime.destroy();
    }
  }
}
