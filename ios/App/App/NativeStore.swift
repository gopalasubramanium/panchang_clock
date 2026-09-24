import SwiftUI
import UserNotifications
import CoreLocation

final class PanchangStore: ObservableObject {
    @Published var location: PanchangPlace
    @Published var settings: PanchangPreferences
    @Published var places: [PanchangPlace]
    @Published var personal: [LunarDate]
    @Published var selectedDate = Date()
    @Published var monthAnchor = Date()
    @Published var live = true
    @Published var chosenTime = false
    @Published var tab = 0
    @Published var day: NativeDay?
    @Published var month: [NativeMonthDay] = []
    @Published var upcoming: [NativeEvent] = []
    @Published var reminders: [String:String] = [:]
    @Published var loadingDay = false
    @Published var loadingMonth = false
    @Published var loadingUpcoming = false
    @Published var error: String?
    @Published var notice: String?
    let cities: [PanchangPlace]
    private let calculator = NativeCalculator()
    private var dayRevision = UUID(), monthRevision = UUID(), upcomingRevision = UUID()
    private var monthCacheKey = ""
    private let storageURL: URL
    private var canPersist = true
    var zone: TimeZone { location.timeZone }
    var selectedKey: String { NativeDates.key(selectedDate,zone:zone) }
    var todayKey: String { NativeDates.key(Date(),zone:zone) }
    var calendar: Calendar { NativeDates.calendar(zone) }
    var dateRange: ClosedRange<Date> {
        NativeDates.date("1900-01-01",zone:zone)!...NativeDates.date("2100-12-31",zone:zone)!
    }
    var appearance: ColorScheme? { settings.appearance == "dark" ? .dark : settings.appearance == "light" ? .light : nil }

    init() {
        let base = FileManager.default.urls(for:.applicationSupportDirectory,in:.userDomainMask)[0].appendingPathComponent("EksaarPanchang",isDirectory:true)
        storageURL = base.appendingPathComponent("native-state.json")
        var saved = NativeSavedState()
        var initialError: String?
        if FileManager.default.fileExists(atPath:storageURL.path) {
            do {
                saved = try JSONDecoder().decode(NativeSavedState.self,from:Data(contentsOf:storageURL))
                try saved.validate()
            } catch {
                canPersist = false
                initialError = "Your saved data could not be read. It has been kept intact. Reopen the app after unlocking your device, or import a valid backup."
                saved = NativeSavedState()
            }
        }
        location = saved.location; settings = saved.settings; places = saved.places; personal = saved.personal
        if let url = Bundle.main.url(forResource:"cities",withExtension:"json",subdirectory:"NativeResources"),
           let data = try? Data(contentsOf:url), let list = try? JSONDecoder().decode([PanchangPlace].self,from:data) { cities = list.filter(\.valid) }
        else { cities = [.delhi]; initialError = "The city directory could not be loaded. You can enter a place manually." }
        self.error = initialError
        if ProcessInfo.processInfo.arguments.contains("--uitesting") {
            // Deterministic only in debug UI tests; never part of store behaviour.
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("--reset-native-state") {
                location = .delhi; settings = PanchangPreferences(); places = []; personal = []; canPersist = true; self.error = nil
                persist()
            }
            selectedDate = NativeDates.date("2026-09-24",zone:location.timeZone)!; monthAnchor = selectedDate; live = false
            #endif
        }
        refresh()
        refreshReminders()
    }
    var savedState: NativeSavedState { NativeSavedState(location:location,settings:settings,places:places,personal:personal) }
    func persist() {
        guard canPersist else { return }
        do {
            try savedState.validate()
            var directory = storageURL.deletingLastPathComponent()
            try FileManager.default.createDirectory(at:directory,withIntermediateDirectories:true)
            var values = URLResourceValues(); values.isExcludedFromBackup = true
            try directory.setResourceValues(values)
            try JSONEncoder().encode(savedState).write(to:storageURL,options:[.atomic,.completeFileProtection])
        } catch { self.error = "Your changes could not be saved on this device. Please try again after unlocking it." }
    }
    func choosePlace(_ place: PanchangPlace) {
        guard place.valid else { error = "Check the coordinates and IANA time zone."; return }
        let key = selectedKey
        location = place
        selectedDate = NativeDates.date(key,zone:zone) ?? Date()
        monthAnchor = selectedDate
        places = [place] + places.filter { $0.id != place.id }.prefix(11)
        persist(); refresh()
    }
    func updateSettings(_ value: PanchangPreferences) {
        guard value.valid else { return }
        settings = value; persist(); refresh()
    }
    func selectDate(_ date: Date, live: Bool = false) {
        guard dateRange.contains(date) else { error = "Choose a date between 1900 and 2100."; return }
        selectedDate = date; monthAnchor = date; self.live = live; chosenTime = false
        loadDay(); loadMonth()
    }
    func today() { selectDate(Date(),live:true) }
    func selectTime(_ date: Date) { selectedDate = date;live = false;chosenTime = true;loadDay() }
    func atSunrise() { chosenTime = false;live = false;loadDay() }
    func moveDay(_ delta: Int) {
        if let date = calendar.date(byAdding:.day,value:delta,to:selectedDate) { selectDate(date) }
    }
    func moveMonth(_ delta: Int) {
        guard let date = calendar.date(byAdding:.month,value:delta,to:monthAnchor),dateRange.contains(date) else { return }
        monthAnchor = date; loadMonth()
    }
    func refresh() { loadDay(); loadMonth(force:true); loadUpcoming() }
    func refreshLive() {
        guard live else { return }
        if selectedKey != todayKey { selectedDate = Date();monthAnchor = selectedDate;loadMonth();loadUpcoming() }
        loadDay()
    }
    func loadDay() {
        let token = UUID(); dayRevision = token; loadingDay = true; day = nil
        let instant = live && selectedKey == todayKey ? ISO8601DateFormatter().string(from:Date()) : chosenTime ? ISO8601DateFormatter().string(from:selectedDate) : nil
        calculator.run("day",date:selectedKey,place:location,settings:settings,instant:instant,as:NativeDay.self) { [weak self] result in
            guard let self,self.dayRevision == token else { return }
            self.loadingDay = false
            switch result { case .success(let data): self.day = data; case .failure(let e): self.error = e.localizedDescription }
        }
    }
    func loadMonth(force: Bool = false) {
        let date = NativeDates.key(monthAnchor,zone:zone)
        let key = "\(date.prefix(7))-\(location.id)-\(settings.convention)-\(settings.sunriseMode)-\(settings.lang)"
        if !force && monthCacheKey == key { return }
        monthCacheKey = key
        let token = UUID(); monthRevision = token; loadingMonth = true; month = []
        calculator.run("month",date:date,place:location,settings:settings,as:[NativeMonthDay].self) { [weak self] result in
            guard let self,self.monthRevision == token else { return }
            self.loadingMonth = false
            switch result { case .success(let data): self.month = data; case .failure(let e): self.monthCacheKey = ""; self.error = e.localizedDescription }
        }
    }
    func loadUpcoming() {
        let token = UUID(); upcomingRevision = token; upcoming = []
        guard !personal.isEmpty else { loadingUpcoming = false; return }
        loadingUpcoming = true
        calculator.run("upcoming",date:todayKey,place:location,settings:settings,personal:personal,as:[NativeEvent].self) { [weak self] result in
            guard let self,self.upcomingRevision == token else { return }
            self.loadingUpcoming = false
            switch result { case .success(let data): self.upcoming = data; case .failure(let e): self.error = e.localizedDescription }
        }
    }
    func addPersonal(_ value: LunarDate) {
        guard value.valid,(personal.count < 200 || personal.contains(where:{$0.id == value.id})) else { error = "Enter a name of up to 80 characters. You can save up to 200 lunar dates."; return }
        if personal.contains(where:{ $0.id != value.id && $0.name == value.name && $0.month == value.month && $0.tithi == value.tithi && $0.includeAdhika == value.includeAdhika }) { notice = "This lunar date is already saved."; return }
        if let index = personal.firstIndex(where:{$0.id == value.id}) {
            if personal[index] != value {
                UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers:["eksaar-\(value.id)"])
                refreshReminders()
            }
            personal[index] = value
        } else { personal.append(value) }
        persist(); loadUpcoming()
    }
    func deletePersonal(_ value: LunarDate) {
        personal.removeAll { $0.id == value.id }
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers:["eksaar-\(value.id)"])
        persist(); loadUpcoming(); refreshReminders()
    }
    func matches(_ day: NativeMonthDay) -> [LunarDate] {
        guard day.sunrise != nil else { return [] }
        return personal.filter { $0.month == day.monthIndex && $0.tithi == day.tithiIndex && (!day.adhika || $0.includeAdhika) }
    }
    func time(_ value: String?, base: String? = nil) -> String {
        guard let date = NativeDates.parse(value) else { return "Not occurring" }
        let text = NativeDates.format(date,zone:zone,pattern:settings.hour12 ? "h:mm a" : "HH:mm")
        let key = NativeDates.key(date,zone:zone)
        return text + (key != (base ?? selectedKey) ? " · \(key)" : "")
    }
    func interval(_ start: String?,_ end: String?) -> String { "\(time(start)) – \(time(end))" }
    func exportBackup() throws -> Data {
        let encoder = JSONEncoder(); encoder.outputFormatting = [.prettyPrinted,.sortedKeys]
        return try encoder.encode(savedState)
    }
    func readBackup(_ url: URL) throws -> NativeSavedState {
        let access = url.startAccessingSecurityScopedResource(); defer { if access { url.stopAccessingSecurityScopedResource() } }
        let size = try url.resourceValues(forKeys:[.fileSizeKey]).fileSize ?? 0
        guard size <= 512_000 else { throw NativeError.message("Choose an Eksaar backup smaller than 512 KB.") }
        let data = try Data(contentsOf:url)
        guard data.count <= 512_000 else { throw NativeError.message("This backup is too large.") }
        let state = try JSONDecoder().decode(NativeSavedState.self,from:data); try state.validate(); return state
    }
    func importBackup(_ state: NativeSavedState) {
        do {
            try state.validate()
            let existing = Set(personal.map(\.id))
            let merged = personal + state.personal.filter { !existing.contains($0.id) }
            guard merged.count <= 200 else { throw NativeError.message("The merged backup exceeds 200 lunar dates.") }
            // Import merges personal dates; it never silently replaces current preferences.
            personal = merged; canPersist = true; persist(); loadUpcoming(); notice = "Imported \(merged.count - existing.count) lunar dates."
        } catch { self.error = error.localizedDescription }
    }
    func remind(_ event: NativeEvent) {
        guard let date = NativeDates.parse(event.start),date > Date().addingTimeInterval(5) else { error = "Choose a future event for a reminder."; return }
        let center = UNUserNotificationCenter.current(), id = "eksaar-\(event.id)"
        center.getPendingNotificationRequests { pending in
            guard pending.count < 60 || pending.contains(where:{$0.identifier == id}) else {
                DispatchQueue.main.async { self.error = "You have 60 reminders. Remove one before adding another." }; return
            }
            center.requestAuthorization(options:[.alert,.sound]) { allowed,error in
                guard allowed,error == nil else { DispatchQueue.main.async { self.error = "Notifications are disabled. You can enable them for Eksaar Panchang in iOS Settings." }; return }
                let content = UNMutableNotificationContent(); content.title = event.name; content.body = "Your saved Panchang event. Open the app to see the calculation and location."; content.sound = .default
                var utcCalendar = Calendar(identifier:.gregorian); utcCalendar.timeZone = .gmt
                var components = utcCalendar.dateComponents([.year,.month,.day,.hour,.minute,.second],from:date)
                components.timeZone = .gmt
                let request = UNNotificationRequest(identifier:id,content:content,trigger:UNCalendarNotificationTrigger(dateMatching:components,repeats:false))
                center.add(request) { error in DispatchQueue.main.async {
                    if error != nil { self.error = "This reminder could not be scheduled." }
                    else { self.notice = "Reminder scheduled for this occurrence."; self.refreshReminders() }
                } }
            }
        }
    }
    func refreshReminders() {
        UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
            let items = requests.filter { $0.identifier.hasPrefix("eksaar-") }
            DispatchQueue.main.async { self.reminders = Dictionary(uniqueKeysWithValues:items.map { ($0.identifier,$0.content.title) }) }
        }
    }
    func removeReminder(_ id: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers:[id]); reminders.removeValue(forKey:id)
    }
}

final class NativeLocation: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    @Published var reading = false
    @Published var message: String?
    var completion: ((CLLocationCoordinate2D) -> Void)?
    override init() { super.init(); manager.delegate = self; manager.desiredAccuracy = kCLLocationAccuracyThreeKilometers }
    func request() {
        reading = true; message = nil
        if manager.authorizationStatus == .notDetermined { manager.requestWhenInUseAuthorization() }
        else if manager.authorizationStatus == .authorizedWhenInUse || manager.authorizationStatus == .authorizedAlways { manager.requestLocation() }
        else { reading = false; message = "Location is disabled. Choose a city or enter coordinates instead." }
    }
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        guard reading else { return }
        if manager.authorizationStatus == .authorizedWhenInUse || manager.authorizationStatus == .authorizedAlways { manager.requestLocation() }
        else if manager.authorizationStatus != .notDetermined { reading = false; message = "Location is optional. You can choose a city manually." }
    }
    func locationManager(_ manager: CLLocationManager,didUpdateLocations locations: [CLLocation]) {
        reading = false; if let last = locations.last { completion?(last.coordinate) }
    }
    func locationManager(_ manager: CLLocationManager,didFailWithError error: Error) { reading = false; message = "Your position is unavailable. Please select a city." }
}
