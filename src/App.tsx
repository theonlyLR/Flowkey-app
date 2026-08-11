import { useEffect, useState, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow, currentMonitor, PhysicalPosition } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { CANVAS_FALLBACKS, ShortcutItem } from "./data/canvasShortcuts";
import { VirtualKeyboard } from "./components/VirtualKeyboard";
import "./App.css";

interface WindowInfo {
  title: string;
  app_name: string;
  process_id: number;
  icon_base64?: string;
}

interface ModifierPayload {
  modifiers: string[];
}

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";

const SYNONYM_MAP: Record<string, string[]> = {
  zoom: ["view", "scale", "fit", "canvas", "in", "out"],
  frame: ["artboard", "group", "selection", "container", "box", "rectangle", "layout"],
  text: ["font", "type", "character", "label", "write", "heading"],
  delete: ["remove", "cut", "clear", "erase", "trash"],
  copy: ["duplicate", "clone", "paste", "replicate"],
  move: ["pan", "drag", "nudge", "position", "align"],
  color: ["fill", "stroke", "border", "picker", "style", "swatch"],
  select: ["pick", "pointer", "cursor", "all", "multiselect"],
  export: ["save", "download", "share", "file", "render"],
  grid: ["layout", "ruler", "guide", "snap", "column"]
};

const normalizeKey = (key: string): string => {
  if (!key) return "";
  const k = key.toLowerCase().trim();
  if (["metaleft", "metaright", "cmd", "command", "meta", "⌘"].includes(k)) return "cmd";
  if (["altleft", "altright", "option", "opt", "alt", "⌥"].includes(k)) return "option";
  if (["shiftleft", "shiftright", "shift", "⇧"].includes(k)) return "shift";
  if (["controlleft", "controlright", "control", "ctrl", "⌃"].includes(k)) return "control";
  if (["space", " "].includes(k)) return "space";
  if (["backspace", "delete", "back", "del"].includes(k)) return "delete";
  if (["enter", "return"].includes(k)) return "return";
  if (k.startsWith("key")) return k.replace("key", "");
  if (k.startsWith("digit")) return k.replace("digit", "");
  return k;
};

// 🔥 CATEGORY SORTING LOGIC: Forces tools to the top, native Mac menus to the bottom
const getCategoryWeight = (category: string) => {
  const lower = category.toLowerCase();
  
  // 1-9: Absolute top priority (Custom tools, canvas, actions)
  if (lower.includes("tool")) return 1;
  if (lower.includes("canvas")) return 2;
  if (lower.includes("action")) return 3;

  // 90+: Standard Native Mac OS menus (Push to the bottom)
  if (lower === "view") return 90;
  if (lower === "file") return 91;
  if (lower === "edit") return 92;
  if (lower === "window") return 93;
  if (lower === "help") return 94;
  if (lower === "apple") return 99;

  // 10-89: App-specific native menus (Bookmarks, Playback, Settings, etc.)
  return 10;
};

function App() {
  const [activeWindow, setActiveWindow] = useState<WindowInfo | null>(null);
  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCodes, setActiveCodes] = useState<Set<string>>(new Set());
  const [isSnapMenuOpen, setIsSnapMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("theme") as "light" | "dark") || "light";
  });
  
  const snapMenuRef = useRef<HTMLDivElement>(null);
  
  // IN-MEMORY CACHE for 0ms switching
  const shortcutCache = useRef<Record<string, ShortcutItem[]>>({});

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const snapToCorner = async (corner: Corner) => {
    try {
      const appWindow = getCurrentWindow();
      const monitor = await currentMonitor();
      if (!monitor) return;

      const outerSize = await appWindow.outerSize();
      const margin = Math.round(20 * monitor.scaleFactor);

      let x = monitor.position.x + margin;
      let y = monitor.position.y + margin;

      if (corner === "top-right") {
        x = monitor.position.x + monitor.size.width - outerSize.width - margin;
        y = monitor.position.y + margin;
      } else if (corner === "bottom-left") {
        x = monitor.position.x + margin;
        y = monitor.position.y + monitor.size.height - outerSize.height - margin;
      } else if (corner === "bottom-right") {
        x = monitor.position.x + monitor.size.width - outerSize.width - margin;
        y = monitor.position.y + monitor.size.height - outerSize.height - margin;
      } else if (corner === "center") {
        x = monitor.position.x + Math.round((monitor.size.width - outerSize.width) / 2);
        y = monitor.position.y + Math.round((monitor.size.height - outerSize.height) / 2);
      }

      await appWindow.setPosition(new PhysicalPosition(x, y));
    } catch (err) {
      console.error("Window alignment error:", err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (snapMenuRef.current && !snapMenuRef.current.contains(e.target as Node)) {
        setIsSnapMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const unlisten = listen<WindowInfo>("active-window", (event) => {
      const name = event.payload.app_name;
      if (name && !["flowkey", "flowkey_lib", "tauri"].includes(name.toLowerCase())) {
        setActiveWindow(event.payload);
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  useEffect(() => {
    const unlisten = listen<WindowInfo>("active-window-icon", (event) => {
      setActiveWindow((prev) => {
        if (prev && prev.process_id === event.payload.process_id) {
          return { ...prev, icon_base64: event.payload.icon_base64 };
        }
        return prev;
      });
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  useEffect(() => {
    const unlisten = listen<ModifierPayload>("global-modifiers", (event) => {
      setActiveCodes((prev) => {
        const next = new Set(prev);
        const modifierCodes = [
          "Cmd", "Option", "Shift", "Control", "MetaLeft", "MetaRight", 
          "AltLeft", "AltRight", "ControlLeft", "ControlRight", 
          "ShiftLeft", "ShiftRight", "CapsLock", "COMMAND", "OPTION", "SHIFT", "CTRL"
        ];
        modifierCodes.forEach((code) => next.delete(code));
        event.payload.modifiers.forEach((m) => next.add(m));
        return next;
      });
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.target instanceof HTMLInputElement && e.key.length === 1 && !e.metaKey && !e.altKey && !e.ctrlKey) return;

      setActiveCodes((prev) => {
        const next = new Set(prev);
        next.add(e.code);
        if (e.key.length === 1) next.add(e.key.toUpperCase());
        return next;
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setActiveCodes((prev) => {
        const next = new Set(prev);
        next.delete(e.code);
        if (e.key.length === 1) next.delete(e.key.toUpperCase());
        return next;
      });
    };

    const handleReset = () => setActiveCodes(new Set());

    window.addEventListener("keydown", (e) => handleKeyDown(e));
    window.addEventListener("keyup", (e) => handleKeyUp(e));
    window.addEventListener("blur", handleReset);
    document.addEventListener("visibilitychange", handleReset);

    return () => {
      window.removeEventListener("keydown", (e) => handleKeyDown(e));
      window.removeEventListener("keyup", (e) => handleKeyUp(e));
      window.removeEventListener("blur", handleReset);
      document.removeEventListener("visibilitychange", handleReset);
    };
  }, []);

  useEffect(() => {
    if (activeWindow?.app_name) {
      const appName = activeWindow.app_name;
      
      if (shortcutCache.current[appName]) {
        setShortcuts(shortcutCache.current[appName]);
        setIsLoading(false);
      } else {
        setIsLoading(true);
        setShortcuts([]); 
      }

      const rawAppName = appName.replace(/\.app$/i, "").toLowerCase().trim();
      const normalizedKey = rawAppName.replace(/[\s_]+/g, "_");

      invoke<ShortcutItem[]>("get_active_app_shortcuts", { appName })
        .then((nativeItems) => {
          const nativeList = nativeItems || [];
          const canvasItems = CANVAS_FALLBACKS[normalizedKey] || [];
          const combined = [...canvasItems];
          
          for (const item of nativeList) {
            const exists = combined.some(
              (c) => c.description.toLowerCase() === item.description.toLowerCase() && c.keys.join("+") === item.keys.join("+")
            );
            if (!exists) combined.push(item);
          }
          
          shortcutCache.current[appName] = combined; 
          setShortcuts(combined);
        })
        .catch(() => {
          const fallbacks = CANVAS_FALLBACKS[normalizedKey] || [];
          shortcutCache.current[appName] = fallbacks;
          setShortcuts(fallbacks);
        })
        .finally(() => setIsLoading(false));
    }
  }, [activeWindow?.app_name]);

  const handleClose = async () => { await getCurrentWindow().hide(); };

  const appName = activeWindow?.app_name?.replace(/\.app$/i, "") || "App";
  const normalizedActive = Array.from(activeCodes).map(normalizeKey);

  const queryTerms = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const synonyms = queryTerms.flatMap((term) => SYNONYM_MAP[term] || []);

  const primaryShortcuts = shortcuts.filter((item) => {
    if (normalizedActive.length > 0) {
      const itemKeysNormalized = item.keys.map(normalizeKey);
      if (!normalizedActive.every((activeKey) => itemKeysNormalized.includes(activeKey))) {
        return false;
      }
    }
    if (queryTerms.length === 0) return true;

    const desc = item.description.toLowerCase();
    const cat = item.category.toLowerCase();
    const keys = item.keys.join(" ").toLowerCase();

    return queryTerms.some((t) => desc.includes(t) || cat.includes(t) || keys.includes(t));
  });

  const secondaryShortcuts = queryTerms.length > 0 ? shortcuts.filter((item) => {
    const isPrimary = primaryShortcuts.some(
      (p) => p.description === item.description && p.category === item.category
    );
    if (isPrimary) return false;

    if (normalizedActive.length > 0) {
      const itemKeysNormalized = item.keys.map(normalizeKey);
      if (!normalizedActive.every((activeKey) => itemKeysNormalized.includes(activeKey))) {
        return false;
      }
    }

    const desc = item.description.toLowerCase();
    const cat = item.category.toLowerCase();

    const matchesSynonym = synonyms.some((syn) => desc.includes(syn) || cat.includes(syn));
    const primaryCategories = new Set(primaryShortcuts.map((p) => p.category));
    const sharesCategory = primaryCategories.has(item.category);

    return matchesSynonym || sharesCategory;
  }) : [];

  const groupedPrimary = primaryShortcuts.reduce<Record<string, ShortcutItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  // Apply the sorting logic here before rendering
  const sortedGroupedPrimary = Object.entries(groupedPrimary).sort(([catA], [catB]) => {
    return getCategoryWeight(catA) - getCategoryWeight(catB);
  });

  const isKeyCapPressed = (keyLabel: string) => {
    const norm = normalizeKey(keyLabel);
    return normalizedActive.includes(norm);
  };

  return (
    <div className="hud-container">
      <header data-tauri-drag-region className="titlebar">
        
        <div className="app-badge">
          {activeWindow?.icon_base64 ? (
            <img 
              src={`data:image/png;base64,${activeWindow.icon_base64}`} 
              alt={`${appName} icon`}
              style={{ width: 24, height: 24, borderRadius: 6, objectFit: "contain" }}
            />
          ) : (
            <span className="app-indicator" />
          )}
          <span className="app-badge-name">{appName}</span>
        </div>

        <div className="header-actions">
          <button
            className="window-btn theme-toggle-btn"
            title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
            onClick={toggleTheme}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          <div className="snap-dropdown-wrapper" ref={snapMenuRef}>
            <button
              className="window-btn snap-toggle-btn"
              title="Screen Alignment"
              onClick={() => setIsSnapMenuOpen(!isSnapMenuOpen)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 2h4.5v1.5H3.5V6H2V2z"/>
                <path d="M14 2h-4.5v1.5h2.5V6H14V2z"/>
                <path d="M2 14h4.5v-1.5H3.5V10H2v4z"/>
                <path d="M14 14h-4.5v-1.5h2.5V10H14v4z"/>
                <circle cx="8" cy="8" r="1.5"/>
              </svg>
            </button>
            {isSnapMenuOpen && (
              <div className="snap-menu">
                <button onClick={() => { snapToCorner("top-left"); setIsSnapMenuOpen(false); }}>
                  Top Left <span>↖</span>
                </button>
                <button onClick={() => { snapToCorner("top-right"); setIsSnapMenuOpen(false); }}>
                  Top Right <span>↗</span>
                </button>
                <button onClick={() => { snapToCorner("bottom-left"); setIsSnapMenuOpen(false); }}>
                  Bottom Left <span>↙</span>
                </button>
                <button onClick={() => { snapToCorner("bottom-right"); setIsSnapMenuOpen(false); }}>
                  Bottom Right <span>↘</span>
                </button>
                <div className="snap-menu-divider" />
                <button onClick={() => { snapToCorner("center"); setIsSnapMenuOpen(false); }}>
                  Center Screen <span>•</span>
                </button>
              </div>
            )}
          </div>
          <button className="window-btn close-btn" onClick={handleClose}>✕</button>
        </div>
      </header>

      <main className="content">
        <VirtualKeyboard activeCodes={activeCodes} />

        <div className="search-bar-wrapper">
          <div className="search-input-inner">
            <span className="search-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder={`Search ${appName} shortcuts...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="shortcut-list">
          {isLoading ? (
            <div className="empty-shortcuts"><p>Extracting shortcuts for {appName}...</p></div>
          ) : sortedGroupedPrimary.length > 0 || secondaryShortcuts.length > 0 ? (
            <>
              {/* Map over the sorted array instead of the raw object entries */}
              {sortedGroupedPrimary.map(([category, items]) => (
                <div key={category} className="category-group">
                  <div className="category-header">{category}</div>
                  <div className="shortcut-grid">
                    {items.map((item, idx) => (
                      <div key={idx} className={`shortcut-row ${normalizedActive.length > 0 ? "active-cue-row" : ""}`}>
                        <span className="shortcut-desc" title={item.description}>{item.description}</span>
                        <div className="key-combo">
                          {item.keys.map((k, kIdx) => {
                            const active = isKeyCapPressed(k);
                            return (
                              <kbd key={kIdx} className={`key-cap ${active ? "key-cap-pressed" : ""}`}>
                                {k}
                              </kbd>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {secondaryShortcuts.length > 0 && (
                <div className="related-section">
                  <div className="related-header">
                    <span>✨ Related Suggestions</span>
                  </div>
                  <div className="shortcut-grid">
                    {secondaryShortcuts.map((item, idx) => (
                      <div key={idx} className="shortcut-row secondary-row">
                        <span className="shortcut-desc" title={item.description}>{item.description}</span>
                        <div className="key-combo">
                          {item.keys.map((k, kIdx) => {
                            const active = isKeyCapPressed(k);
                            return (
                              <kbd key={kIdx} className={`key-cap ${active ? "key-cap-pressed" : ""}`}>
                                {k}
                              </kbd>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="empty-shortcuts">
              <p>
                {normalizedActive.length > 0
                  ? `No matching shortcuts for ${Array.from(activeCodes).join(" + ")}`
                  : `No shortcuts detected for ${appName}`}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;