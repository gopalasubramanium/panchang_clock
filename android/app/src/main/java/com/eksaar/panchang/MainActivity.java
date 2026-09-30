package com.eksaar.panchang;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.graphics.Typeface;
import android.location.*;
import android.net.Uri;
import android.os.*;
import android.provider.CalendarContract;
import android.text.*;
import android.view.*;
import android.widget.*;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.app.AppCompatDelegate;
import androidx.core.graphics.Insets;
import androidx.core.view.*;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.card.MaterialCardView;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;
import com.google.android.material.navigation.NavigationBarView;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.*;
import org.json.*;

/** Native Android planning experience. Only the scientific calculations use bundled JavaScript. */
public class MainActivity extends AppCompatActivity {
  NativeState store;
  NativeCalculator calculator;
  private LinearLayout content;
  private ScrollView scroll;
  private BottomNavigationView nav;
  private MaterialButton locationButton;
  private final Handler handler = new Handler(Looper.getMainLooper());
  private final ExecutorService io = Executors.newSingleThreadExecutor();
  private JSONArray cities = new JSONArray(), month = new JSONArray(), upcoming = new JSONArray();
  private JSONObject day, pendingReminder;
  private LocalDate date, monthAnchor;
  private Instant chosen;
  private boolean live = true, started = false, loading = true;
  private int tab = 0, revision = 0, monthRevision = 0, upcomingRevision = 0;
  private String monthKey = "", error;
  private LocationManager locationManager;
  private LocationListener locationListener;
  private final Runnable tick =
      new Runnable() {
        public void run() {
          if (started && live) {
            LocalDate now = LocalDate.now(store.zone());
            if (!now.equals(date)) {
              date = now;
              monthAnchor = date;
              monthKey = "";
            }
            loadDay(true);
          }
          handler.postDelayed(this, 60_000);
        }
      };
  private static final int BACKUP_EXPORT = 41,
      BACKUP_IMPORT = 42,
      LOCATION_PERMISSION = 43,
      NOTIFICATION_PERMISSION = 44;
  private final String[] tabs = {"Today", "Month", "Timings", "My dates", "Settings"};
  private final int[] tabIds = {
    R.id.tab_today, R.id.tab_month, R.id.tab_timings, R.id.tab_personal, R.id.tab_settings
  };

  @Override
  public void onCreate(Bundle saved) {
    store = new NativeState(this);
    appearance();
    super.onCreate(saved);
    date = LocalDate.now(store.zone());
    monthAnchor = date;
    if (saved != null)
      try {
        date = LocalDate.parse(saved.getString("date"));
        monthAnchor = LocalDate.parse(saved.getString("month"));
        live = saved.getBoolean("live");
        tab = saved.getInt("tab");
        if (saved.getString("instant") != null) chosen = Instant.parse(saved.getString("instant"));
      } catch (Exception ignored) {
        date = LocalDate.now(store.zone());
        monthAnchor = date;
      }
    buildShell();
    error = store.issue;
    render();
    io.execute(
        () -> {
          try (InputStream in = getAssets().open("cities.json")) {
            String text = read(in, 8_000_000);
            JSONArray list = new JSONArray(text);
            runOnUiThread(() -> cities = list);
          } catch (Exception e) {
            runOnUiThread(
                () ->
                    message(
                        "The offline city directory is unavailable. You can enter a location"
                            + " manually."));
          }
        });
    calculator =
        new NativeCalculator(
            this,
            (legacy, problem) -> {
              if (isFinishing() || isDestroyed()) return;
              if (problem != null) {
                error = problem;
                loading = false;
                render();
                return;
              }
              if (legacy != null && !store.existed)
                try {
                  JSONObject previous = NativeState.legacy(legacy);
                  new MaterialAlertDialogBuilder(this)
                      .setTitle("Keep your earlier Panchang data?")
                      .setMessage(
                          "Found "
                              + previous.getJSONArray("personal").length()
                              + " saved lunar dates and your previous place and preferences on this"
                              + " device. Import them into the native app?")
                      .setNegativeButton("Later", null)
                      .setPositiveButton(
                          "Import",
                          (d, w) -> {
                            store.data = previous;
                            persist();
                            appearance();
                            date = LocalDate.now(store.zone());
                            monthAnchor = date;
                            refresh();
                          })
                      .show();
                } catch (Exception e) {
                  message(
                      "Earlier app data has been preserved, but could not be imported"
                          + " automatically. Export it from the earlier app as a backup if"
                          + " available.");
                }
              refresh();
            });
  }

  @Override
  protected void onSaveInstanceState(Bundle out) {
    super.onSaveInstanceState(out);
    out.putString("date", date.toString());
    out.putString("month", monthAnchor.toString());
    out.putBoolean("live", live);
    out.putInt("tab", tab);
    if (chosen != null) out.putString("instant", chosen.toString());
  }

  @Override
  protected void onResume() {
    super.onResume();
    started = true;
    handler.removeCallbacks(tick);
    handler.postDelayed(tick, 60_000);
    if (calculator != null && live) {
      date = LocalDate.now(store.zone());
      loadDay(true);
    }
  }

  @Override
  protected void onPause() {
    started = false;
    handler.removeCallbacks(tick);
    super.onPause();
  }

  @Override
  protected void onDestroy() {
    handler.removeCallbacksAndMessages(null);
    stopLocation();
    io.shutdownNow();
    if (calculator != null) calculator.close();
    super.onDestroy();
  }

  private int dp(float value) {
    return Math.round(value * getResources().getDisplayMetrics().density);
  }

  private int color(int id) {
    return getColor(id);
  }

  private void appearance() {
    String value = store.settings().optString("appearance");
    int mode =
        value.equals("dark")
            ? AppCompatDelegate.MODE_NIGHT_YES
            : value.equals("light")
                ? AppCompatDelegate.MODE_NIGHT_NO
                : AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM;
    if (AppCompatDelegate.getDefaultNightMode() != mode)
      AppCompatDelegate.setDefaultNightMode(mode);
  }

  private void buildShell() {
    LinearLayout root = new LinearLayout(this);
    root.setId(R.id.native_root);
    root.setOrientation(LinearLayout.VERTICAL);
    root.setBackgroundColor(color(R.color.native_background));
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    ViewCompat.setOnApplyWindowInsetsListener(
        root,
        (v, insets) -> {
          Insets bars =
              insets.getInsets(
                  WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
          Insets keyboard = insets.getInsets(WindowInsetsCompat.Type.ime());
          v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
          return WindowInsetsCompat.CONSUMED;
        });
    LinearLayout header = column();
    header.setPadding(dp(20), dp(8), dp(20), dp(8));
    TextView brand = text("EKSAAR PANCHANG", 15, true);
    brand.setLetterSpacing(.16f);
    header.addView(brand);
    locationButton = button(store.location().optString("name"), this::placePicker);
    locationButton.setContentDescription("Choose location: " + store.location().optString("name"));
    header.addView(locationButton);
    locationButton.setBackgroundTintList(ColorStateList.valueOf(color(R.color.native_accent)));
    locationButton.setTextColor(color(R.color.native_on_accent));
    if (getResources().getConfiguration().screenHeightDp < 480
        && getResources().getConfiguration().screenWidthDp > 600) {
      header.setOrientation(LinearLayout.HORIZONTAL);
      header.setGravity(Gravity.CENTER_VERTICAL);
      brand.setLayoutParams(new LinearLayout.LayoutParams(0, -2, 1));
      locationButton.setLayoutParams(new LinearLayout.LayoutParams(0, -2, 1));
    }
    root.addView(header);
    scroll = new ScrollView(this);
    scroll.setId(R.id.native_scroll);
    scroll.setFillViewport(true);
    content = column();
    content.setId(R.id.native_content);
    int side = dp(Math.max(16, (getResources().getConfiguration().screenWidthDp - 760) / 2));
    content.setPadding(side, dp(6), side, dp(24));
    scroll.addView(content);
    root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
    nav = new BottomNavigationView(this);
    nav.setId(R.id.native_nav);
    nav.setBackgroundColor(color(R.color.native_surface));
    nav.setItemActiveIndicatorColor(ColorStateList.valueOf(color(R.color.native_selection)));
    ColorStateList navigationColors =
        new ColorStateList(
            new int[][] {new int[] {android.R.attr.state_checked}, new int[] {}},
            new int[] {color(R.color.native_accent), color(R.color.native_muted)});
    nav.setItemIconTintList(navigationColors);
    nav.setItemTextColor(navigationColors);
    nav.setLabelVisibilityMode(NavigationBarView.LABEL_VISIBILITY_LABELED);
    nav.setItemHorizontalTranslationEnabled(false);
    int[] icons = {
      R.drawable.nav_today,
      R.drawable.nav_month,
      R.drawable.nav_timings,
      R.drawable.nav_dates,
      R.drawable.nav_settings
    };
    for (int i = 0; i < tabs.length; i++)
      nav.getMenu().add(0, tabIds[i], i, tabs[i]).setIcon(icons[i]);
    nav.setSelectedItemId(tabIds[tab]);
    nav.setOnItemSelectedListener(
        item -> {
          for (int i = 0; i < tabIds.length; i++) if (tabIds[i] == item.getItemId()) tab = i;
          render();
          if (tab == 1) loadMonth();
          if (tab == 3) loadUpcoming();
          scroll.post(() -> scroll.scrollTo(0, 0));
          return true;
        });
    root.addView(nav);
    setContentView(root);
    boolean light =
        (getResources().getConfiguration().uiMode
                & android.content.res.Configuration.UI_MODE_NIGHT_MASK)
            != android.content.res.Configuration.UI_MODE_NIGHT_YES;
    WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), root);
    controller.setAppearanceLightStatusBars(light);
    controller.setAppearanceLightNavigationBars(light);
    if (Build.VERSION.SDK_INT < 35) {
      getWindow().setStatusBarColor(color(R.color.native_background));
      getWindow()
          .setNavigationBarColor(
              Build.VERSION.SDK_INT >= 26 ? color(R.color.native_background) : 0xff19332b);
    }
  }

  private LinearLayout column() {
    LinearLayout l = new LinearLayout(this);
    l.setOrientation(LinearLayout.VERTICAL);
    return l;
  }

  private TextView text(String value, int size, boolean bold) {
    TextView t = new TextView(this);
    t.setText(value);
    t.setTextSize(size);
    t.setTextColor(color(R.color.native_text));
    if (bold) t.setTypeface(null, Typeface.BOLD);
    t.setPadding(0, dp(4), 0, dp(4));
    return t;
  }

  private MaterialButton button(String title, Runnable action) {
    MaterialButton b =
        new MaterialButton(
            this, null, com.google.android.material.R.attr.materialButtonOutlinedStyle);
    b.setBackgroundTintList(ColorStateList.valueOf(color(R.color.native_surface)));
    b.setTextColor(color(R.color.native_accent));
    b.setStrokeColor(ColorStateList.valueOf(color(R.color.native_outline)));
    b.setCornerRadius(dp(12));
    b.setPadding(dp(12), dp(8), dp(12), dp(8));
    b.setText(title);
    b.setAllCaps(false);
    b.setMinHeight(dp(48));
    b.setOnClickListener(v -> action.run());
    return b;
  }

  private void arrangeActions(LinearLayout row) {
    boolean stacked =
        getResources().getConfiguration().fontScale > 1.3f
            && getResources().getConfiguration().screenWidthDp < 600;
    row.setOrientation(stacked ? LinearLayout.VERTICAL : LinearLayout.HORIZONTAL);
    for (int i = 0; i < row.getChildCount(); i++) {
      LinearLayout.LayoutParams params =
          new LinearLayout.LayoutParams(stacked ? -1 : 0, -2, stacked ? 0 : 1);
      if (!stacked) {
        if (i > 0) params.leftMargin = dp(4);
        if (i < row.getChildCount() - 1) params.rightMargin = dp(4);
      }
      row.getChildAt(i).setLayoutParams(params);
    }
  }

  private LinearLayout card(String heading) {
    MaterialCardView c = new MaterialCardView(this);
    c.setCardBackgroundColor(color(R.color.native_surface));
    c.setRadius(dp(18));
    c.setCardElevation(0);
    c.setStrokeColor(color(R.color.native_outline));
    LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
    lp.bottomMargin = dp(14);
    c.setLayoutParams(lp);
    LinearLayout body = column();
    body.setPadding(dp(18), dp(14), dp(18), dp(14));
    if (heading != null) {
      TextView h = text(heading, 20, true);
      ViewCompat.setAccessibilityHeading(h, true);
      body.addView(h);
    }
    c.addView(body);
    content.addView(c);
    return body;
  }

  private void note(LinearLayout p, String value) {
    TextView t = text(value, 14, false);
    t.setTextColor(color(R.color.native_muted));
    p.addView(t);
  }

  private void row(LinearLayout p, String name, String value) {
    p.addView(text(name + "\n" + value, 16, false));
  }

  private void message(String value) {
    if (!isFinishing())
      new MaterialAlertDialogBuilder(this)
          .setTitle("Eksaar Panchang")
          .setMessage(value)
          .setPositiveButton("OK", null)
          .show();
  }

  private void persist() {
    try {
      store.save();
    } catch (Exception e) {
      message(e.getMessage());
    }
  }

  private JSONObject input(String kind, LocalDate when) {
    JSONObject p = new JSONObject();
    NativeState.put(p, "kind", kind);
    NativeState.put(p, "date", when.toString());
    NativeState.put(p, "location", NativeState.copy(store.location()));
    NativeState.put(p, "settings", NativeState.copy(store.settings()));
    NativeState.put(p, "personal", store.personal());
    return p;
  }

  private void refresh() {
    monthKey = "";
    loadDay();
    if (tab == 1) loadMonth();
    if (tab == 3) loadUpcoming();
  }

  private void loadDay() {
    loadDay(false);
  }

  private void loadDay(boolean preservingDay) {
    if (calculator == null) return;
    int request = ++revision;
    loading = true;
    if (!preservingDay || day == null || !date.toString().equals(day.optString("date"))) day = null;
    error = null;
    render();
    JSONObject p = input("day", date);
    if (live) NativeState.put(p, "instant", Instant.now().toString());
    else if (chosen != null) NativeState.put(p, "instant", chosen.toString());
    calculator.run(
        p,
        (value, problem) -> {
          if (request != revision) return;
          loading = false;
          error = problem;
          day = value instanceof JSONObject ? (JSONObject) value : null;
          render();
        });
  }

  private void loadMonth() {
    String key = monthAnchor.toString().substring(0, 7) + store.location() + store.settings();
    if (key.equals(monthKey)) return;
    monthKey = key;
    int request = ++monthRevision;
    month = new JSONArray();
    render();
    calculator.run(
        input("month", monthAnchor),
        (value, problem) -> {
          if (request != monthRevision) return;
          if (problem != null) {
            monthKey = "";
            error = problem;
          } else month = (JSONArray) value;
          render();
        });
  }

  private void loadUpcoming() {
    int request = ++upcomingRevision;
    upcoming = new JSONArray();
    if (store.personal().length() == 0) {
      render();
      return;
    }
    calculator.run(
        input("upcoming", LocalDate.now(store.zone())),
        (value, problem) -> {
          if (request != upcomingRevision) return;
          if (problem != null) error = problem;
          else upcoming = (JSONArray) value;
          render();
        });
  }

  private String time(String value) {
    if (value == null || value.isEmpty() || value.equals("null")) return "Not occurring";
    try {
      ZonedDateTime z = Instant.parse(value).atZone(store.zone());
      String pattern = store.settings().optBoolean("hour12") ? "h:mm a" : "HH:mm";
      return z.format(DateTimeFormatter.ofPattern(pattern, Locale.ENGLISH))
          + (z.toLocalDate().equals(date) ? "" : " · " + z.toLocalDate());
    } catch (Exception e) {
      return "Unavailable";
    }
  }

  private String range(JSONObject period) {
    return time(period.optString("start")) + " – " + time(period.optString("end"));
  }

  private void render() {
    if (content == null) return;
    int previousScroll = scroll.getScrollY();
    content.removeAllViews();
    if (!store.writable)
      note(
          card("Saved data protected"),
          store.issue == null
              ? "Your original saved data is preserved. Export new changes or import a valid backup"
                  + " to restore saving."
              : store.issue);
    locationButton.setText(store.location().optString("name"));
    locationButton.setContentDescription("Choose location: " + store.location().optString("name"));
    if (error != null) {
      LinearLayout c = card("Could not complete this action");
      note(c, error);
      c.addView(button("Try again", this::refresh));
    }
    switch (tab) {
      case 0:
        today();
        break;
      case 1:
        monthView();
        break;
      case 2:
        timings();
        break;
      case 3:
        personal();
        break;
      default:
        settings();
    }
    scroll.post(() -> scroll.scrollTo(0, previousScroll));
  }

  private void changeDate(LocalDate value) {
    if (value.getYear() < 1900 || value.getYear() > 2100) {
      message("Choose a date between 1900 and 2100.");
      return;
    }
    date = value;
    monthAnchor = value;
    live = false;
    chosen = null;
    loadDay();
  }

  private void pickDate() {
    DatePickerDialog d =
        new DatePickerDialog(
            this,
            (v, y, m, day) -> changeDate(LocalDate.of(y, m + 1, day)),
            date.getYear(),
            date.getMonthValue() - 1,
            date.getDayOfMonth());
    d.getDatePicker()
        .setMinDate(
            LocalDate.of(1900, 1, 1)
                .atStartOfDay(ZoneId.systemDefault())
                .toInstant()
                .toEpochMilli());
    d.getDatePicker()
        .setMaxDate(
            LocalDate.of(2100, 12, 31)
                .atTime(23, 59)
                .atZone(ZoneId.systemDefault())
                .toInstant()
                .toEpochMilli());
    d.show();
  }

  private void pickTime() {
    LocalTime at =
        chosen == null ? LocalTime.now(store.zone()) : chosen.atZone(store.zone()).toLocalTime();
    new TimePickerDialog(
            this,
            (v, h, m) -> {
              LocalDateTime local = date.atTime(h, m);
              java.util.List<ZoneOffset> offsets = store.zone().getRules().getValidOffsets(local);
              if (offsets.isEmpty()) {
                message(
                    "This clock time does not exist here because of daylight saving. Choose a"
                        + " different time.");
                return;
              }
              if (offsets.size() > 1)
                new MaterialAlertDialogBuilder(this)
                    .setTitle("This time occurs twice")
                    .setItems(
                        new String[] {
                          "Earlier occurrence (" + offsets.get(0) + ")",
                          "Later occurrence (" + offsets.get(1) + ")"
                        },
                        (d, i) -> chooseInstant(local.toInstant(offsets.get(i))))
                    .show();
              else chooseInstant(local.toInstant(offsets.get(0)));
            },
            at.getHour(),
            at.getMinute(),
            !store.settings().optBoolean("hour12"))
        .show();
  }

  private void chooseInstant(Instant value) {
    chosen = value;
    live = false;
    loadDay();
  }

  private void today() {
    LinearLayout controls = card(null);
    controls.addView(
        button(
            date.format(DateTimeFormatter.ofPattern("EEE, d MMM yyyy", Locale.ENGLISH)),
            this::pickDate));
    LinearLayout days = new LinearLayout(this);
    days.addView(
        button("Previous", () -> changeDate(date.minusDays(1))),
        new LinearLayout.LayoutParams(0, -2, 1));
    days.addView(
        button(
            "Today",
            () -> {
              live = true;
              chosen = null;
              date = LocalDate.now(store.zone());
              monthAnchor = date;
              loadDay();
            }),
        new LinearLayout.LayoutParams(0, -2, 1));
    days.addView(
        button("Next", () -> changeDate(date.plusDays(1))),
        new LinearLayout.LayoutParams(0, -2, 1));
    arrangeActions(days);
    controls.addView(days);
    LinearLayout times = new LinearLayout(this);
    times.addView(button("Choose time", this::pickTime), new LinearLayout.LayoutParams(0, -2, 1));
    times.addView(
        button(
            "At sunrise",
            () -> {
              live = false;
              chosen = null;
              loadDay();
            }),
        new LinearLayout.LayoutParams(0, -2, 1));
    arrangeActions(times);
    controls.addView(times);
    note(controls, store.location().optString("zone"));
    if (day == null) {
      note(card(null), loading ? "Calculating on your device…" : "Day unavailable.");
      return;
    }
    LinearLayout hero = card("Your day, in rhythm");
    TextView headline = text(day.optString("weekday"), 30, true);
    headline.setTypeface(Typeface.create("serif", Typeface.NORMAL));
    headline.setId(R.id.daily_summary);
    hero.addView(headline);
    hero.addView(
        text(
            (day.optBoolean("adhika") ? "Adhika " : "")
                + day.optString("month")
                + " · "
                + day.optString("convention"),
            18,
            false));
    note(
        hero,
        live
            ? "At this moment · " + time(day.optString("instant"))
            : chosen != null
                ? "At your chosen time · " + time(day.optString("instant"))
                : day.optJSONObject("sun").isNull("sunrise")
                    ? "No sunrise · local-noon snapshot"
                    : "Snapshot at local sunrise");
    LinearLayout angas = card("The five parts of the day");
    JSONArray a = day.optJSONArray("angas");
    for (int i = 0; i < a.length(); i++) {
      JSONObject x = a.optJSONObject(i);
      MaterialButton b =
          button(
              x.optString("kind").toUpperCase(Locale.ROOT)
                  + "\n"
                  + x.optString("name")
                  + "\nUntil "
                  + time(x.optString("end")),
              () -> angaDetail(x));
      b.setTextAlignment(View.TEXT_ALIGNMENT_VIEW_START);
      angas.addView(b);
    }
    row(angas, "Vaara", day.optString("weekday"));
    LinearLayout sky = card("Sun & Moon");
    JSONObject s = day.optJSONObject("sun");
    for (String k : new String[] {"sunrise", "sunset", "moonrise", "moonset"})
      row(
          sky,
          k.substring(0, 1).toUpperCase(Locale.ENGLISH) + k.substring(1),
          time(s.optString(k)));
    row(sky, "Moon illuminated", Math.round(day.optDouble("illumination") * 100) + "%");
    LinearLayout actions = card(null);
    actions.addView(
        button(
            "Remember this lunar date",
            () -> editPersonal(null, day.optInt("monthIndex"), day.optInt("tithiIndex"))));
    actions.addView(button("Share today's Panchang", () -> share(summary())));
    note(
        actions,
        "Personal dates use the Amanta month and the tithi at the displayed moment. Upcoming"
            + " matches are checked at local sunrise.");
    JSONArray events = day.optJSONArray("events");
    if (events.length() > 0) {
      LinearLayout c = card("Observance previews");
      note(c, "Check your regional tradition for fasting and ceremony rules.");
      for (int i = 0; i < events.length(); i++) {
        JSONObject e = events.optJSONObject(i);
        c.addView(button(e.optString("name"), () -> event(e)));
      }
    }
    LinearLayout extra = card("Sky & calculation");
    row(extra, "Tamil solar month", day.optString("solarMonth"));
    extra.addView(button("Planet positions", this::planets));
    extra.addView(button("How calculations work", this::about));
    JSONArray warnings = day.optJSONArray("warnings");
    for (int i = 0; i < warnings.length(); i++) note(extra, warnings.optString(i));
  }

  private String summary() {
    if (day == null) return "Eksaar Panchang · https://panchang.eksaar.com/";
    StringBuilder b =
        new StringBuilder(
            store.location().optString("name")
                + " · "
                + date
                + " · "
                + store.location().optString("zone")
                + "\n");
    JSONArray a = day.optJSONArray("angas");
    for (int i = 0; i < a.length(); i++) {
      JSONObject x = a.optJSONObject(i);
      b.append(x.optString("kind"))
          .append(": ")
          .append(x.optString("name"))
          .append(", until ")
          .append(time(x.optString("end")))
          .append('\n');
    }
    return b
        + "\n"
        + store.settings().optString("convention")
        + "; "
        + store.settings().optString("sunriseMode")
        + " sunrise.\nEksaar Panchang — free and offline.\nhttps://panchang.eksaar.com/";
  }

  private void share(String value) {
    Intent intent =
        new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, value);
    startActivity(Intent.createChooser(intent, "Share Panchang"));
  }

  private void angaDetail(JSONObject a) {
    String kind = a.optString("kind");
    String explanation =
        switch (kind) {
          case "tithi" ->
              "A lunar day measures each 12° of angular separation between the Sun and Moon.";
          case "nakshatra" ->
              "The Moon's sidereal longitude divides the zodiac into 27 lunar mansions.";
          case "yoga" ->
              "Yoga divides the sum of the Sun and Moon's sidereal longitudes into 27 equal parts.";
          default ->
              "Karana is half a tithi, covering each 6° of separation between the Sun and Moon.";
        };
    new MaterialAlertDialogBuilder(this)
        .setTitle(a.optString("name"))
        .setMessage(
            explanation
                + "\n\nStarted: "
                + time(a.optString("start"))
                + "\nEnds: "
                + time(a.optString("end"))
                + "\nNext: "
                + a.optString("next"))
        .setNegativeButton("Close", null)
        .setPositiveButton(
            "Plan transition",
            (d, w) -> {
              JSONObject e = new JSONObject();
              NativeState.put(e, "id", kind + "-" + a.optString("end"));
              NativeState.put(e, "name", kind + ": " + a.optString("next"));
              NativeState.put(e, "start", a.optString("end"));
              NativeState.put(
                  e, "reason", "Astronomical transition, not a recommended ritual duration.");
              event(e);
            })
        .show();
  }

  private void monthView() {
    LinearLayout c =
        card(monthAnchor.format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH)));
    LinearLayout arrows = new LinearLayout(this);
    arrows.addView(
        button("Previous month", () -> moveMonth(-1)), new LinearLayout.LayoutParams(0, -2, 1));
    arrows.addView(
        button("Next month", () -> moveMonth(1)), new LinearLayout.LayoutParams(0, -2, 1));
    arrangeActions(arrows);
    c.addView(arrows);
    note(c, "Tithi at local sunrise · " + store.location().optString("zone"));
    if (month.length() == 0) {
      note(c, "Calculating this month offline…");
      return;
    }
    boolean grid =
        getResources().getConfiguration().screenWidthDp >= 360
            && getResources().getConfiguration().fontScale <= 1.3f;
    if (grid) {
      GridLayout g = new GridLayout(this);
      g.setColumnCount(7);
      String[] week = {"S", "M", "T", "W", "T", "F", "S"};
      for (String w : week) {
        TextView label = text(w, 13, true);
        label.setGravity(Gravity.CENTER);
        g.addView(label, gridParams());
      }
      int leading = monthAnchor.withDayOfMonth(1).getDayOfWeek().getValue() % 7;
      for (int i = 0; i < leading; i++) g.addView(new TextView(this), gridParams());
      for (int i = 0; i < month.length(); i++) {
        JSONObject item = month.optJSONObject(i);
        MaterialButton b =
            button(
                item.optInt("day") + "\n" + (item.optInt("tithiIndex") % 15 + 1),
                () -> openDay(item));
        b.setTextSize(12);
        b.setPadding(0, dp(4), 0, dp(4));
        b.setMinimumWidth(0);
        b.setMinWidth(0);
        b.setContentDescription(
            item.optString("date")
                + ", "
                + item.optString("tithi")
                + (matches(item) ? ", saved lunar date" : ""));
        b.setBackgroundTintList(
            ColorStateList.valueOf(
                color(matches(item) ? R.color.native_accent : R.color.native_background)));
        b.setTextColor(color(matches(item) ? R.color.native_on_accent : R.color.native_text));
        g.addView(b, gridParams());
      }
      c.addView(g);
      note(c, "Second number: tithi 1–15 in each fortnight. Tap a day for full details.");
    } else
      for (int i = 0; i < month.length(); i++) {
        JSONObject item = month.optJSONObject(i);
        c.addView(
            button(item.optString("date") + " · " + item.optString("tithi"), () -> openDay(item)));
      }
    LinearLayout events = card("This month's observances");
    note(
        events,
        "Preview rules; check your regional tradition. Personal dates use the Amanta month.");
    int count = 0;
    for (int i = 0; i < month.length(); i++) {
      JSONObject item = month.optJSONObject(i);
      JSONArray e = item.optJSONArray("events");
      if (matches(item)) {
        events.addView(
            button(item.optString("date") + " · Your saved lunar date", () -> openDay(item)));
        count++;
      }
      for (int j = 0; j < e.length(); j++) {
        JSONObject entry = NativeState.copy(e.optJSONObject(j));
        NativeState.put(entry, "date", item.optString("date"));
        events.addView(
            button(item.optString("date") + " · " + entry.optString("name"), () -> event(entry)));
        count++;
      }
    }
    if (count == 0) note(events, "No matching observance previews in this month.");
  }

  private GridLayout.LayoutParams gridParams() {
    GridLayout.LayoutParams p = new GridLayout.LayoutParams();
    p.width = 0;
    p.height = -2;
    p.columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f);
    p.setMargins(dp(1), 0, dp(1), 0);
    return p;
  }

  private void moveMonth(int step) {
    LocalDate next = monthAnchor.withDayOfMonth(1).plusMonths(step);
    if (next.getYear() < 1900 || next.getYear() > 2100) return;
    monthAnchor = next;
    loadMonth();
  }

  private void openDay(JSONObject item) {
    changeDate(LocalDate.parse(item.optString("date")));
    nav.setSelectedItemId(R.id.tab_today);
  }

  private boolean matches(JSONObject d) {
    if (d.isNull("sunrise")) return false;
    for (int i = 0; i < store.personal().length(); i++) {
      JSONObject p = store.personal().optJSONObject(i);
      if (p.optInt("month") == d.optInt("monthIndex")
          && p.optInt("tithi") == d.optInt("tithiIndex")
          && (!d.optBoolean("adhika") || p.optBoolean("includeAdhika"))) return true;
    }
    return false;
  }

  private void timings() {
    if (day == null) {
      note(card("Timings"), loading ? "Calculating…" : "Select a date in Today.");
      return;
    }
    note(
        card(date.toString()),
        "Traditional timing conventions depend on local sunrise. These are general periods, not"
            + " personalised ritual advice.");
    periods("Daily periods", day.optJSONArray("timings"));
    periods("Hora", day.optJSONArray("horas"));
    periods("Choghadiya", day.optJSONArray("choghadiya"));
  }

  private void periods(String title, JSONArray items) {
    LinearLayout c = card(title);
    if (items.length() == 0) note(c, "Not available for this sunrise day.");
    for (int i = 0; i < items.length(); i++) {
      JSONObject p = items.optJSONObject(i);
      c.addView(
          button(
              p.optString("name")
                  + "\n"
                  + range(p)
                  + (p.has("quality") ? " · " + p.optString("quality") : ""),
              () -> {
                JSONObject e = NativeState.copy(p);
                NativeState.put(e, "id", title + "-" + p.optString("start"));
                NativeState.put(
                    e,
                    "reason",
                    "General traditional timing convention for "
                        + store.location().optString("name")
                        + ".");
                event(e);
              }));
    }
  }

  private void planets() {
    if (day == null) return;
    StringBuilder b =
        new StringBuilder("Sidereal positions use a mean Lahiri ayanamsa approximation.\n\n");
    JSONArray a = day.optJSONArray("planets");
    for (int i = 0; i < a.length(); i++) {
      JSONObject p = a.optJSONObject(i);
      b.append(p.optString("name"))
          .append(": ")
          .append(p.optString("rashi"))
          .append(' ')
          .append(String.format(Locale.ENGLISH, "%.2f°", p.optDouble("degree")))
          .append('\n');
    }
    message(b.toString());
  }

  private void personal() {
    LinearLayout c = card("Your lunar dates");
    note(
        c,
        "Keep birthdays, anniversaries and family observances on this device. Names are never sent"
            + " to a server.");
    c.addView(button("Add lunar date", () -> editPersonal(null, 0, 0)));
    if (store.personal().length() == 0)
      note(c, "No saved dates yet. You can also remember the lunar date displayed in Today.");
    for (int i = 0; i < store.personal().length(); i++) {
      JSONObject p = store.personal().optJSONObject(i);
      LinearLayout item = card(p.optString("name"));
      note(
          item,
          NativeState.MONTHS[p.optInt("month")]
              + " · "
              + NativeState.tithi(p.optInt("tithi"))
              + (p.optBoolean("includeAdhika") ? " · includes Adhika" : ""));
      JSONObject found = null;
      for (int j = 0; j < upcoming.length(); j++)
        if (upcoming.optJSONObject(j).optString("id").equals(p.optString("id")))
          found = upcoming.optJSONObject(j);
      if (found != null) {
        JSONObject e = found;
        item.addView(button("Next: " + e.optString("date"), () -> event(e)));
      } else
        note(
            item,
            "No upcoming sunrise match loaded within the next 400 days. Repeated or skipped tithis"
                + " may need your family's convention.");
      item.addView(
          button(
              "Edit " + p.optString("name"),
              () -> editPersonal(p, p.optInt("month"), p.optInt("tithi"))));
      item.addView(
          button(
              "Delete " + p.optString("name"),
              () ->
                  new MaterialAlertDialogBuilder(this)
                      .setTitle("Delete this lunar date?")
                      .setMessage(
                          "This removes the saved rule and its app reminder from this device.")
                      .setNegativeButton("Cancel", null)
                      .setPositiveButton(
                          "Delete",
                          (d, w) -> {
                            JSONArray kept = new JSONArray();
                            for (int j = 0; j < store.personal().length(); j++)
                              if (!store
                                  .personal()
                                  .optJSONObject(j)
                                  .optString("id")
                                  .equals(p.optString("id")))
                                kept.put(store.personal().optJSONObject(j));
                            NativeState.put(store.data, "personal", kept);
                            ReminderReceiver.remove(this, p.optString("id"));
                            persist();
                            loadUpcoming();
                          })
                      .show()));
    }
    LinearLayout backup = card("Your backup");
    backup.addView(button("Export backup", this::exportBackup));
    backup.addView(button("Import backup", this::importBackup));
    note(
        backup,
        "Native iPhone/iPad and Android backups are compatible. Imports add lunar dates without"
            + " replacing your current place or settings.");
    JSONArray reminders = ReminderReceiver.list(this);
    LinearLayout r = card("App reminders");
    note(
        r,
        "Reminders are local and one-time. Android battery management can delay delivery. Your"
            + " calendar app may offer its own alert options.");
    if (reminders.length() == 0) note(r, "No app reminders scheduled.");
    for (int i = 0; i < reminders.length(); i++) {
      JSONObject e = reminders.optJSONObject(i);
      r.addView(
          button(
              "Remove reminder · " + e.optString("name") + " · " + time(e.optString("start")),
              () -> {
                ReminderReceiver.remove(this, e.optString("id"));
                render();
              }));
    }
  }

  private EditText field(LinearLayout box, String label, String value, int input) {
    TextView l = text(label, 14, true);
    box.addView(l);
    EditText e = new EditText(this);
    e.setSingleLine(true);
    e.setInputType(input);
    e.setText(value);
    e.setContentDescription(label);
    e.setMinHeight(dp(48));
    e.setId(View.generateViewId());
    l.setLabelFor(e.getId());
    box.addView(e);
    return e;
  }

  private Spinner picker(LinearLayout box, String title, String[] entries, int selected) {
    TextView label = text(title, 14, true);
    box.addView(label);
    Spinner s = new Spinner(this);
    s.setId(View.generateViewId());
    label.setLabelFor(s.getId());
    s.setContentDescription(title);
    ArrayAdapter<String> adapter =
        new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, entries);
    adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
    s.setAdapter(adapter);
    s.setSelection(selected);
    s.setMinimumHeight(dp(48));
    box.addView(s);
    return s;
  }

  private ScrollView formScroll(LinearLayout body) {
    body.setPadding(dp(22), dp(8), dp(22), dp(12));
    ScrollView s = new ScrollView(this);
    s.addView(body);
    return s;
  }

  private void editPersonal(JSONObject existing, int monthIndex, int tithiIndex) {
    LinearLayout body = column();
    EditText name =
        field(
            body,
            "Name",
            existing == null ? "" : existing.optString("name"),
            android.text.InputType.TYPE_CLASS_TEXT
                | android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
    name.setId(R.id.personal_name);
    name.setFilters(new InputFilter[] {new InputFilter.LengthFilter(80)});
    Spinner m = picker(body, "Amanta lunar month", NativeState.MONTHS, monthIndex);
    String[] ts = new String[30];
    for (int i = 0; i < 30; i++) ts[i] = NativeState.tithi(i);
    Spinner t = picker(body, "Tithi", ts, tithiIndex);
    CheckBox leap = new CheckBox(this);
    leap.setText("Also match Adhika (leap) month");
    leap.setChecked(existing != null && existing.optBoolean("includeAdhika"));
    body.addView(leap);
    note(
        body,
        "Matches the tithi present at local sunrise. Ritual observance rules can differ by family"
            + " and region.");
    androidx.appcompat.app.AlertDialog dialog =
        new MaterialAlertDialogBuilder(this)
            .setTitle(existing == null ? "Remember a lunar date" : "Edit lunar date")
            .setView(formScroll(body))
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Save", null)
            .create();
    dialog.setOnShowListener(
        d ->
            dialog
                .getButton(-1)
                .setOnClickListener(
                    v -> {
                      try {
                        NativeState.name(name.getText().toString());
                        if (existing == null && store.personal().length() >= 200)
                          throw new Exception("You can save up to 200 lunar dates.");
                        JSONObject p = new JSONObject();
                        NativeState.put(
                            p,
                            "id",
                            existing == null
                                ? UUID.randomUUID().toString()
                                : existing.optString("id"));
                        NativeState.put(p, "name", name.getText().toString().trim());
                        NativeState.put(p, "month", m.getSelectedItemPosition());
                        NativeState.put(p, "tithi", t.getSelectedItemPosition());
                        NativeState.put(p, "includeAdhika", leap.isChecked());
                        JSONArray values = store.personal();
                        for (int i = 0; i < values.length(); i++) {
                          JSONObject other = values.optJSONObject(i);
                          if (!other.optString("id").equals(p.optString("id"))
                              && other.optString("name").equals(p.optString("name"))
                              && other.optInt("month") == p.optInt("month")
                              && other.optInt("tithi") == p.optInt("tithi")
                              && other.optBoolean("includeAdhika") == p.optBoolean("includeAdhika"))
                            throw new Exception("That lunar date is already saved.");
                        }
                        if (existing == null) values.put(p);
                        else
                          for (int i = 0; i < values.length(); i++)
                            if (values.optJSONObject(i).optString("id").equals(p.optString("id"))) {
                              values.put(i, p);
                              ReminderReceiver.remove(this, p.optString("id"));
                            }
                        persist();
                        dialog.dismiss();
                        nav.setSelectedItemId(R.id.tab_personal);
                        loadUpcoming();
                      } catch (Exception e) {
                        name.setError(e.getMessage());
                      }
                    }));
    dialog.show();
  }

  private void event(JSONObject e) {
    String start = e.optString("start");
    boolean hasStart = !start.isEmpty() && !start.equals("null");
    LinearLayout body = column();
    body.addView(text(e.optString("name"), 22, true));
    note(body, e.optString("date", date.toString()) + " · " + store.location().optString("name"));
    note(body, e.optString("reason", "Traditional timing preview; check your regional rules."));
    if (hasStart) {
      row(body, "Time", range(e));
      body.addView(button("Add to calendar", () -> calendarEvent(e)));
      body.addView(button("Remind me", () -> remind(e)));
    } else {
      note(
          body,
          "This preview has no precise event window. Your calendar will show an all-day entry for"
              + " review.");
      body.addView(button("Add to calendar", () -> calendarEvent(e)));
    }
    body.addView(
        button(
            "Share event",
            () ->
                share(
                    e.optString("name")
                        + " · "
                        + e.optString("date", date.toString())
                        + "\n"
                        + (hasStart ? range(e) + "\n" : "")
                        + store.location().optString("name")
                        + " · "
                        + store.location().optString("zone")
                        + "\n"
                        + e.optString("reason")
                        + "\nhttps://panchang.eksaar.com/")));
    new MaterialAlertDialogBuilder(this)
        .setTitle("Plan this event")
        .setView(formScroll(body))
        .setPositiveButton("Done", null)
        .show();
  }

  private void calendarEvent(JSONObject e) {
    try {
      boolean all = e.isNull("start") || e.optString("start").isEmpty();
      Instant start =
          all
              ? LocalDate.parse(e.optString("date", date.toString()))
                  .atStartOfDay(ZoneOffset.UTC)
                  .toInstant()
              : Instant.parse(e.optString("start"));
      Instant end =
          all
              ? start.plusSeconds(86400)
              : e.isNull("end") || e.optString("end").isEmpty()
                  ? start.plusSeconds(60)
                  : Instant.parse(e.optString("end"));
      if (!end.isAfter(start)) end = start.plusSeconds(60);
      Intent intent =
          new Intent(Intent.ACTION_INSERT)
              .setData(CalendarContract.Events.CONTENT_URI)
              .putExtra(CalendarContract.Events.TITLE, e.optString("name"))
              .putExtra(
                  CalendarContract.Events.DESCRIPTION,
                  e.optString("reason")
                      + "\n"
                      + store.settings().optString("convention")
                      + "; "
                      + store.settings().optString("sunriseMode")
                      + " sunrise. Review according to your tradition.")
              .putExtra(CalendarContract.Events.EVENT_LOCATION, store.location().optString("name"))
              .putExtra(
                  CalendarContract.Events.EVENT_TIMEZONE,
                  all ? "UTC" : store.location().optString("zone"))
              .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, start.toEpochMilli())
              .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, end.toEpochMilli())
              .putExtra(CalendarContract.EXTRA_EVENT_ALL_DAY, all);
      startActivity(intent);
    } catch (ActivityNotFoundException ex) {
      message("No calendar app is installed. You can share this event instead.");
    } catch (Exception ex) {
      message("This event's date is unavailable.");
    }
  }

  private void remind(JSONObject e) {
    try {
      Instant start = Instant.parse(e.optString("start"));
      if (!start.isAfter(Instant.now().plusSeconds(5)))
        throw new Exception("Choose a future event for a reminder.");
      pendingReminder = NativeState.copy(e);
      if (Build.VERSION.SDK_INT >= 33
          && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
              != PackageManager.PERMISSION_GRANTED) {
        new MaterialAlertDialogBuilder(this)
            .setTitle("Enable local reminders?")
            .setMessage(
                "Android will ask to allow notifications. Reminders stay on this device; no account"
                    + " or server is used.")
            .setNegativeButton("Cancel", (d, w) -> pendingReminder = null)
            .setPositiveButton(
                "Continue",
                (d, w) ->
                    requestPermissions(
                        new String[] {Manifest.permission.POST_NOTIFICATIONS},
                        NOTIFICATION_PERMISSION))
            .show();
        return;
      }
      saveReminder();
    } catch (Exception ex) {
      message(ex.getMessage());
    }
  }

  private void saveReminder() {
    if (pendingReminder == null) return;
    try {
      ReminderReceiver.schedule(this, pendingReminder);
      message(
          "Reminder scheduled for this occurrence. Android battery management may delay delivery.");
      pendingReminder = null;
      render();
    } catch (Exception e) {
      message(e.getMessage());
    }
  }

  private void exportBackup() {
    try {
      NativeState.validate(store.data);
      Intent i =
          new Intent(Intent.ACTION_CREATE_DOCUMENT)
              .setType("application/json")
              .addCategory(Intent.CATEGORY_OPENABLE)
              .putExtra(Intent.EXTRA_TITLE, "Eksaar-Panchang-backup.json");
      startActivityForResult(i, BACKUP_EXPORT);
    } catch (Exception e) {
      message("A backup could not be opened: " + e.getMessage());
    }
  }

  private void importBackup() {
    try {
      startActivityForResult(
          new Intent(Intent.ACTION_OPEN_DOCUMENT)
              .setType("*/*")
              .addCategory(Intent.CATEGORY_OPENABLE),
          BACKUP_IMPORT);
    } catch (ActivityNotFoundException e) {
      message("No file picker is available on this device.");
    }
  }

  @Override
  protected void onActivityResult(int request, int result, Intent intent) {
    super.onActivityResult(request, result, intent);
    if (result != RESULT_OK || intent == null || intent.getData() == null) return;
    Uri uri = intent.getData();
    if (request == BACKUP_EXPORT) {
      String snapshot = store.data.toString();
      io.execute(
          () -> {
            try (OutputStream out = getContentResolver().openOutputStream(uri, "wt")) {
              if (out == null) throw new IOException();
              out.write(snapshot.getBytes(StandardCharsets.UTF_8));
              runOnUiThread(() -> message("Backup saved to your selected location."));
            } catch (Exception e) {
              runOnUiThread(
                  () -> message("The backup could not be saved. Choose another location."));
            }
          });
    } else if (request == BACKUP_IMPORT)
      io.execute(
          () -> {
            try (InputStream in = getContentResolver().openInputStream(uri)) {
              if (in == null) throw new IOException();
              JSONObject candidate = NativeState.parse(in);
              runOnUiThread(
                  () ->
                      new MaterialAlertDialogBuilder(this)
                          .setTitle("Import lunar dates?")
                          .setMessage(
                              "This backup contains "
                                  + candidate.optJSONArray("personal").length()
                                  + " lunar dates. New dates will be added; your current place and"
                                  + " settings will stay as they are.")
                          .setNegativeButton("Cancel", null)
                          .setPositiveButton(
                              "Import",
                              (d, w) -> {
                                try {
                                  int count = store.merge(candidate);
                                  loadUpcoming();
                                  message("Imported " + count + " lunar dates.");
                                } catch (Exception e) {
                                  message(e.getMessage());
                                }
                              })
                          .show());
            } catch (Exception e) {
              runOnUiThread(
                  () ->
                      message(
                          "The backup is invalid or unreadable. Your current data has not"
                              + " changed."));
            }
          });
  }

  private void settings() {
    LinearLayout prefs = card("Your preferences");
    JSONObject s = store.settings();
    prefs.addView(
        button(
            "Month convention · " + s.optString("convention"),
            () ->
                setting(
                    "convention",
                    "Month convention",
                    new String[] {"amanta", "purnimanta"},
                    new String[] {
                      "Amanta · new moon to new moon", "Purnimanta · full moon to full moon"
                    })));
    prefs.addView(
        button(
            "Sunrise · " + s.optString("sunriseMode"),
            () ->
                setting(
                    "sunriseMode",
                    "Sunrise convention",
                    new String[] {"geometric", "apparent"},
                    new String[] {
                      "Geometric solar centre · no refraction",
                      "Apparent upper limb · standard refraction"
                    })));
    prefs.addView(
        button(
            "Traditional names · " + s.optString("lang"),
            () ->
                setting(
                    "lang",
                    "Language for traditional names",
                    NativeState.LANGS,
                    new String[] {
                      "English", "हिन्दी", "বাংলা", "मराठी", "తెలుగు", "தமிழ்", "ગુજરાતી", "ಕನ್ನಡ",
                      "മലയാളം", "ਪੰਜਾਬੀ", "ଓଡ଼ିଆ", "اردو"
                    })));
    note(
        prefs,
        "Menus and explanations are in English. Traditional Panchang names support the selected"
            + " language.");
    prefs.addView(
        button(
            "Appearance · " + s.optString("appearance"),
            () ->
                setting(
                    "appearance",
                    "Appearance",
                    new String[] {"system", "light", "dark"},
                    new String[] {"Use device setting", "Light", "Dark"})));
    CheckBox hour = new CheckBox(this);
    hour.setText("Use 12-hour clock");
    hour.setChecked(s.optBoolean("hour12"));
    hour.setOnCheckedChangeListener(
        (b, checked) -> {
          NativeState.put(store.settings(), "hour12", checked);
          persist();
        });
    prefs.addView(hour);
    note(prefs, "Text size follows Android's font-size setting. Calculations cover 1900–2100.");
    LinearLayout privacy = card("Private by design");
    note(
        privacy,
        "No ads, trackers, subscriptions or account. Calculations and saved dates stay on this"
            + " device. This native Android app has no internet permission. Location and"
            + " notifications are optional. Calendar entries open for your review without access to"
            + " your existing calendar.");
    privacy.addView(button("Export backup", this::exportBackup));
    privacy.addView(button("Import backup", this::importBackup));
    privacy.addView(
        button("Privacy policy", () -> openWeb("https://panchang.eksaar.com/privacy.html")));
    privacy.addView(
        button("Help & support", () -> openWeb("https://panchang.eksaar.com/support.html")));
    LinearLayout about = card("A daily essential, freely available");
    note(
        about,
        "Made by Gopala Subramanium because a simple, daily-use Panchang should be free and easy to"
            + " use, without ads, fees or unnecessary clutter.");
    about.addView(button("About Gopala", () -> openWeb("https://me.sgopala.com")));
    about.addView(button("Accuracy & conventions", this::about));
    about.addView(
        button(
            "Open-source notices",
            () ->
                io.execute(
                    () -> {
                      try (InputStream in = getAssets().open("Notices.txt")) {
                        String value = read(in, 200_000);
                        runOnUiThread(() -> message(value));
                      } catch (Exception e) {
                        runOnUiThread(
                            () -> message("Notices are available in the source repository."));
                      }
                    })));
    note(about, "Version " + BuildConfig.VERSION_NAME + " (" + BuildConfig.VERSION_CODE + ")");
  }

  private void setting(String key, String title, String[] values, String[] labels) {
    int selected = Arrays.asList(values).indexOf(store.settings().optString(key));
    new MaterialAlertDialogBuilder(this)
        .setTitle(title)
        .setSingleChoiceItems(
            labels,
            selected,
            (d, which) -> {
              NativeState.put(store.settings(), key, values[which]);
              persist();
              d.dismiss();
              if (key.equals("appearance")) appearance();
              else refresh();
            })
        .setNegativeButton("Cancel", null)
        .show();
  }

  private void about() {
    message(
        "Panchang calculations run offline with Astronomy Engine 2.1.19. Sidereal values use a mean"
            + " Lahiri ayanamsa approximation.\n\n"
            + "Sunrise uses your selected geometric or apparent convention. Tithis can span civil"
            + " dates; sunrise-day and instant values can differ. Polar places may have no sunrise"
            + " or sunset.\n\n"
            + "Observances are preview rules, not a complete regional festival authority. Ekadashi"
            + " parana and personalised ceremonies need additional tradition-specific rules."
            + " Confirm ritual dates with your family's trusted calendar.\n\n"
            + "Personal lunar dates use Amanta months and match at local sunrise; repeated or"
            + " skipped tithis may need a family-specific decision. City-centre coordinates are"
            + " approximate; enter your own coordinates when needed.");
  }

  private void openWeb(String url) {
    try {
      startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
    } catch (ActivityNotFoundException e) {
      message("No browser is installed. Visit " + url + " on another device.");
    }
  }

  private static String read(InputStream in, int limit) throws Exception {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    byte[] buffer = new byte[8192];
    int n;
    while ((n = in.read(buffer)) != -1) {
      if (out.size() + n > limit) throw new IOException("File is too large");
      out.write(buffer, 0, n);
    }
    return out.toString(StandardCharsets.UTF_8.name());
  }

  private void choosePlace(JSONObject place) {
    try {
      NativeState.place(place);
      NativeState.put(store.data, "location", place);
      JSONArray recent = new JSONArray().put(place);
      for (int i = 0; i < store.places().length() && recent.length() < 12; i++) {
        JSONObject p = store.places().optJSONObject(i);
        if (p.optDouble("lat") != place.optDouble("lat")
            || p.optDouble("lon") != place.optDouble("lon")
            || !p.optString("zone").equals(place.optString("zone"))) recent.put(p);
      }
      NativeState.put(store.data, "places", recent);
      persist();
      if (live) date = LocalDate.now(store.zone());
      else if (chosen != null) date = chosen.atZone(store.zone()).toLocalDate();
      if (date.getYear() < 1900 || date.getYear() > 2100) {
        chosen = null;
        date =
            LocalDate.of(
                Math.max(1900, Math.min(2100, date.getYear())),
                date.getMonthValue(),
                Math.min(date.getDayOfMonth(), 28));
        live = false;
        message(
            "The new time zone moved this instant outside 1900–2100. The nearest supported day is"
                + " shown at sunrise.");
      }
      monthAnchor = date;
      refresh();
    } catch (Exception e) {
      message("Check the location: " + e.getMessage());
    }
  }

  private void placePicker() {
    LinearLayout body = column();
    EditText search =
        field(body, "Search cities offline", "", android.text.InputType.TYPE_CLASS_TEXT);
    search.setId(R.id.city_search);
    body.addView(
        button(
            "Use approximate device location",
            () -> {
              startLocation();
            }));
    body.addView(button("Enter coordinates and time zone", () -> customPlace(store.location())));
    LinearLayout results = column();
    body.addView(results);
    androidx.appcompat.app.AlertDialog dialog =
        new MaterialAlertDialogBuilder(this)
            .setTitle("Choose a place")
            .setView(formScroll(body))
            .setNegativeButton("Done", null)
            .create();
    Runnable initial =
        () -> {
          results.removeAllViews();
          JSONArray list =
              store.places().length() > 0 ? store.places() : new JSONArray().put(store.location());
          for (int i = 0; i < list.length(); i++) {
            JSONObject p = list.optJSONObject(i);
            results.addView(
                button(
                    p.optString("name"),
                    () -> {
                      dialog.dismiss();
                      choosePlace(p);
                    }));
          }
        };
    initial.run();
    search.addTextChangedListener(
        new TextWatcher() {
          int generation = 0;

          public void beforeTextChanged(CharSequence s, int st, int c, int a) {}

          public void onTextChanged(CharSequence s, int st, int before, int count) {
            int token = ++generation;
            String query = s.toString().trim().toLowerCase(Locale.ROOT);
            if (query.isEmpty()) {
              initial.run();
              return;
            }
            handler.postDelayed(
                () -> {
                  if (token != generation) return;
                  io.execute(
                      () -> {
                        ArrayList<JSONObject> found = new ArrayList<>();
                        String[] terms = query.split("\\s+");
                        for (int i = 0; i < cities.length() && found.size() < 40; i++) {
                          JSONObject p = cities.optJSONObject(i);
                          String hay = p.optString("name").toLowerCase(Locale.ROOT);
                          boolean match = true;
                          for (String term : terms)
                            if (!hay.contains(term)) {
                              match = false;
                              break;
                            }
                          if (match) found.add(p);
                        }
                        runOnUiThread(
                            () -> {
                              if (token != generation || !dialog.isShowing()) return;
                              results.removeAllViews();
                              if (found.isEmpty())
                                note(
                                    results,
                                    cities.length() == 0
                                        ? "Loading the offline city directory…"
                                        : "No match. Try another spelling or enter coordinates.");
                              for (JSONObject p : found)
                                results.addView(
                                    button(
                                        p.optString("name") + "\n" + p.optString("zone"),
                                        () -> {
                                          dialog.dismiss();
                                          choosePlace(p);
                                        }));
                            });
                      });
                },
                200);
          }

          public void afterTextChanged(Editable e) {}
        });
    dialog.show();
  }

  private void customPlace(JSONObject current) {
    LinearLayout body = column();
    EditText name =
        field(
            body, "Place name", current.optString("name"), android.text.InputType.TYPE_CLASS_TEXT);
    EditText lat = field(body, "Latitude (−90 to 90)", current.optString("lat"), 8194 | 4096);
    EditText lon = field(body, "Longitude (−180 to 180)", current.optString("lon"), 8194 | 4096);
    EditText zone =
        field(
            body,
            "IANA time zone",
            current.optString("zone"),
            android.text.InputType.TYPE_CLASS_TEXT);
    EditText elevation =
        field(
            body,
            "Elevation in metres",
            String.valueOf(current.optDouble("elevation", 0)),
            8194 | 4096);
    note(
        body,
        "Use an IANA name, such as Asia/Kolkata or America/New_York. Daylight-saving changes follow"
            + " this zone.");
    androidx.appcompat.app.AlertDialog dialog =
        new MaterialAlertDialogBuilder(this)
            .setTitle("Custom place")
            .setView(formScroll(body))
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Use place", null)
            .create();
    dialog.setOnShowListener(
        d ->
            dialog
                .getButton(-1)
                .setOnClickListener(
                    v -> {
                      try {
                        JSONObject p = new JSONObject();
                        p.put("name", name.getText().toString().trim());
                        p.put("lat", Double.parseDouble(lat.getText().toString()));
                        p.put("lon", Double.parseDouble(lon.getText().toString()));
                        p.put("zone", zone.getText().toString().trim());
                        p.put("elevation", Double.parseDouble(elevation.getText().toString()));
                        NativeState.place(p);
                        dialog.dismiss();
                        choosePlace(p);
                      } catch (Exception e) {
                        zone.setError("Check the coordinates, elevation and IANA time zone.");
                      }
                    }));
    dialog.show();
  }

  private void startLocation() {
    if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)
        != PackageManager.PERMISSION_GRANTED) {
      new MaterialAlertDialogBuilder(this)
          .setTitle("Use approximate location?")
          .setMessage(
              "Location stays on your device and is requested only now. A nearby offline city"
                  + " suggests the time zone; you will review it before applying.")
          .setNegativeButton("Cancel", null)
          .setPositiveButton(
              "Continue",
              (d, w) ->
                  requestPermissions(
                      new String[] {Manifest.permission.ACCESS_COARSE_LOCATION},
                      LOCATION_PERMISSION))
          .show();
      return;
    }
    findLocation();
  }

  @SuppressWarnings("MissingPermission")
  private void findLocation() {
    if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)
        != PackageManager.PERMISSION_GRANTED) return;
    if (cities.length() == 0) {
      message("The city directory is still loading. Try again shortly.");
      return;
    }
    stopLocation();
    locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);
    locationListener =
        new LocationListener() {
          public void onLocationChanged(Location location) {
            stopLocation();
            JSONObject nearest = null;
            double best = Double.MAX_VALUE;
            for (int i = 0; i < cities.length(); i++) {
              JSONObject p = cities.optJSONObject(i);
              float[] distance = new float[1];
              Location.distanceBetween(
                  location.getLatitude(),
                  location.getLongitude(),
                  p.optDouble("lat"),
                  p.optDouble("lon"),
                  distance);
              if (distance[0] < best) {
                best = distance[0];
                nearest = p;
              }
            }
            if (nearest == null) {
              message("No nearby city was found. Enter a place manually.");
              return;
            }
            JSONObject p = NativeState.copy(nearest);
            NativeState.put(p, "name", "Approximate location");
            NativeState.put(p, "lat", location.getLatitude());
            NativeState.put(p, "lon", location.getLongitude());
            new MaterialAlertDialogBuilder(MainActivity.this)
                .setTitle("Review the suggested time zone")
                .setMessage(
                    "Nearest city: "
                        + nearest.optString("name")
                        + "\nSuggested zone: "
                        + nearest.optString("zone")
                        + "\n\n"
                        + "Near a time-zone border, check this carefully. Your coordinates stay on"
                        + " this device.")
                .setNegativeButton("Cancel", null)
                .setPositiveButton("Review place", (d, w) -> customPlace(p))
                .show();
          }

          public void onProviderDisabled(String provider) {
            stopLocation();
            message("Device location is disabled. You can search cities or enter coordinates.");
          }
        };
    try {
      if (!locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
        stopLocation();
        message(
            "Approximate device location is unavailable. Search cities or enter coordinates"
                + " instead.");
        return;
      }
      locationManager.requestSingleUpdate(
          LocationManager.NETWORK_PROVIDER, locationListener, Looper.getMainLooper());
      handler.postDelayed(
          () -> {
            if (locationListener != null) {
              stopLocation();
              message(
                  "The device did not return a location. Search cities or enter coordinates"
                      + " instead.");
            }
          },
          20_000);
    } catch (Exception e) {
      stopLocation();
      message("Location could not be requested. Search cities or enter coordinates instead.");
    }
  }

  private void stopLocation() {
    if (locationManager != null && locationListener != null)
      locationManager.removeUpdates(locationListener);
    locationListener = null;
  }

  @Override
  public void onRequestPermissionsResult(int request, String[] permissions, int[] grants) {
    super.onRequestPermissionsResult(request, permissions, grants);
    if (grants.length > 0 && grants[0] == PackageManager.PERMISSION_GRANTED) {
      if (request == LOCATION_PERMISSION) findLocation();
      else if (request == NOTIFICATION_PERMISSION) saveReminder();
    } else if (request == LOCATION_PERMISSION)
      message("Location is optional. You can search cities or enter coordinates.");
    else if (request == NOTIFICATION_PERMISSION) {
      pendingReminder = null;
      message(
          "Notifications are disabled. You can enable them in Android Settings, or add the event to"
              + " your calendar.");
    }
  }
}
