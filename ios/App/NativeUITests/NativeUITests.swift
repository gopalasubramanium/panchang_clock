import XCTest

final class NativeUITests: XCTestCase {
    let app = XCUIApplication()
    override func setUpWithError() throws {
        continueAfterFailure = false
        app.launchArguments = ["--uitesting", "--reset-native-state"]
        app.launch()
        XCTAssertTrue(app.otherElements["nativeDailySummary"].waitForExistence(timeout:45), app.debugDescription)
        XCTAssertEqual(app.webViews.count, 0, "The daily experience must be native.")
    }
    func tab(_ name: String) {
        let item = app.tabBars.buttons[name]
        if item.exists { item.tap() } else { app.buttons[name].firstMatch.tap() }
    }
    func reveal(_ element: XCUIElement) {
        for _ in 0..<7 {
            if element.exists && element.isHittable { return }
            app.swipeUp()
        }
        XCTAssertTrue(element.isHittable, app.debugDescription)
    }
    func capture(_ name: String) throws {
        let directory = FileManager.default.urls(for:.documentDirectory,in:.userDomainMask)[0].appendingPathComponent("StoreScreenshots")
        try FileManager.default.createDirectory(at:directory,withIntermediateDirectories:true)
        let screenshot = XCUIScreen.main.screenshot()
        try screenshot.pngRepresentation.write(to:directory.appendingPathComponent(name+".png"))
        let attachment = XCTAttachment(screenshot:screenshot);attachment.name = name;attachment.lifetime = .keepAlways;add(attachment)
    }
    func testNativePlanningAndPersistence() throws {
        try capture("01-daily")
        app.buttons["anga.tithi"].tap()
        XCTAssertTrue(app.staticTexts["Transition"].waitForExistence(timeout:5))
        try capture("02-tithi")
        app.buttons["Plan for this transition"].tap()
        let add = app.buttons["addToCalendar"]
        XCTAssertTrue(add.waitForExistence(timeout:5)); add.tap()
        XCTAssertTrue(app.buttons["Cancel"].firstMatch.waitForExistence(timeout:15),app.debugDescription)
        XCTAssertEqual(app.webViews.count,0)
        try capture("qa-calendar-editor")
        app.buttons["Cancel"].firstMatch.tap()
        if app.buttons["Discard Changes"].exists { app.buttons["Discard Changes"].tap() }
        tab("Month")
        let date = app.buttons["calendar.day.2026-09-25"]
        XCTAssertTrue(date.waitForExistence(timeout:45),app.debugDescription)
        try capture("03-month")
        app.buttons["Next month"].tap()
        XCTAssertTrue(app.buttons["calendar.day.2026-10-01"].waitForExistence(timeout:45))
        app.buttons["Previous month"].tap()
        XCTAssertTrue(date.waitForExistence(timeout:45)); date.tap()
        XCTAssertTrue(app.otherElements["nativeDailySummary"].waitForExistence(timeout:45))
        let remember = app.buttons["rememberLunarDate"];reveal(remember);remember.tap()
        let name = app.textFields["lunarName"]
        XCTAssertTrue(name.waitForExistence(timeout:10));name.tap();name.typeText("Family observance")
        app.buttons["saveLunarDate"].tap()
        tab("My dates")
        XCTAssertTrue(app.staticTexts["Family observance"].firstMatch.waitForExistence(timeout:45))
        // Wait until the off-device-independent occurrence search has completed.
        let finding = app.progressIndicators.firstMatch
        if finding.exists { XCTAssertTrue(finding.waitForNonExistence(timeout:60)) }
        try capture("04-personal-dates")
        app.terminate();app.launchArguments = ["--uitesting"];app.launch()
        XCTAssertTrue(app.otherElements["nativeDailySummary"].waitForExistence(timeout:45))
        tab("My dates")
        XCTAssertTrue(app.staticTexts["Family observance"].firstMatch.waitForExistence(timeout:15),"Saved dates must survive relaunch.")
        tab("Timings")
        XCTAssertTrue(app.staticTexts["Rahu Kalam"].waitForExistence(timeout:15));try capture("05-timings")
        tab("Settings")
        XCTAssertTrue(app.buttons["monthConvention"].waitForExistence(timeout:10))
        app.buttons["monthConvention"].tap();app.buttons["Purnimanta"].tap()
        XCTAssertTrue(app.staticTexts["Purnimanta"].firstMatch.exists)
        try capture("06-settings")
        reveal(app.buttons["exportBackup"])
        XCTAssertTrue(app.buttons["importBackup"].exists)
        XCTAssertEqual(app.webViews.count,0)
    }
    func testOfflineLocationAndAccessibleMonth() throws {
        app.buttons["chooseLocation"].tap()
        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout:10));search.tap();search.typeText("Singapore")
        let city = app.buttons["city.Singapore"]
        XCTAssertTrue(city.waitForExistence(timeout:10));city.tap()
        XCTAssertTrue(app.staticTexts["Asia/Singapore"].waitForExistence(timeout:30))
        tab("Month")
        XCTAssertTrue(app.buttons["calendar.day.2026-09-24"].waitForExistence(timeout:45))
        XCTAssertEqual(app.webViews.count,0)
        try capture("qa-singapore-month")
    }
}
