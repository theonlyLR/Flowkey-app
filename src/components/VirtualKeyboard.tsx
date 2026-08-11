

interface VirtualKeyboardProps {
  activeCodes: Set<string>;
}

interface KeyDef {
  label: string;
  code: string;
  flex?: number;
  accent?: boolean;
}

const KEYBOARD_ROWS: KeyDef[][] = [
  [
    { label: "Esc", code: "Escape", accent: true },
    { label: "F1", code: "F1" }, { label: "F2", code: "F2" }, { label: "F3", code: "F3" },
    { label: "F4", code: "F4" }, { label: "F5", code: "F5" }, { label: "F6", code: "F6" },
    { label: "F7", code: "F7" }, { label: "F8", code: "F8" }, { label: "F9", code: "F9" },
    { label: "F10", code: "F10" }, { label: "F11", code: "F11" }, { label: "F12", code: "F12" },
    { label: "Del", code: "Delete", accent: true },
  ],
  [
    { label: "`", code: "Backquote" }, { label: "1", code: "Digit1" }, { label: "2", code: "Digit2" },
    { label: "3", code: "Digit3" }, { label: "4", code: "Digit4" }, { label: "5", code: "Digit5" },
    { label: "6", code: "Digit6" }, { label: "7", code: "Digit7" }, { label: "8", code: "Digit8" },
    { label: "9", code: "Digit9" }, { label: "0", code: "Digit0" }, { label: "-", code: "Minus" },
    { label: "=", code: "Equal" }, { label: "Back", code: "Backspace", flex: 1.5 },
  ],
  [
    { label: "Tab", code: "Tab", flex: 1.4 },
    { label: "Q", code: "KeyQ" }, { label: "W", code: "KeyW" }, { label: "E", code: "KeyE" },
    { label: "R", code: "KeyR" }, { label: "T", code: "KeyT" }, { label: "Y", code: "KeyY" },
    { label: "U", code: "KeyU" }, { label: "I", code: "KeyI" }, { label: "O", code: "KeyO" },
    { label: "P", code: "KeyP" }, { label: "[", code: "BracketLeft" }, { label: "]", code: "BracketRight" },
    { label: "\\", code: "Backslash" },
  ],
  [
    { label: "Caps", code: "CapsLock", flex: 1.7 },
    { label: "A", code: "KeyA" }, { label: "S", code: "KeyS" }, { label: "D", code: "KeyD" },
    { label: "F", code: "KeyF" }, { label: "G", code: "KeyG" }, { label: "H", code: "KeyH" },
    { label: "J", code: "KeyJ" }, { label: "K", code: "KeyK" }, { label: "L", code: "KeyL" },
    { label: ";", code: "Semicolon" }, { label: "'", code: "Quote" },
    { label: "Enter", code: "Enter", flex: 2, accent: true },
  ],
  [
    { label: "Shift", code: "ShiftLeft", flex: 2.3 },
    { label: "Z", code: "KeyZ" }, { label: "X", code: "KeyX" }, { label: "C", code: "KeyC" },
    { label: "V", code: "KeyV" }, { label: "B", code: "KeyB" }, { label: "N", code: "KeyN" },
    { label: "M", code: "KeyM" }, { label: ",", code: "Comma" }, { label: ".", code: "Period" },
    { label: "/", code: "Slash" }, { label: "Shift", code: "ShiftRight", flex: 2.3 },
  ],
  [
    { label: "Ctrl", code: "ControlLeft", flex: 1.2 },
    { label: "Opt", code: "AltLeft", flex: 1.2 },
    { label: "Cmd", code: "MetaLeft", flex: 1.4 },
    { label: "", code: "Space", flex: 6, accent: true },
    { label: "Cmd", code: "MetaRight", flex: 1.4 },
    { label: "Opt", code: "AltRight", flex: 1.2 },
    { label: "Ctrl", code: "ControlRight", flex: 1.2 },
  ]
];

export function VirtualKeyboard({ activeCodes }: VirtualKeyboardProps) {
  const isPressed = (code: string) => {
    if (activeCodes.has(code)) return true;
    if (code === "MetaLeft" || code === "MetaRight") return activeCodes.has("Cmd") || activeCodes.has("COMMAND") || activeCodes.has("Meta");
    if (code === "AltLeft" || code === "AltRight") return activeCodes.has("Option") || activeCodes.has("OPTION") || activeCodes.has("Alt");
    if (code === "ShiftLeft" || code === "ShiftRight") return activeCodes.has("Shift") || activeCodes.has("SHIFT");
    if (code === "ControlLeft" || code === "ControlRight") return activeCodes.has("Control") || activeCodes.has("CTRL") || activeCodes.has("Ctrl");
    return false;
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "3px",
      padding: "6px 8px",
      background: "var(--chassis-top, #F4F4F5)",
      borderRadius: "14px",
      border: "1px solid rgba(0, 0, 0, 0.12)",
      boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05)"
    }}>
      {KEYBOARD_ROWS.map((row, rIdx) => (
        <div key={rIdx} style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "2px",
          width: "100%"
        }}>
          {row.map((k, kIdx) => {
            const pressed = isPressed(k.code);
            const isAccent = k.accent;

            const baseBg = isAccent
              ? "linear-gradient(180deg, var(--key-orange-top, #F06A41) 0%, var(--key-orange-face, #E3552D) 100%)"
              : "linear-gradient(180deg, var(--key-white-top, #FFFFFF) 0%, var(--key-white-face, #F0F0F3) 100%)";

            const baseColor = isAccent ? "#FFFFFF" : "var(--text-dark, #18181B)";

            return (
              <div
                key={kIdx}
                style={{
                  flex: k.flex || 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "28px",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  borderRadius: "14px",
                  background: baseBg,
                  color: baseColor,
                  border: pressed
                    ? "1.5px solid var(--key-orange-face, #E3552D)"
                    : isAccent
                    ? "1px solid var(--key-orange-side, #C4431E)"
                    : "1px solid var(--key-white-side, #E2E2E7)",
                  borderBottom: pressed
                    ? "1px solid var(--key-orange-bottom, #9E3214)"
                    : isAccent
                    ? "3.5px solid var(--key-orange-bottom, #9E3214)"
                    : "3.5px solid var(--key-white-bottom, #B8B8C0)",
                  boxShadow: pressed
                    ? "0 0 8px var(--key-orange-face, #E3552D), inset 0 0 4px rgba(255, 255, 255, 0.6)"
                    : isAccent
                    ? "0 2px 4px rgba(227, 85, 45, 0.3)"
                    : "0 2px 4px rgba(0, 0, 0, 0.08)",
                  transform: pressed ? "translateY(2px)" : "none",
                  whiteSpace: "nowrap",
                  boxSizing: "border-box",
                  transition: "all 0.05s ease"
                }}
              >
                {k.label}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}