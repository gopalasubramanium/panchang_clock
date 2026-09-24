import Foundation
import JavaScriptCore

struct PanchangPlace: Codable, Hashable, Identifiable {
    var name: String
    var lat: Double
    var lon: Double
    var zone: String
    var elevation: Double? = 0
    var id: String { "\(lat),\(lon),\(zone)" }
    static let delhi = PanchangPlace(name: "New Delhi", lat: 28.6139, lon: 77.209, zone: "Asia/Kolkata")
    var timeZone: TimeZone { TimeZone(identifier: zone) ?? .gmt }
    var valid: Bool { !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && name.count <= 80 && lat.isFinite && lon.isFinite && (-90...90).contains(lat) && (-180...180).contains(lon) && TimeZone(identifier: zone) != nil && (-500...9000).contains(elevation ?? 0) }
}
struct PanchangPreferences: Codable, Equatable {
    var convention = "amanta"
    var sunriseMode = "geometric"
    var lang = "en"
    var appearance = "system"
    var hour12 = false
    var valid: Bool {
        ["amanta","purnimanta"].contains(convention) && ["geometric","apparent"].contains(sunriseMode)
        && ["en","hi","bn","mr","te","ta","gu","kn","ml","pa","or","ur"].contains(lang)
        && ["system","light","dark"].contains(appearance)
    }
}
struct LunarDate: Codable, Identifiable, Equatable {
    var id = UUID().uuidString
    var name: String
    var month: Int
    var tithi: Int
    var includeAdhika = false
    var valid: Bool { UUID(uuidString: id) != nil && !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && name.count <= 80 && (0...11).contains(month) && (0...29).contains(tithi) }
}
struct NativeSavedState: Codable {
    var schema = 1
    var location = PanchangPlace.delhi
    var settings = PanchangPreferences()
    var places: [PanchangPlace] = []
    var personal: [LunarDate] = []
    func validate() throws {
        guard schema == 1, location.valid, settings.valid, places.count <= 12,
              places.allSatisfy(\.valid), personal.count <= 200, personal.allSatisfy(\.valid),
              Set(personal.map(\.id)).count == personal.count else {
            throw NativeError.message("This backup contains invalid locations or lunar dates.")
        }
    }
}
enum NativeError: LocalizedError {
    case message(String)
    var errorDescription: String? { if case let .message(text) = self { return text }; return nil }
}
struct NativeAnga: Decodable, Identifiable {
    var kind: String; var index: Int; var name: String; var start: String; var end: String; var next: String
    var id: String { kind }
}
struct NativeSun: Decodable {
    var sunrise: String?; var sunset: String?; var moonrise: String?; var moonset: String?
    var start: String; var end: String
}
struct NativePeriod: Decodable, Identifiable {
    var name: String; var start: String; var end: String
    var quality: String?
    var id: String { "\(name)-\(start)" }
}
struct NativeEvent: Codable, Identifiable {
    var id: String; var name: String; var date: String?
    var start: String?; var end: String?; var reason: String; var status: String
}
struct NativePlanet: Decodable, Identifiable {
    var name: String; var longitude: Double; var rashi: String; var degree: Double
    var id: String { name }
}
struct NativeDay: Decodable {
    var date: String; var instant: String; var weekday: String; var month: String; var adhika: Bool
    var solarMonth: String; var tithiIndex: Int; var monthIndex: Int; var illumination: Double
    var sun: NativeSun; var angas: [NativeAnga]; var timings: [NativePeriod]; var horas: [NativePeriod]
    var choghadiya: [NativePeriod]; var planets: [NativePlanet]; var events: [NativeEvent]; var warnings: [String]
    var convention: String; var sunriseMode: String
}
struct NativeMonthDay: Decodable, Identifiable {
    var date: String; var day: Int; var tithiIndex: Int; var tithi: String
    var month: String; var monthIndex: Int; var adhika: Bool; var sunrise: String?; var events: [NativeEvent]
    var id: String { date }
}
enum NativeDates {
    static let months = ["Chaitra","Vaishakha","Jyeshtha","Ashadha","Shravana","Bhadrapada","Ashwin","Kartika","Margashirsha","Pausha","Magha","Phalguna"]
    static let tithis = ["Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Purnima"]
    static func tithi(_ value: Int) -> String { "\(value < 15 ? "Shukla" : "Krishna") \(value == 29 ? "Amavasya" : tithis[max(0,min(value,29)) % 15])" }
    static func parse(_ string: String?) -> Date? {
        guard let string else { return nil }
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime,.withFractionalSeconds]
        return f.date(from: string) ?? ISO8601DateFormatter().date(from: string)
    }
    static func calendar(_ zone: TimeZone) -> Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = zone; return c }
    static func key(_ date: Date, zone: TimeZone) -> String {
        let f = DateFormatter(); f.locale = Locale(identifier:"en_US_POSIX"); f.calendar = calendar(zone); f.timeZone = zone; f.dateFormat = "yyyy-MM-dd"; return f.string(from: date)
    }
    static func date(_ key: String, zone: TimeZone) -> Date? {
        let f = DateFormatter(); f.locale = Locale(identifier:"en_US_POSIX"); f.calendar = calendar(zone); f.timeZone = zone; f.dateFormat = "yyyy-MM-dd HH:mm"; f.isLenient = false
        return f.date(from: key + " 12:00")
    }
    static func format(_ date: Date, zone: TimeZone, pattern: String) -> String {
        let f = DateFormatter(); f.locale = Locale(identifier:"en"); f.calendar = calendar(zone); f.timeZone = zone; f.dateFormat = pattern; return f.string(from: date)
    }
}

// JavaScriptCore executes only our bundled scientific functions. It has no browser,
// URL loader, filesystem bridge, dynamic downloads or injected native capabilities.
final class NativeCalculator {
    private let queue = DispatchQueue(label:"com.eksaar.panchang.calculations", qos:.userInitiated)
    private var context: JSContext?
    private func calculate<T: Decodable>(_ input: Data, as type: T.Type) throws -> T {
        if context == nil {
            guard let url = Bundle.main.url(forResource:"native-engine",withExtension:"js",subdirectory:"NativeResources"),
                  let c = JSContext() else { throw NativeError.message("The offline calculation resources are unavailable.") }
            c.evaluateScript(try String(contentsOf:url,encoding:.utf8))
            guard c.exception == nil else { throw NativeError.message("The offline calculation engine could not start.") }
            context = c
        }
        guard let c = context, let function = c.objectForKeyedSubscript("EksaarNative")?.objectForKeyedSubscript("request") else { throw NativeError.message("The offline calculation interface is unavailable.") }
        c.exception = nil
        guard let text = String(data:input,encoding:.utf8), let response = function.call(withArguments:[text])?.toString(),
              c.exception == nil, let data = response.data(using:.utf8),
              let envelope = try JSONSerialization.jsonObject(with:data) as? [String:Any] else { throw NativeError.message("This date could not be calculated. Please try another date or location.") }
        if let error = envelope["error"] as? String { throw NativeError.message(error) }
        guard let value = envelope["value"] else { throw NativeError.message("The calculation returned no result.") }
        return try JSONDecoder().decode(type,from:JSONSerialization.data(withJSONObject:value))
    }
    func run<T: Decodable>(_ kind: String, date: String, place: PanchangPlace, settings: PanchangPreferences,
                           personal: [LunarDate] = [], instant: String? = nil, as type: T.Type,
                           completion: @escaping (Result<T,Error>) -> Void) {
        do {
            let encoder = JSONEncoder()
            var input: [String:Any] = ["kind":kind,"date":date,
                "location":try JSONSerialization.jsonObject(with:encoder.encode(place)),
                "settings":try JSONSerialization.jsonObject(with:encoder.encode(settings)),
                "personal":try JSONSerialization.jsonObject(with:encoder.encode(personal))]
            if let instant { input["instant"] = instant }
            let data = try JSONSerialization.data(withJSONObject:input)
            queue.async {
                let result: Result<T,Error> = Result { try self.calculate(data,as:type) }
                DispatchQueue.main.async { completion(result) }
            }
        } catch { completion(.failure(error)) }
    }
}
