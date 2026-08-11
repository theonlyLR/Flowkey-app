import AppKit
import Foundation

let args = CommandLine.arguments
guard args.count > 1, let pid = Int32(args[1]) else { exit(1) }

guard let app = NSRunningApplication(processIdentifier: pid),
      let icon = app.icon else {
    exit(1)
}

let targetSize = NSSize(width: 64, height: 64)
let newImage = NSImage(size: targetSize)
newImage.lockFocus()
icon.draw(in: NSRect(origin: .zero, size: targetSize),
          from: NSRect(origin: .zero, size: icon.size),
          operation: .copy,
          fraction: 1.0)
newImage.unlockFocus()

guard let tiffData = newImage.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiffData),
      let pngData = bitmap.representation(using: .png, properties: [:]) else {
    exit(1)
}

print(pngData.base64EncodedString())