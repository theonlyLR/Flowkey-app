use active_win_pos_rs::get_active_window;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[derive(Clone, serde::Serialize)]
pub struct WindowInfo {
    pub title: String,
    pub app_name: String,
    pub process_id: u32,
    pub icon_base64: Option<String>,
}

#[derive(Clone, serde::Serialize)]
pub struct ModifierPayload {
    pub modifiers: Vec<String>,
}

pub fn start_watching(app: AppHandle) {
    let mut last_pid = 0;
    let mut last_mods: Vec<String> = Vec::new();

    loop {
        if let Ok(active_window) = get_active_window() {
            if active_window.process_id != last_pid {
                last_pid = active_window.process_id;
                
                // 1. INSTANTLY emit the window change so React starts loading immediately
                let info = WindowInfo {
                    title: active_window.title.clone(),
                    app_name: active_window.app_name.clone(),
                    process_id: active_window.process_id as u32,
                    icon_base64: None,
                };
                let _ = app.emit("active-window", info.clone());
                
                #[cfg(target_os = "macos")]
                {
                    // 2. Fetch the icon in a BACKGROUND THREAD so we don't freeze the app
                    let app_clone = app.clone();
                    let pid_str = active_window.process_id.to_string();
                    
                    thread::spawn(move || {
                        let mut bin_path = std::env::current_dir().unwrap_or_default().join("src-tauri/swift/get_icon_binary");
                        if !bin_path.exists() {
                            bin_path = std::env::current_dir().unwrap_or_default().join("swift/get_icon_binary");
                        }

                        if let Ok(output) = std::process::Command::new(&bin_path).arg(pid_str).output() {
                            if output.status.success() {
                                let base64_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                                if !base64_str.is_empty() {
                                    let mut icon_info = info;
                                    icon_info.icon_base64 = Some(base64_str);
                                    // Emit a secondary event just for the icon popping in
                                    let _ = app_clone.emit("active-window-icon", icon_info);
                                }
                            }
                        }
                    });
                }
            }
        }

        #[cfg(target_os = "macos")]
        {
            let current_mods = get_macos_modifiers();
            if current_mods != last_mods {
                last_mods = current_mods.clone();
                let _ = app.emit("global-modifiers", ModifierPayload { modifiers: current_mods });
            }
        }

        thread::sleep(Duration::from_millis(40));
    }
}

#[cfg(target_os = "macos")]
fn get_macos_modifiers() -> Vec<String> {
    let mut mods = Vec::new();

    const K_CG_EVENT_SOURCE_STATE_HID_SYSTEM_STATE: i32 = 1;
    const K_CG_EVENT_SOURCE_STATE_COMBINED_SESSION_STATE: i32 = 0;

    const K_CG_EVENT_FLAG_MASK_COMMAND: u64 = 0x00100000;
    const K_CG_EVENT_FLAG_MASK_ALTERNATE: u64 = 0x00080000;
    const K_CG_EVENT_FLAG_MASK_SHIFT: u64 = 0x00020000;
    const K_CG_EVENT_FLAG_MASK_CONTROL: u64 = 0x00040000;

    extern "C" {
        fn CGEventSourceFlagsState(state_id: i32) -> u64;
    }

    unsafe {
        let mut flags = CGEventSourceFlagsState(K_CG_EVENT_SOURCE_STATE_HID_SYSTEM_STATE);
        if flags == 0 {
            flags = CGEventSourceFlagsState(K_CG_EVENT_SOURCE_STATE_COMBINED_SESSION_STATE);
        }

        if (flags & K_CG_EVENT_FLAG_MASK_COMMAND) != 0 {
            mods.push("Cmd".to_string());
        }
        if (flags & K_CG_EVENT_FLAG_MASK_ALTERNATE) != 0 {
            mods.push("Option".to_string());
        }
        if (flags & K_CG_EVENT_FLAG_MASK_SHIFT) != 0 {
            mods.push("Shift".to_string());
        }
        if (flags & K_CG_EVENT_FLAG_MASK_CONTROL) != 0 {
            mods.push("Control".to_string());
        }
    }

    mods
}