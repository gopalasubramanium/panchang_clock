import SwiftUI
import UniformTypeIdentifiers
import EventKit
import EventKitUI

struct NativePlacePicker: View {
    @EnvironmentObject var store: PanchangStore
    @Environment(\.dismiss) var dismiss
    @State private var search = ""
    @State private var custom = false
    var results: [PanchangPlace] {
        let terms = search.folding(options:[.diacriticInsensitive,.caseInsensitive],locale:.current).split(separator:" ")
        return Array(store.cities.lazy.filter { place in
            let text = "\(place.name) \(place.zone)".folding(options:[.diacriticInsensitive,.caseInsensitive],locale:.current)
            return terms.allSatisfy { text.contains($0) }
        }.prefix(80))
    }
    func choose(_ place: PanchangPlace) { store.choosePlace(place);dismiss() }
    var body: some View {
        List {
            Section { Button { custom = true } label:{Label("Coordinates or current position",systemImage:"location.viewfinder")} }
            if search.isEmpty && !store.places.isEmpty {
                Section("Recent places") { ForEach(store.places) { place in Button { choose(place) } label:{placeRow(place)} } }
            }
            Section(search.isEmpty ? "Offline city directory" : "Results") {
                ForEach(results) { place in Button { choose(place) } label:{placeRow(place)}.accessibilityIdentifier("city.\(place.name)") }
                if results.isEmpty { Text("No city found. Enter coordinates and a time zone instead.").foregroundStyle(.secondary) }
            }
        }.searchable(text:$search,prompt:"City or time zone").navigationTitle("Choose a place")
            .toolbar { ToolbarItem(placement:.cancellationAction) { Button("Done") { dismiss() } } }
            .sheet(isPresented:$custom) { NavigationStack { NativeCustomPlace { place in choose(place) } } }
    }
    func placeRow(_ place: PanchangPlace) -> some View {
        VStack(alignment:.leading,spacing:4) { Text(place.name).font(.headline);Text(place.zone).font(.caption).foregroundStyle(.secondary) }
    }
}
struct NativeCustomPlace: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var locator = NativeLocation()
    @State private var name = ""
    @State private var latitude = ""
    @State private var longitude = ""
    @State private var zone = TimeZone.current.identifier
    @State private var elevation = "0"
    var choose: (PanchangPlace) -> Void
    var place: PanchangPlace? {
        guard let lat = Double(latitude),let lon = Double(longitude),let height = Double(elevation) else { return nil }
        let p = PanchangPlace(name:name,lat:lat,lon:lon,zone:zone,elevation:height)
        return p.valid ? p : nil
    }
    var body: some View {
        Form {
            Section {
                Button { locator.completion = { point in
                    latitude = String(format:"%.5f",point.latitude);longitude = String(format:"%.5f",point.longitude);if name.isEmpty {name = "Current position"}
                };locator.request() } label:{Label(locator.reading ? "Finding position…" : "Use current position",systemImage:"location")}
                    .disabled(locator.reading)
                if let message = locator.message { Text(message).foregroundStyle(.secondary) }
            } footer:{Text("Optional. Coordinates stay on this device. Check the time zone below; it starts with your device's time zone.")}
            Section {
                TextField("Place name",text:$name)
                TextField("Latitude (−90 to 90)",text:$latitude).keyboardType(.numbersAndPunctuation)
                TextField("Longitude (−180 to 180)",text:$longitude).keyboardType(.numbersAndPunctuation)
                TextField("Elevation in metres",text:$elevation).keyboardType(.numbersAndPunctuation)
                TextField("IANA time zone",text:$zone).textInputAutocapitalization(.never).autocorrectionDisabled()
            } header:{Text("Location")} footer:{Text("For example: Asia/Kolkata, Europe/London, or America/New_York. Daylight saving changes are handled by the selected zone.")}
        }.navigationTitle("Custom location").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement:.cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement:.confirmationAction) { Button("Use place") { if let place { dismiss();choose(place) } }.disabled(place == nil) }
            }
    }
}
struct NativeSettingsView: View {
    @EnvironmentObject var store: PanchangStore
    @State private var export = false
    @State private var importing = false
    @State private var backup = NativeBackupDocument()
    @State private var pendingBackup: NativeSavedState?
    func preference<T>(_ key: WritableKeyPath<PanchangPreferences,T>) -> Binding<T> {
        Binding(get:{store.settings[keyPath:key]},set:{ var s = store.settings;s[keyPath:key] = $0;store.updateSettings(s) })
    }
    var body: some View {
        Form {
            Section("Your place") {
                NavigationLink { NativePlacePicker() } label:{LabeledContent("Location",value:store.location.name)}
                Text(store.location.zone).font(.caption).foregroundStyle(.secondary)
            }
            Section("Calculation conventions") {
                Picker("Lunar months",selection:preference(\.convention)) { Text("Amanta").tag("amanta");Text("Purnimanta").tag("purnimanta") }
                    .accessibilityIdentifier("monthConvention")
                Picker("Sunrise",selection:preference(\.sunriseMode)) { Text("Geometric centre").tag("geometric");Text("Apparent upper limb").tag("apparent") }
                Text("Amanta months end at new moon; Purnimanta months end at full moon. Sunrise definitions can change timings by several minutes.").font(.footnote).foregroundStyle(.secondary)
            }
            Section("Appearance") {
                Picker("Appearance",selection:preference(\.appearance)) { Text("System").tag("system");Text("Light").tag("light");Text("Dark").tag("dark") }
                Toggle("12-hour clock",isOn:preference(\.hour12))
                Picker("Traditional names",selection:preference(\.lang)) {
                    Text("English").tag("en");Text("Hindi").tag("hi");Text("Bengali").tag("bn");Text("Marathi").tag("mr")
                    Text("Telugu").tag("te");Text("Tamil").tag("ta");Text("Gujarati").tag("gu");Text("Kannada").tag("kn")
                    Text("Malayalam").tag("ml");Text("Punjabi").tag("pa");Text("Odia").tag("or");Text("Urdu").tag("ur")
                }
                Text("Explanations are in English. Text size follows your device's accessibility settings.").font(.footnote).foregroundStyle(.secondary)
            }
            Section("Your data") {
                Button("Export a backup") {
                    do { backup = NativeBackupDocument(data:try store.exportBackup());export = true }
                    catch { store.error = "Your backup could not be prepared." }
                }.accessibilityIdentifier("exportBackup")
                Button("Import lunar dates") { importing = true }.accessibilityIdentifier("importBackup")
                Text("Saved dates and preferences stay in protected device storage and are excluded from automatic cloud backup. A backup you export can be stored or shared wherever you choose.").font(.footnote).foregroundStyle(.secondary)
            }
            if !store.reminders.isEmpty {
                Section("Scheduled on this device") {
                    ForEach(store.reminders.keys.sorted(),id:\.self) { id in
                        HStack { Text(store.reminders[id] ?? "Reminder");Spacer();Button("Cancel") {store.removeReminder(id)} }
                    }
                }
            }
            Section {
                NavigationLink("About & calculation notes") { NativeAboutView() }
                Link("Support",destination:URL(string:"https://panchang.eksaar.com/support.html")!)
                Link("Privacy policy",destination:URL(string:"https://panchang.eksaar.com/privacy.html")!)
            } footer:{
                Text("Made by Gopala Subramanium. A daily essential should be free, without advertising, fees or unnecessary clutter.")
            }
        }.navigationTitle("Settings")
            .fileExporter(isPresented:$export,document:backup,contentType:.json,defaultFilename:"Eksaar-Panchang-Backup") { result in if case .failure = result {store.error = "The backup was not exported."} }
            .fileImporter(isPresented:$importing,allowedContentTypes:[.json]) { result in
                do { pendingBackup = try store.readBackup(result.get()) } catch {store.error = error.localizedDescription}
            }
            .confirmationDialog("Import \(pendingBackup?.personal.count ?? 0) lunar dates?",isPresented:Binding(get:{pendingBackup != nil},set:{if !$0 {pendingBackup = nil}})) {
                Button("Merge lunar dates") { if let pendingBackup {store.importBackup(pendingBackup)};pendingBackup = nil }
            } message:{Text("Your current dates and settings will be kept. Matching saved IDs will not be duplicated.")}
    }
}
struct NativeAboutView: View {
    private var nativeNotices: String {
        guard let url = Bundle.main.url(forResource:"Notices",withExtension:"txt",subdirectory:"NativeResources"),let text = try? String(contentsOf:url,encoding:.utf8) else { return "Licenses are available in the source repository." }
        return text
    }
    var body: some View {
        List {
            Section {
                Label("Eksaar Panchang",systemImage:"sun.max.fill").font(.title2)
                Text("Your day, in rhythm.").font(.system(.title3,design:.serif))
                Text("Native iPhone and iPad screens, with calculations performed entirely on your device. No account, advertising, subscription or app-operated analytics.")
            }
            Section("Understand the results") {
                Text("The Sun and Moon are calculated with Astronomy Engine 2.1.19. Sidereal calculations use a mean Lahiri approximation. A transition search tolerance of 0.5 seconds describes numerical convergence, not absolute astronomical accuracy.")
                Text("The supported date range is 1900–2100. Daily snapshots use local sunrise unless you select Today for the current moment. At polar locations without sunrise, a noon fallback is clearly separated from unavailable sunrise-based periods.")
                Text("Calendar festivals are rule-based previews. Advanced regional fasting decisions and Parana are not provided. Differences between traditions and sunrise definitions can produce different dates.")
                Text("Personal dates use Amanta lunar months and sunrise matches. A skipped or repeated tithi can require a family-specific observance rule.")
            }
            Section("Credits & sources") {
                Link("Gopala Subramanium",destination:URL(string:"https://me.sgopala.com")!)
                Link("Source code and accuracy notes",destination:URL(string:"https://github.com/gopalasubramanium/panchang_clock")!)
                NavigationLink("Open-source acknowledgements") {
                    ScrollView { Text(nativeNotices).font(.footnote).textSelection(.enabled).padding() }.navigationTitle("Acknowledgements")
                }
                Text("Built to make a daily essential freely available, without ads, fees or unnecessary clutter.").font(.footnote)
            }
        }.navigationTitle("About Panchang")
    }
}
struct NativeBackupDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }
    var data = Data()
    init(data: Data = Data()) { self.data = data }
    init(configuration: ReadConfiguration) throws { data = configuration.file.regularFileContents ?? Data() }
    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper { FileWrapper(regularFileWithContents:data) }
}
struct NativeCalendarEditor: UIViewControllerRepresentable {
    var event: NativeEvent
    var place: PanchangPlace
    @Environment(\.dismiss) var dismiss
    class Coordinator: NSObject, EKEventEditViewDelegate {
        var owner: NativeCalendarEditor
        init(_ owner: NativeCalendarEditor) { self.owner = owner }
        func eventEditViewController(_ controller: EKEventEditViewController,didCompleteWith action: EKEventEditViewAction) { owner.dismiss() }
    }
    func makeCoordinator() -> Coordinator { Coordinator(self) }
    func makeUIViewController(context: Context) -> EKEventEditViewController {
        // On iOS 17+, this system editor adds only the user-reviewed event without
        // requesting access to read the user's calendar database.
        let controller = EKEventEditViewController(),eventStore = EKEventStore()
        controller.eventStore = eventStore
        let item = EKEvent(eventStore:eventStore)
        item.title = event.status == "preview" ? event.name + " (preview)" : event.name
        item.startDate = NativeDates.parse(event.start) ?? Date()
        item.endDate = max(NativeDates.parse(event.end) ?? item.startDate,item.startDate.addingTimeInterval(60))
        item.timeZone = place.timeZone;item.location = "\(place.name) · \(place.zone)"
        item.notes = event.reason + "\nEksaar Panchang. A one-minute marker is used for instantaneous transitions; it is not a ritual duration."
        controller.event = item;controller.editViewDelegate = context.coordinator
        return controller
    }
    func updateUIViewController(_ controller: EKEventEditViewController,context: Context) {}
}
