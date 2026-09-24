import SwiftUI
import EventKit
import EventKitUI
import UniformTypeIdentifiers

struct PanchangRootView: View {
    @StateObject private var store = PanchangStore()
    @Environment(\.scenePhase) private var scenePhase
    var body: some View {
        TabView(selection:$store.tab) {
            NavigationStack { NativeTodayView() }.id(store.selectedKey).tabItem { Label("Today",systemImage:"sun.max") }.tag(0)
            NavigationStack { NativeMonthView() }.tabItem { Label("Month",systemImage:"calendar") }.tag(1)
            NavigationStack { NativeTimingsView() }.tabItem { Label("Timings",systemImage:"clock") }.tag(2)
            NavigationStack { NativePersonalView() }.tabItem { Label("My dates",systemImage:"heart.text.square") }.tag(3)
            NavigationStack { NativeSettingsView() }.tabItem { Label("Settings",systemImage:"slider.horizontal.3") }.tag(4)
        }
        .environmentObject(store).environment(\.timeZone,store.zone).environment(\.calendar,store.calendar).preferredColorScheme(store.appearance)
        .tint(Color("AccentColor"))
        .alert("Panchang",isPresented:Binding(get:{store.error != nil || store.notice != nil},set:{ if !$0 {store.error = nil;store.notice = nil} })) {
            Button("OK") { store.error = nil; store.notice = nil }
        } message: { Text(store.error ?? store.notice ?? "") }
        .onChange(of:scenePhase) { _,value in if value == .active { store.refreshLive();store.refreshReminders() } }
        .onReceive(Timer.publish(every:60,on:.main,in:.common).autoconnect()) { _ in store.refreshLive() }
    }
}
struct NativeLocationToolbar: View {
    @EnvironmentObject var store: PanchangStore
    @State private var choosing = false
    var body: some View {
        Button { choosing = true } label: { Label(store.location.name,systemImage:"location") }
            .accessibilityIdentifier("chooseLocation")
            .sheet(isPresented:$choosing) { NavigationStack { NativePlacePicker() } }
    }
}
struct NativeDateControls: View {
    @EnvironmentObject var store: PanchangStore
    var body: some View {
        VStack(alignment:.leading,spacing:10) {
            HStack {
                Button { store.moveDay(-1) } label: { Image(systemName:"chevron.left").frame(minWidth:40,minHeight:44) }.accessibilityLabel("Previous day")
                DatePicker("Date",selection:Binding(get:{store.selectedDate},set:{store.selectDate($0)}),in:store.dateRange,displayedComponents:.date)
                    .labelsHidden().accessibilityIdentifier("selectedDate").frame(maxWidth:.infinity)
                Button { store.moveDay(1) } label: { Image(systemName:"chevron.right").frame(minWidth:40,minHeight:44) }.accessibilityLabel("Next day")
                Button("Today") { store.today() }.buttonStyle(.bordered)
            }
            HStack {
                DatePicker("Panchang at",selection:Binding(get:{NativeDates.parse(store.day?.instant) ?? store.selectedDate},set:{store.selectTime($0)}),displayedComponents:.hourAndMinute)
                    .accessibilityIdentifier("selectedTime")
                Button("Sunrise") { store.atSunrise() }.buttonStyle(.bordered).accessibilityIdentifier("useSunrise")
            }
            Text(store.location.zone.replacingOccurrences(of:"_",with:" ")).font(.caption).foregroundStyle(.secondary)
        }
    }
}
struct NativeTodayView: View {
    @EnvironmentObject var store: PanchangStore
    @State private var saving = false
    func summary(_ day: NativeDay) -> String {
        let elements = day.angas.map { "\($0.kind.capitalized): \($0.name), until \(store.time($0.end))" }.joined(separator:"\n")
        return "\(store.location.name) · \(day.date) · \(store.location.zone)\n\(elements)\nSunrise \(store.time(day.sun.sunrise)); sunset \(store.time(day.sun.sunset)).\n\(day.convention.capitalized); \(day.sunriseMode) sunrise. Eksaar Panchang — free and offline.\nhttps://panchang.eksaar.com/"
    }
    var body: some View {
        List {
            Section { NativeDateControls() }
            if let day = store.day {
                Section {
                    VStack(alignment:.leading,spacing:12) {
                        Label("YOUR DAY, IN RHYTHM",systemImage:"sun.max.fill").font(.caption.weight(.semibold)).foregroundStyle(Color("AccentColor"))
                        Text(day.weekday).font(.system(.largeTitle,design:.serif).weight(.semibold))
                        Text("\(day.adhika ? "Adhika " : "")\(day.month) · \(day.convention.capitalized)")
                        Text(store.live && store.selectedKey == store.todayKey ? "At this moment · \(store.time(day.instant))" : store.chosenTime ? "At your chosen time · \(store.time(day.instant))" : (day.sun.sunrise == nil ? "No sunrise · local-noon snapshot" : "Snapshot at local sunrise"))
                            .font(.subheadline).foregroundStyle(.secondary)
                    }.padding(.vertical,8).accessibilityElement(children:.contain).accessibilityIdentifier("nativeDailySummary")
                }
                Section("The five parts of the day") {
                    ForEach(day.angas) { anga in
                        NavigationLink {
                            NativeAngaDetail(anga:anga)
                        } label: {
                            VStack(alignment:.leading,spacing:5) {
                                Text(anga.kind.capitalized).font(.caption).foregroundStyle(.secondary)
                                Text(anga.name).font(.headline).fixedSize(horizontal:false,vertical:true)
                                Text("Until \(store.time(anga.end))").font(.subheadline).foregroundStyle(.secondary)
                            }.padding(.vertical,3)
                        }.accessibilityIdentifier("anga.\(anga.kind)")
                    }
                    LabeledContent("Vaara (sunrise day)",value:day.weekday)
                }
                Section("Sun & Moon") {
                    LabeledContent { Text(store.time(day.sun.sunrise)) } label: { Label("Sunrise",systemImage:"sunrise") }
                    LabeledContent { Text(store.time(day.sun.sunset)) } label: { Label("Sunset",systemImage:"sunset") }
                    LabeledContent { Text(store.time(day.sun.moonrise)) } label: { Label("Moonrise",systemImage:"moonrise") }
                    LabeledContent { Text(store.time(day.sun.moonset)) } label: { Label("Moonset",systemImage:"moonset") }
                    VStack(alignment:.leading) {
                        ProgressView(value:day.illumination) { Text("Moon illuminated") } currentValueLabel: { Text("\(Int((day.illumination*100).rounded()))%") }
                    }.padding(.vertical,6)
                }
                Section {
                    Button { saving = true } label: { Label("Remember this lunar date",systemImage:"heart.badge.plus") }
                        .accessibilityIdentifier("rememberLunarDate")
                    ShareLink(item:summary(day)) { Label("Share today's Panchang",systemImage:"square.and.arrow.up") }.accessibilityIdentifier("shareDaily")
                } footer: { Text("Personal dates use the Amanta month and the tithi at the displayed moment. Upcoming matches are checked at local sunrise.") }
                if !day.events.isEmpty {
                    Section("Observance previews") { ForEach(day.events) { e in NavigationLink { NativeEventDetail(event:e) } label: { NativeEventLabel(event:e) } } }
                }
                Section("Sky & calculation") {
                    NavigationLink("Planet positions") { NativePlanetsView(planets:day.planets) }
                    LabeledContent("Tamil solar month",value:day.solarMonth)
                    LabeledContent("Sunrise convention",value:day.sunriseMode.capitalized)
                    NavigationLink("How these calculations work") { NativeAboutView() }
                }
                ForEach(day.warnings,id:\.self) { Text($0).font(.callout).foregroundStyle(.secondary) }
            } else if store.loadingDay {
                Section { ProgressView("Calculating on your device…").accessibilityIdentifier("dayLoading") }
            } else {
                Section { ContentUnavailableView("Day unavailable",systemImage:"calendar.badge.exclamationmark",description:Text("Check the location and date, then try again."));Button("Try again") { store.loadDay() } }
            }
        }
        .navigationTitle("Eksaar Panchang").navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement:.topBarTrailing) { NativeLocationToolbar() } }
        .sheet(isPresented:$saving) { NavigationStack { NativePersonalEditor(month:store.day?.monthIndex ?? 0,tithi:store.day?.tithiIndex ?? 0) } }

    }
}
struct NativeAngaDetail: View {
    let anga: NativeAnga
    @EnvironmentObject var store: PanchangStore
    private var explanation: String {
        switch anga.kind {
        case "tithi": return "A lunar day measures each 12° of angular separation between the Sun and Moon. It can start or end at any clock time."
        case "nakshatra": return "The Moon's sidereal longitude divides the zodiac into 27 lunar mansions. The app uses a mean Lahiri ayanamsa approximation."
        case "yoga": return "Yoga divides the sum of the Sun and Moon's sidereal longitudes into 27 equal parts."
        default: return "Karana is half a tithi, covering each 6° of separation between the Sun and Moon."
        }
    }
    var body: some View {
        List {
            Section { Text(anga.name).font(.title2);Text(explanation) }
            Section("Transition") {
                LabeledContent("Started",value:store.time(anga.start))
                LabeledContent("Ends",value:store.time(anga.end))
                LabeledContent("Next",value:anga.next)
                NavigationLink("Plan for this transition") {
                    NativeEventDetail(event:NativeEvent(id:"\(anga.kind)-\(anga.end)",name:"\(anga.kind.capitalized): \(anga.next)",start:anga.end,end:nil,reason:"Astronomical transition, not a recommended ritual duration.",status:"astronomical"))
                }
            }
        }.navigationTitle(anga.kind.capitalized)
    }
}
struct NativeMonthView: View {
    @EnvironmentObject var store: PanchangStore
    @Environment(\.dynamicTypeSize) var textSize
    var leading: Int {
        guard let date = NativeDates.date(String(NativeDates.key(store.monthAnchor,zone:store.zone).prefix(7))+"-01",zone:store.zone) else { return 0 }
        return store.calendar.component(.weekday,from:date)-1
    }
    func open(_ day: NativeMonthDay) { if let date = NativeDates.date(day.date,zone:store.zone) { store.selectDate(date);store.tab = 0 } }
    var body: some View {
        List {
            Section {
                HStack {
                    Button { store.moveMonth(-1) } label:{Image(systemName:"chevron.left").frame(minWidth:44,minHeight:44)}.accessibilityLabel("Previous month")
                    Text(NativeDates.format(store.monthAnchor,zone:store.zone,pattern:"MMMM yyyy")).font(.headline).frame(maxWidth:.infinity)
                    Button { store.moveMonth(1) } label:{Image(systemName:"chevron.right").frame(minWidth:44,minHeight:44)}.accessibilityLabel("Next month")
                }
                if store.loadingMonth { ProgressView("Calculating this month offline…") }
                else if textSize.isAccessibilitySize {
                    ForEach(store.month) { day in Button { open(day) } label:{VStack(alignment:.leading){Text(day.date);Text(day.tithi).font(.headline)}}.accessibilityIdentifier("calendar.day.\(day.date)") }
                } else {
                    LazyVGrid(columns:Array(repeating:GridItem(.flexible(),spacing:4),count:7),spacing:10) {
                        ForEach(Array(["S","M","T","W","T","F","S"].enumerated()),id:\.offset) { _,s in Text(s).font(.caption).foregroundStyle(.secondary).accessibilityHidden(true) }
                        ForEach(0..<leading,id:\.self) { _ in Color.clear.frame(height:54).accessibilityHidden(true) }
                        ForEach(store.month) { day in
                            Button { open(day) } label: {
                                VStack(spacing:4) {
                                    Text("\(day.day)").font(.headline).monospacedDigit()
                                    Text(day.tithi.components(separatedBy:" ").dropFirst().joined(separator:" ")).font(.system(size:9)).lineLimit(1).minimumScaleFactor(0.8)
                                    HStack(spacing:3) {
                                        Circle().fill(day.events.isEmpty ? Color.clear : Color.orange).frame(width:4,height:4)
                                        Circle().fill(store.matches(day).isEmpty ? Color.clear : Color("AccentColor")).frame(width:4,height:4)
                                    }
                                }.frame(maxWidth:.infinity,minHeight:54)
                                    .background(day.date == store.selectedKey ? Color("AccentColor").opacity(0.17) : Color.secondary.opacity(0.045),in:RoundedRectangle(cornerRadius:10))
                            }.buttonStyle(.plain).accessibilityLabel("\(day.date), \(day.tithi), \(day.events.count) observance previews, \(store.matches(day).count) personal dates")
                                .accessibilityIdentifier("calendar.day.\(day.date)")
                        }
                    }.padding(.vertical,5).accessibilityIdentifier("nativeMonthGrid")
                }
                Text("Orange: observance preview · Green: your lunar date").font(.caption).foregroundStyle(.secondary)
            } footer: { Text("Tap a date for its Panchang. Tithis are shown at local sunrise, or at local noon when sunrise does not occur. All times use \(store.location.zone).") }
            ForEach(store.month.filter { !$0.events.isEmpty || !store.matches($0).isEmpty }) { day in
                Section(day.date) {
                    ForEach(store.matches(day)) { rule in
                        Button { open(day) } label:{Label(rule.name,systemImage:"heart.fill")}
                    }
                    ForEach(day.events) { e in NavigationLink { NativeEventDetail(event:e) } label:{NativeEventLabel(event:e)} }
                }
            }
            Section { Text("Festival previews use documented rules. Advanced regional fasting and Parana decisions require an appropriate local tradition.").font(.footnote).foregroundStyle(.secondary) }
        }.navigationTitle("Your month")
            .toolbar { ToolbarItem(placement:.topBarTrailing) { NativeLocationToolbar() } }
    }
}
struct NativeTimingsView: View {
    @EnvironmentObject var store: PanchangStore
    @State private var category = 0
    var periods: [NativePeriod] {
        guard let day = store.day else { return [] }
        return category == 0 ? day.timings : category == 1 ? day.horas : day.choghadiya
    }
    var body: some View {
        List {
            Section { NativeDateControls();Picker("Periods",selection:$category) { Text("Daily").tag(0);Text("Hora").tag(1);Text("Choghadiya").tag(2) }.pickerStyle(.segmented) }
            Section {
                if store.loadingDay { ProgressView("Calculating…") }
                else if periods.isEmpty { ContentUnavailableView("Periods unavailable",systemImage:"sun.max.trianglebadge.exclamationmark",description:Text("Sunrise-based periods require sunrise, sunset and the next sunrise. Artificial times are never substituted.")) }
                ForEach(periods) { period in
                    NavigationLink {
                        NativeEventDetail(event:NativeEvent(id:period.id,name:period.name,start:period.start,end:period.end,reason:"Traditional daily period calculated from local sunrise and sunset. This is not a guarantee of an outcome.",status:"traditional"))
                    } label:{
                        VStack(alignment:.leading,spacing:6) {
                            Text(period.name).font(.headline)
                            Text(store.interval(period.start,period.end)).font(.subheadline).monospacedDigit().foregroundStyle(.secondary)
                            if let quality = period.quality { Text(quality.capitalized).font(.caption) }
                        }.padding(.vertical,3)
                    }
                }
            } footer:{Text("Planning aids based on traditional conventions. Choose a period to add it to your calendar or set a local reminder.")}
        }.navigationTitle("Daily timings")
    }
}
struct NativeEventLabel: View {
    var event: NativeEvent
    var body: some View {
        VStack(alignment:.leading,spacing:4) {
            Text(event.name).font(.headline)
            if event.status == "preview" { Text("Preview · verify your tradition").font(.caption).foregroundStyle(.secondary) }
        }
    }
}
struct NativeEventDetail: View {
    var event: NativeEvent
    @EnvironmentObject var store: PanchangStore
    @State private var calendar = false
    var body: some View {
        List {
            Section {
                Text(event.name).font(.title2)
                if let date = NativeDates.parse(event.start) { Text(NativeDates.format(date,zone:store.zone,pattern:"EEEE, d MMMM yyyy")) }
                Text(store.interval(event.start,event.end ?? event.start)).monospacedDigit()
                Text("\(store.location.name) · \(store.location.zone)").font(.caption).foregroundStyle(.secondary)
            }
            Section { Text(event.reason);if event.status == "preview" { Label("Preview only. Check regional and family rules before observing a festival or fast.",systemImage:"info.circle") } }
            Section {
                Button { calendar = true } label:{Label("Add to Apple Calendar",systemImage:"calendar.badge.plus")}.disabled(event.start == nil).accessibilityIdentifier("addToCalendar")
                Button { store.remind(event) } label:{Label("Remind me at this time",systemImage:"bell.badge")}.disabled((NativeDates.parse(event.start) ?? .distantPast) <= Date())
            } footer:{Text("You review the event before saving it. Reminders are stored on this device. Recheck timings when changing location.")}
        }.navigationTitle("Plan an event").navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented:$calendar) { NativeCalendarEditor(event:event,place:store.location) }
    }
}
struct NativePersonalView: View {
    @EnvironmentObject var store: PanchangStore
    @State private var adding = false
    @State private var deleting: LunarDate?
    @State private var editing: LunarDate?
    var body: some View {
        List {
            if store.personal.isEmpty {
                Section {
                    ContentUnavailableView("Dates worth remembering",systemImage:"heart.text.square",description:Text("Save birthdays, anniversaries and family observances by lunar month and tithi. Find their next sunrise match, even offline."))
                    Button("Add a lunar date") { adding = true }.accessibilityIdentifier("addLunarDate")
                }
            } else {
                Section("Next occurrences · \(store.location.name)") {
                    if store.loadingUpcoming { ProgressView("Finding your next lunar dates…") }
                    ForEach(store.upcoming) { e in NavigationLink { NativeEventDetail(event:e) } label: {
                        VStack(alignment:.leading,spacing:5) { Text(e.name).font(.headline);Text(e.date ?? "").font(.subheadline).foregroundStyle(.secondary) }
                    } }
                    if !store.loadingUpcoming && store.upcoming.count < store.personal.count { Text("Some rules have no sunrise match within the next 400 days or the supported date range. Skipped tithis and months need family guidance.").font(.footnote) }
                }
                Section("Saved lunar rules") {
                    ForEach(store.personal) { item in
                        VStack(alignment:.leading,spacing:5) {
                            Text(item.name).font(.headline)
                            Text("\(NativeDates.months[item.month]) · \(NativeDates.tithi(item.tithi))").font(.subheadline).foregroundStyle(.secondary)
                            if item.includeAdhika { Text("Includes Adhika months").font(.caption) }
                        }.swipeActions {
                            Button("Edit") { editing = item }.tint(.blue)
                            Button("Delete",role:.destructive) { deleting = item }
                        }
                    }
                }
            }
            Section { Text("Personal dates follow Amanta months and match at local sunrise. Repeated or skipped tithis can be observed differently across families. Your saved rules stay on this device.").font(.footnote).foregroundStyle(.secondary) }
        }.navigationTitle("My lunar dates")
            .toolbar { ToolbarItem(placement:.topBarTrailing) { Button { adding = true } label:{Image(systemName:"plus")}.accessibilityLabel("Add lunar date") } }
            .sheet(isPresented:$adding) { NavigationStack { NativePersonalEditor(month:0,tithi:0) } }
            .sheet(item:$editing) { item in NavigationStack { NativePersonalEditor(month:item.month,tithi:item.tithi,existing:item) } }
            .confirmationDialog("Delete this saved lunar date?",isPresented:Binding(get:{deleting != nil},set:{if !$0 {deleting = nil}})) {
                Button("Delete lunar date",role:.destructive) { if let deleting {store.deletePersonal(deleting)};deleting = nil }
            }
    }
}
struct NativePersonalEditor: View {
    @EnvironmentObject var store: PanchangStore
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State var month: Int
    @State var tithi: Int
    @State private var adhika = false
    private let editingID: String?
    init(month: Int,tithi: Int,existing: LunarDate? = nil) {
        _month = State(initialValue:month);_tithi = State(initialValue:tithi)
        _name = State(initialValue:existing?.name ?? "");_adhika = State(initialValue:existing?.includeAdhika ?? false)
        editingID = existing?.id
    }
    var body: some View {
        Form {
            Section {
                TextField("Name",text:$name).accessibilityIdentifier("lunarName").textInputAutocapitalization(.words)
                Picker("Amanta month",selection:$month) { ForEach(0..<12) { Text(NativeDates.months[$0]).tag($0) } }
                Picker("Tithi",selection:$tithi) { ForEach(0..<30) { Text(NativeDates.tithi($0)).tag($0) } }
                Toggle("Include Adhika months",isOn:$adhika)
            } footer:{Text("A lunar date repeats by the Hindu lunar calendar, not on the same Gregorian date each year. Choose the rule your family follows. When editing a rule, its old reminder is removed; schedule the new occurrence if needed.")}
        }.navigationTitle(editingID == nil ? "Remember a date" : "Edit lunar date").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement:.cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement:.confirmationAction) { Button("Save") {
                    var value = LunarDate(name:name.trimmingCharacters(in:.whitespacesAndNewlines),month:month,tithi:tithi,includeAdhika:adhika)
                    if let editingID { value.id = editingID }
                    store.addPersonal(value);dismiss()
                }.disabled(name.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty || name.utf16.count > 80).accessibilityIdentifier("saveLunarDate") }
            }
    }
}
struct NativePlanetsView: View {
    let planets: [NativePlanet]
    var body: some View {
        List {
            ForEach(planets) { planet in LabeledContent(planet.name,value:"\(planet.rashi) \(planet.degree.formatted(.number.precision(.fractionLength(2))))°") }
            Section { Text("Sidereal longitudes use the mean Lahiri approximation. Lunar nodes are mean nodes. These are astronomical positions, not predictions or personal advice.").font(.footnote).foregroundStyle(.secondary) }
        }.navigationTitle("Sky & planets")
    }
}
