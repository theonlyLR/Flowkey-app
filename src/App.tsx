import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";

interface WindowInfo {
  title: string;
  app_name: string;
  process_id: number;
}

function App() {
  const [activeWindow, setActiveWindow] = useState<WindowInfo | null>(null);

  useEffect(() => {
    const unlisten = listen<WindowInfo>("active-window", (event) => {
      setActiveWindow(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleClose = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.close();
  };

  return (
    <div className="hud-container">
      {/* data-tauri-drag-region tells Tauri this header moves the window */}
      <header data-tauri-drag-region className="titlebar">
        <span data-tauri-drag-region className="titlebar-label">
          FLOWKEY
        </span>
        <button className="close-btn" onClick={handleClose} title="Close HUD">
          ✕
        </button>
      </header>

      {/* Main HUD Body */}
      <main className="content">
        {activeWindow ? (
          <div className="window-card">
            <span className="app-name">{activeWindow.app_name}</span>
            <p className="window-title">{activeWindow.title}</p>
          </div>
        ) : (
          <p className="loading">Focus any window to track...</p>
        )}
      </main>
    </div>
  );
}

export default App;