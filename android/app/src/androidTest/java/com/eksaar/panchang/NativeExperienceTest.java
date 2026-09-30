package com.eksaar.panchang;

import android.content.*;
import android.content.pm.PackageManager;
import android.os.SystemClock;
import android.view.*;
import android.widget.*;
import androidx.test.core.app.ActivityScenario;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.json.*;
import org.junit.*;
import org.junit.runner.RunWith;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import static org.junit.Assert.*;
import static androidx.test.espresso.Espresso.*;
import static androidx.test.espresso.action.ViewActions.*;
import static androidx.test.espresso.assertion.ViewAssertions.*;
import static androidx.test.espresso.matcher.ViewMatchers.*;

@RunWith(AndroidJUnit4.class)
public class NativeExperienceTest {
    private final Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
    private JSONObject lunar(String name) throws Exception {return new JSONObject().put("id",java.util.UUID.randomUUID().toString()).put("name",name).put("month",5).put("tithi",6).put("includeAdhika",false);}
    @Test public void backupValidationAndMergePreserveExistingDates() throws Exception {
        NativeState state=new NativeState(context);state.data=NativeState.defaults();state.writable=true;state.personal().put(lunar("Family date"));state.save();JSONObject backup=NativeState.defaults();backup.getJSONArray("personal").put(lunar("Birthday"));assertEquals(1,state.merge(backup));assertEquals(0,state.merge(backup));assertEquals(2,new NativeState(context).personal().length());
        for(String mutation:new String[]{"badzone","fraction","duplicate","overflow"}){JSONObject bad=NativeState.copy(backup);if(mutation.equals("badzone"))bad.getJSONObject("location").put("zone","Invalid/Zone");if(mutation.equals("fraction"))bad.getJSONArray("personal").getJSONObject(0).put("tithi",1.5);if(mutation.equals("duplicate"))bad.getJSONArray("personal").put(bad.getJSONArray("personal").getJSONObject(0));if(mutation.equals("overflow"))bad.getJSONObject("location").put("lat",91);try{state.merge(bad);fail("Accepted invalid backup: "+mutation);}catch(Exception expected){}assertEquals(2,new NativeState(context).personal().length());}
        byte[] huge=new byte[NativeState.MAX_BYTES+1];try{NativeState.parse(new ByteArrayInputStream(huge));fail("Oversized backup accepted");}catch(Exception expected){}
    }
    @Test public void legacyConversionAndUnreadableStateArePreserved() throws Exception {
        JSONObject legacy=new JSONObject().put("location",NativeState.defaults().getJSONObject("location")).put("theme","dark").put("personal",new JSONArray().put(new JSONObject().put("name","Family date").put("month",3).put("tithi",12)));
        JSONObject migrated=NativeState.legacy(legacy.toString());assertEquals("dark",migrated.getJSONObject("settings").getString("appearance"));assertEquals("Family date",migrated.getJSONArray("personal").getJSONObject(0).getString("name"));
        NativeState state=new NativeState(context);try(FileOutputStream out=new FileOutputStream(state.file.getBaseFile())){out.write("invalid-original".getBytes(StandardCharsets.UTF_8));}NativeState broken=new NativeState(context);assertFalse(broken.writable);try{broken.save();fail("Overwrote damaged state");}catch(Exception expected){}try(FileInputStream in=new FileInputStream(state.file.getBaseFile())){byte[] bytes=new byte[32];int n=in.read(bytes);assertEquals("invalid-original",new String(bytes,0,n,StandardCharsets.UTF_8));}broken.writable=true;broken.data=NativeState.defaults();broken.save();
    }
    @Test public void calculatorRunsOfflineAndRejectsBadInput() throws Exception {
        CountDownLatch initialized=new CountDownLatch(1),completed=new CountDownLatch(1);AtomicReference<String> error=new AtomicReference<>();AtomicReference<NativeCalculator> ref=new AtomicReference<>();AtomicReference<JSONObject> answer=new AtomicReference<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(()->ref.set(new NativeCalculator(context,(legacy,problem)->{error.set(problem);initialized.countDown();})));assertTrue("Engine startup",initialized.await(30,TimeUnit.SECONDS));assertNull(error.get());
        JSONObject input=NativeState.defaults().put("kind","day").put("date","2026-09-17").put("instant","2026-09-17T06:30:00Z");
        InstrumentationRegistry.getInstrumentation().runOnMainSync(()->ref.get().run(input,(value,problem)->{error.set(problem);if(value instanceof JSONObject)answer.set((JSONObject)value);completed.countDown();}));assertTrue(completed.await(30,TimeUnit.SECONDS));assertNull(error.get());assertEquals("Shukla Paksha Saptami",answer.get().getJSONArray("angas").getJSONObject(0).getString("name"));
        CountDownLatch invalid=new CountDownLatch(1);input.getJSONObject("location").put("lat",100);InstrumentationRegistry.getInstrumentation().runOnMainSync(()->ref.get().run(input,(value,problem)->{error.set(problem);invalid.countDown();}));assertTrue(invalid.await(30,TimeUnit.SECONDS));assertNotNull(error.get());InstrumentationRegistry.getInstrumentation().runOnMainSync(()->ref.get().close());
        assertEquals(PackageManager.PERMISSION_DENIED,context.checkSelfPermission(android.Manifest.permission.INTERNET));assertEquals(PackageManager.PERMISSION_DENIED,context.checkSelfPermission(android.Manifest.permission.READ_CALENDAR));assertEquals(PackageManager.PERMISSION_DENIED,context.checkSelfPermission(android.Manifest.permission.WRITE_CALENDAR));
    }
    @Test public void nativeTabsSavedDateAndRecreation() throws Exception {
        NativeState state=new NativeState(context);state.data=NativeState.defaults();state.writable=true;state.save();
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
            waitForText(scenario,"Your day, in rhythm");
            onView(withId(R.id.tab_personal)).perform(click());onView(withText("Add lunar date")).perform(scrollTo(),click());onView(withId(R.id.personal_name)).perform(replaceText("Native test birthday"),closeSoftKeyboard());onView(withText("Save")).perform(click());
            waitForText(scenario,"Native test birthday");scenario.recreate();waitForText(scenario,"Native test birthday");
            onView(withId(R.id.tab_month)).perform(click());waitForText(scenario,"This month's observances");
            onView(withId(R.id.tab_timings)).perform(click());waitForText(scenario,"Daily periods");
            onView(withId(R.id.tab_settings)).perform(click());waitForText(scenario,"Private by design");
            scenario.onActivity(activity->{assertFalse("No web UI should be attached",containsWebView(activity.findViewById(R.id.native_root)));});
        }
    }
    private static boolean containsWebView(View v){if(v instanceof android.webkit.WebView)return true;if(v instanceof ViewGroup){ViewGroup group=(ViewGroup)v;for(int i=0;i<group.getChildCount();i++)if(containsWebView(group.getChildAt(i)))return true;}return false;}
    private static boolean contains(View v,String text){if(v instanceof TextView&&((TextView)v).getText().toString().contains(text))return true;if(v instanceof ViewGroup){ViewGroup group=(ViewGroup)v;for(int i=0;i<group.getChildCount();i++)if(contains(group.getChildAt(i),text))return true;}return false;}
    private static void waitForText(ActivityScenario<MainActivity> scenario,String text){long deadline=SystemClock.uptimeMillis()+45_000;AtomicBoolean found=new AtomicBoolean();do{scenario.onActivity(a->found.set(contains(a.findViewById(R.id.native_root),text)));if(found.get())return;SystemClock.sleep(100);}while(SystemClock.uptimeMillis()<deadline);fail("Missing native content: "+text);}
}
