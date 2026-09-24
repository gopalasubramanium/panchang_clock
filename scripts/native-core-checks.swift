import Foundation
import JavaScriptCore
let context = JSContext()!
context.evaluateScript(try String(contentsOfFile:"ios/App/App/NativeResources/native-engine.js",encoding:.utf8))
if let error = context.exception { fatalError(error.toString()) }
assert(context.evaluateScript("typeof fetch + '/' + typeof window + '/' + typeof require")!.toString() == "undefined/undefined/undefined", "The calculation context must have no network, browser or module-loader capabilities")
let request = context.objectForKeyedSubscript("EksaarNative")!.objectForKeyedSubscript("request")!
func call<T: Decodable>(_ kind: String, _ type: T.Type, date: String = "2026-09-24", personal: [[String:Any]] = []) throws -> T {
    let input: [String:Any] = ["kind":kind,"date":date,"location":["name":"New Delhi","lat":28.6139,"lon":77.209,"zone":"Asia/Kolkata"],"settings":["convention":"amanta","sunriseMode":"geometric","lang":"en"],"personal":personal]
    let data = try JSONSerialization.data(withJSONObject:input)
    let response = request.call(withArguments:[String(data:data,encoding:.utf8)!])!.toString()!
    let envelope = try JSONSerialization.jsonObject(with:Data(response.utf8)) as! [String:Any]
    if let error = envelope["error"] { fatalError("Engine error: \(error)") }
    return try JSONDecoder().decode(type,from:JSONSerialization.data(withJSONObject:envelope["value"]!))
}
let start = Date()
let day = try call("day",NativeDay.self)
assert(day.angas.count == 4 && day.horas.count == 24 && day.planets.count >= 7)
let month = try call("month",[NativeMonthDay].self)
assert(month.count == 30)
let rule: [String:Any] = ["id":UUID().uuidString,"name":"Sample date","month":day.monthIndex,"tithi":day.tithiIndex,"includeAdhika":false]
let upcoming = try call("upcoming",[NativeEvent].self,personal:[rule])
assert(upcoming.count == 1)
var state = NativeSavedState();state.personal = [LunarDate(name:"Sample",month:day.monthIndex,tithi:day.tithiIndex)];try state.validate()
let restored = try JSONDecoder().decode(NativeSavedState.self,from:JSONEncoder().encode(state));try restored.validate();assert(restored.personal == state.personal)
state.personal[0].month = 12
do { try state.validate();fatalError("Invalid backup accepted") } catch {}
print("JavaScriptCore: day, 30-day month, upcoming match, Swift decoding and backup validation passed in \(Date().timeIntervalSince(start)) seconds")
