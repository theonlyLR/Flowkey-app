use active_win_pos_rs::get_active_window;
use serde::Serialize;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize)]
pub struct WindowInfo {
    pub title: String,
    pub app_name: String,
}

pub fn start_active_window_watcher(app: AppHandle) {
    thread::spawn(move || {
        let mut last_app = String::new();
        loop {
            if let Ok(active_window) = get_active_window() {
                if active_window.app_name != last_app {
                    last_app = active_window.app_name.clone();
                    let info = WindowInfo {
                        title: active_window.title,
                        app_name: active_window.app_name,
                    };
                    let _ = app.emit("active-window-changed", info);
                }
            }
            thread::sleep(Duration::from_millis(500));
        }
    });
}