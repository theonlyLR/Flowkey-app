#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod watcher;

use serde::Serialize;
use std::path::Path;
use std::process::Command;
use tauri::{Manager, PhysicalPosition, Position, Window};
use tauri_plugin_global_shortcut::{
    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
};

#[derive(Serialize, Debug, Clone)]
pub struct ScrapedShortcut {
    pub description: String,
    pub keys: Vec<String>,
    pub category: String,
}

#[tauri::command]
fn check_accessibility_permission() -> bool {
    #[cfg(target_os = "macos")]
    {
        extern "C" {
            fn AXIsProcessTrusted() -> bool;
        }
        unsafe { AXIsProcessTrusted() }
    }
    #[cfg(not(target_os = "macos"))]
    {
        true
    }
}

#[tauri::command]
async fn snap_window(window: Window, position: String) -> Result<(), String> {
    if let Ok(Some(monitor)) = window.current_monitor() {
        let monitor_size = monitor.size();
        let monitor_pos = monitor.position();
        let window_size = window.outer_size().map_err(|e| e.to_string())?;

        let padding = 20;

        let (x, y) = match position.as_str() {
            "top-left" => (
                monitor_pos.x + padding,
                monitor_pos.y + padding,
            ),
            "top-right" => (
                monitor_pos.x + (monitor_size.width as i32) - (window_size.width as i32) - padding,
                monitor_pos.y + padding,
            ),
            "bottom-left" => (
                monitor_pos.x + padding,
                monitor_pos.y + (monitor_size.height as i32) - (window_size.height as i32) - padding,
            ),
            "bottom-right" => (
                monitor_pos.x + (monitor_size.width as i32) - (window_size.width as i32) - padding,
                monitor_pos.y + (monitor_size.height as i32) - (window_size.height as i32) - padding,
            ),
            _ => (monitor_pos.x + padding, monitor_pos.y + padding),
        };

        window
            .set_position(Position::Physical(PhysicalPosition { x, y }))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn is_system_noise(description: &str, category: &str) -> bool {
    let desc = description.to_lowercase();
    let cat = category.to_lowercase();

    if cat.contains("services") || cat.contains("speech") || cat.contains("substitutions") {
        return true;
    }

    if desc.starts_with("hide ")
        || desc == "hide others"
        || desc == "show all"
        || desc == "minimize"
        || desc == "zoom"
        || desc == "bring all to front"
        || desc.contains("dictation")
        || desc.contains("emoji & symbols")
        || desc == "services"
    {
        return true;
    }

    false
}

#[tauri::command]
fn get_active_app_shortcuts(app_name: String) -> Vec<ScrapedShortcut> {
    if app_name.is_empty() {
        return Vec::new();
    }

    #[cfg(target_os = "macos")]
    {
        let clean_name = app_name.replace(".app", "");

        let binary_path = if Path::new("src-tauri/bin/menu_scraper").exists() {
            "src-tauri/bin/menu_scraper".to_string()
        } else if Path::new("bin/menu_scraper").exists() {
            "bin/menu_scraper".to_string()
        } else {
            "./menu_scraper".to_string()
        };

        let output = Command::new(&binary_path)
            .arg(&clean_name)
            .output();

        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let mut result = Vec::new();

            for line in stdout.lines() {
                let parts: Vec<&str> = line.split("||").collect();
                if parts.len() == 3 {
                    let category = parts[0].trim().to_string();
                    let description = parts[1].trim().to_string();
                    let keys: Vec<String> = parts[2].split(',').map(|s| s.trim().to_string()).collect();

                    if is_system_noise(&description, &category) {
                        continue;
                    }

                    result.push(ScrapedShortcut {
                        description,
                        keys,
                        category,
                    });
                }
            }
            return result;
        }
    }

    Vec::new()
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Option + Space global hotkey
            let option_space = Shortcut::new(Some(Modifiers::ALT), Code::Space);

            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(move |app, shortcut_match, event| {
                        if shortcut_match == &option_space && event.state() == ShortcutState::Pressed {
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                    })
                    .build(),
            )?;

            app.global_shortcut().register(option_space)?;

            // Background watcher thread
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                watcher::start_watching(handle);
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_accessibility_permission,
            get_active_app_shortcuts,
            snap_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}