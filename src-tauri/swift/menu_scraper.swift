import Cocoa

let args = CommandLine.arguments
guard args.count > 1 else { exit(0) }
let appName = args[1]

guard let app = NSWorkspace.shared.runningApplications.first(where: { $0.localizedName == appName }) else {
    exit(0)
}

let appRef = AXUIElementCreateApplication(app.processIdentifier)
var menuBarRef: CFTypeRef?

if AXUIElementCopyAttributeValue(appRef, kAXMenuBarAttribute as CFString, &menuBarRef) == .success {
    let menuBar = menuBarRef as! AXUIElement
    var childrenRef: CFTypeRef?
    
    if AXUIElementCopyAttributeValue(menuBar, kAXChildrenAttribute as CFString, &childrenRef) == .success {
        let menus = childrenRef as! [AXUIElement]
        
        for menu in menus {
            var categoryTitleRef: CFTypeRef?
            AXUIElementCopyAttributeValue(menu, kAXTitleAttribute as CFString, &categoryTitleRef)
            let category = (categoryTitleRef as? String) ?? "General"
            
            var menuChildrenRef: CFTypeRef?
            if AXUIElementCopyAttributeValue(menu, kAXChildrenAttribute as CFString, &menuChildrenRef) == .success {
                let items = menuChildrenRef as! [AXUIElement]
                for item in items {
                    traverseMenu(item: item, category: category)
                }
            }
        }
    }
}

func traverseMenu(item: AXUIElement, category: String) {
    var titleRef: CFTypeRef?
    var cmdCharRef: CFTypeRef?
    var cmdModifiersRef: CFTypeRef?
    
    AXUIElementCopyAttributeValue(item, kAXTitleAttribute as CFString, &titleRef)
    AXUIElementCopyAttributeValue(item, kAXMenuItemCmdCharAttribute as CFString, &cmdCharRef)
    AXUIElementCopyAttributeValue(item, kAXMenuItemCmdModifiersAttribute as CFString, &cmdModifiersRef)
    
    if let title = titleRef as? String, let key = cmdCharRef as? String, !key.isEmpty {
        let modifiers = (cmdModifiersRef as? Int) ?? 0
        var keys: [String] = []
        
        if (modifiers & 8) == 0 { keys.append("Cmd") }
        if (modifiers & 2) != 0 { keys.append("Option") }
        if (modifiers & 4) != 0 { keys.append("Control") }
        if (modifiers & 1) != 0 { keys.append("Shift") }
        keys.append(key.uppercased())
        
        print("\(category)||\(title)||\(keys.joined(separator: ","))")
    }
    
    var subChildrenRef: CFTypeRef?
    if AXUIElementCopyAttributeValue(item, kAXChildrenAttribute as CFString, &subChildrenRef) == .success,
       let subItems = subChildrenRef as? [AXUIElement] {
        for subItem in subItems {
            traverseMenu(item: subItem, category: category)
        }
    }
}
