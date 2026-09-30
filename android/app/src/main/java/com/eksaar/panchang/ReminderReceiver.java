package com.eksaar.panchang;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import java.time.Instant;
import org.json.*;

/** User-requested local reminders. No exact-alarm permission or background location. */
public class ReminderReceiver extends BroadcastReceiver {
  private static SharedPreferences prefs(Context c) {
    return c.getSharedPreferences("native-reminders", Context.MODE_PRIVATE);
  }

  static JSONArray list(Context c) {
    try {
      return new JSONArray(prefs(c).getString("events", "[]"));
    } catch (Exception e) {
      return new JSONArray();
    }
  }

  private static PendingIntent alarm(Context c, String id) {
    Intent i =
        new Intent(c, ReminderReceiver.class)
            .setAction("com.eksaar.panchang.REMIND")
            .setData(Uri.parse("eksaar-reminder:" + Uri.encode(id)))
            .putExtra("id", id);
    return PendingIntent.getBroadcast(
        c, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
  }

  private static void arm(Context c, JSONObject e) {
    long when = Instant.parse(e.optString("start")).toEpochMilli();
    ((AlarmManager) c.getSystemService(Context.ALARM_SERVICE))
        .setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, alarm(c, e.optString("id")));
  }

  static void schedule(Context c, JSONObject event) throws Exception {
    if (Build.VERSION.SDK_INT >= 33
        && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED)
      throw new Exception("Notifications are disabled in Android Settings.");
    NotificationManager manager =
        (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
    if (!manager.areNotificationsEnabled())
      throw new Exception("Notifications are disabled in Android Settings.");
    if (!Instant.parse(event.getString("start")).isAfter(Instant.now().plusSeconds(5)))
      throw new Exception("Choose a future event for a reminder.");
    NativeState.name(event.getString("name"));
    String id = event.getString("id");
    if (id.isEmpty() || id.length() > 200) throw new Exception("Invalid event identifier.");
    JSONArray kept = new JSONArray();
    JSONArray old = list(c);
    for (int i = 0; i < old.length(); i++) {
      JSONObject e = old.getJSONObject(i);
      if (!e.optString("id").equals(id)
          && Instant.parse(e.getString("start")).isAfter(Instant.now())) kept.put(e);
    }
    if (kept.length() >= 60)
      throw new Exception("Remove a reminder before adding another. You can keep up to 60.");
    JSONObject minimal =
        new JSONObject()
            .put("id", id)
            .put("name", event.getString("name"))
            .put("start", event.getString("start"));
    kept.put(minimal);
    if (!prefs(c).edit().putString("events", kept.toString()).commit())
      throw new Exception("The reminder could not be saved.");
    arm(c, minimal);
  }

  static void remove(Context c, String id) {
    ((AlarmManager) c.getSystemService(Context.ALARM_SERVICE)).cancel(alarm(c, id));
    JSONArray kept = new JSONArray(), old = list(c);
    for (int i = 0; i < old.length(); i++) {
      JSONObject e = old.optJSONObject(i);
      if (!e.optString("id").equals(id)) kept.put(e);
    }
    prefs(c).edit().putString("events", kept.toString()).apply();
  }

  @Override
  public void onReceive(Context context, Intent intent) {
    if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())
        || Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) {
      JSONArray events = list(context);
      for (int i = 0; i < events.length(); i++)
        try {
          JSONObject e = events.getJSONObject(i);
          if (Instant.parse(e.getString("start")).isAfter(Instant.now())) arm(context, e);
        } catch (Exception ignored) {
        }
      return;
    }
    String id = intent.getStringExtra("id");
    if (id == null) return;
    JSONObject event = null;
    JSONArray events = list(context);
    for (int i = 0; i < events.length(); i++)
      if (events.optJSONObject(i).optString("id").equals(id)) event = events.optJSONObject(i);
    if (event == null) return;
    NotificationManager manager =
        (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    if (Build.VERSION.SDK_INT >= 26)
      manager.createNotificationChannel(
          new NotificationChannel(
              "lunar-dates", "Lunar date reminders", NotificationManager.IMPORTANCE_DEFAULT));
    if (Build.VERSION.SDK_INT < 33
        || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
            == PackageManager.PERMISSION_GRANTED) {
      PendingIntent open =
          PendingIntent.getActivity(
              context,
              0,
              new Intent(context, MainActivity.class),
              PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
      manager.notify(
          id,
          0,
          new NotificationCompat.Builder(context, "lunar-dates")
              .setSmallIcon(android.R.drawable.ic_menu_my_calendar)
              .setContentTitle(event.optString("name"))
              .setContentText("Your saved Panchang event. Open the app for details.")
              .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
              .setContentIntent(open)
              .setAutoCancel(true)
              .build());
    }
    remove(context, id);
  }
}
