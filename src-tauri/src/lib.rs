use tauri::{Emitter, Manager};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            use tauri_plugin_deep_link::DeepLinkExt;
            let handle = app.handle().clone();

            // Deep link listener
            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    let _ = handle.emit("deep-link", url.to_string());
                }
            });

            // System tray - wrapped in result handling so failure doesn't crash app
            let tray_result = (|| -> tauri::Result<()> {
                let tray_menu = tauri::menu::Menu::with_items(
                    app,
                    &[
                        &tauri::menu::MenuItem::with_id(app, "show", "Show App", true, None::<&str>)?,
                        &tauri::menu::MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?,
                    ],
                )?;

                tauri::tray::TrayIconBuilder::new()
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
            })();

            // Log tray error but don't crash
            if let Err(e) = tray_result {
                eprintln!("Tray icon init failed (non-fatal): {}", e);
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
