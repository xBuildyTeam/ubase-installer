use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            let handle = app.handle().clone();
            
            // Register deep link listener / trigger check
            app.deep_link().on_open_url(move |urls| {
                for url in urls {
                    let url_str = url.to_string();
                    let _ = handle.emit("deep-link", url_str);
                }
            });

            // Create a System Tray / Status Tray
            let tray_menu = tauri::menu::Menu::with_items(
                app,
                &[
                    &tauri::menu::MenuItem::with_id(app, "show", "Show App", true, None::<&str>)?,
                    &tauri::menu::MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?,
                ],
            )?;

            let _tray = tauri::tray::TrayIconBuilder::new()
                .menu(&tray_menu)
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(|app_handle, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app_handle.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app_handle.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
