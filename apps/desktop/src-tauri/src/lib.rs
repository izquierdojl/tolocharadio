mod bridge;
mod media;
mod server;
mod tray;
mod updater;

use std::sync::{Arc, Mutex};

use tauri::{Listener, Manager, WindowEvent};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_store::StoreExt;
use url::Url;

use server::{check_health, normalize_server_url};

const STORE_FILE: &str = "settings.json";
const SERVER_KEY: &str = "server_url";

pub struct AppState {
    pub server: Arc<Mutex<Option<Url>>>,
    pub player: Mutex<bridge::PlayerUpdate>,
    pub media: media::MediaSender,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct StatusPayload {
    configured: bool,
    server_url: Option<String>,
    shell_version: String,
}

#[tauri::command]
fn get_status(app: tauri::AppHandle, state: tauri::State<'_, AppState>) -> StatusPayload {
    let server = state.server.lock().ok().and_then(|guard| guard.clone());
    StatusPayload {
        configured: server.is_some(),
        server_url: server.map(|url| url.to_string()),
        shell_version: app.package_info().version.to_string(),
    }
}

#[tauri::command]
fn save_server_url(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    url: String,
) -> Result<String, String> {
    let normalized = normalize_server_url(&url)?;
    let store = app
        .store(STORE_FILE)
        .map_err(|_| "No se pudo guardar la configuración".to_string())?;
    store.set(SERVER_KEY.to_string(), serde_json::json!(normalized.as_str()));
    store
        .save()
        .map_err(|_| "No se pudo guardar la configuración".to_string())?;
    if let Ok(mut guard) = state.server.lock() {
        *guard = Some(normalized.clone());
    }
    Ok(normalized.to_string())
}

#[tauri::command]
fn clear_server_url(app: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let store = app
        .store(STORE_FILE)
        .map_err(|_| "No se pudo guardar la configuración".to_string())?;
    store.set(SERVER_KEY.to_string(), serde_json::Value::Null);
    store
        .save()
        .map_err(|_| "No se pudo guardar la configuración".to_string())?;
    if let Ok(mut guard) = state.server.lock() {
        *guard = None;
    }
    Ok(())
}

#[tauri::command]
async fn connect(app: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let server = state
        .server
        .lock()
        .ok()
        .and_then(|guard| guard.clone())
        .ok_or_else(|| "No hay ningún servidor configurado".to_string())?;

    check_health(&server).await?;

    if let Some(window) = app.get_webview_window("main") {
        window
            .navigate(server)
            .map_err(|_| "No se pudo abrir el servidor".to_string())?;
    }
    Ok(())
}

fn load_server(app: &tauri::AppHandle) -> Option<Url> {
    let store = app.store(STORE_FILE).ok()?;
    let value = store.get(SERVER_KEY)?;
    let raw = value.as_str()?;
    Url::parse(raw).ok()
}

/// Páginas locales del shell (pantalla de configuración y de error).
fn is_local_url(url: &Url) -> bool {
    match url.scheme() {
        "tauri" => true,
        "http" | "https" => matches!(
            url.host_str(),
            Some("localhost") | Some("127.0.0.1") | Some("tauri.localhost")
        ),
        _ => false,
    }
}

fn register_shortcuts(app: &tauri::AppHandle) {
    // En Wayland u otros entornos sin soporte puede fallar: no es bloqueante.
    let _ = app
        .global_shortcut()
        .register(Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyP));
    let _ = app
        .global_shortcut()
        .register(Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyS));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let server: Arc<Mutex<Option<Url>>> = Arc::new(Mutex::new(None));

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state != ShortcutState::Pressed {
                        return;
                    }
                    if shortcut.matches(Modifiers::CONTROL | Modifiers::ALT, Code::KeyP) {
                        bridge::emit_command(app, bridge::toggle_command());
                    } else if shortcut.matches(Modifiers::CONTROL | Modifiers::ALT, Code::KeyS) {
                        bridge::emit_command(app, bridge::stop_command());
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            get_status,
            save_server_url,
            clear_server_url,
            connect
        ])
        .setup(move |app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            let loaded = load_server(app.handle());
            if let Ok(mut guard) = server.lock() {
                *guard = loaded;
            }

            app.manage(AppState {
                server: server.clone(),
                player: Mutex::new(bridge::PlayerUpdate::default()),
                media: media::spawn(app.handle()),
            });
            app.manage(updater::PendingUpdate(Mutex::new(None)));

            let navigation_app = app.handle().clone();
            let navigation_server = server.clone();
            tauri::WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::App("index.html".into()),
            )
            .title("TolochaRadio")
            .inner_size(1100.0, 720.0)
            .min_inner_size(420.0, 480.0)
            .on_navigation(move |url| {
                if is_local_url(url) {
                    return true;
                }
                let allowed = navigation_server
                    .lock()
                    .ok()
                    .and_then(|guard| guard.clone())
                    .map(|configured| server::same_origin(url, &configured))
                    .unwrap_or(false);
                if allowed {
                    true
                } else {
                    // Enlaces externos: se abren en el navegador del sistema.
                    let _ = navigation_app.opener().open_url(url.as_str(), None::<&str>);
                    false
                }
            })
            .build()?;

            tray::build_tray(app)?;
            tray::build_app_menu(app.handle())?;
            register_shortcuts(app.handle());

            let player_app = app.handle().clone();
            app.listen("player:update", move |event| {
                let state = player_app.state::<AppState>();
                let server = state.server.lock().ok().and_then(|guard| guard.clone());
                if !bridge::caller_is_server(&player_app, &server) {
                    return;
                }
                let update: bridge::PlayerUpdate =
                    match serde_json::from_str(event.payload()) {
                        Ok(update) => update,
                        Err(_) => return,
                    };
                tray::update_tooltip(&player_app, update.name.as_deref());
                state.media.send(media::MediaCmd::Update(update.clone()));
                if let Ok(mut guard) = state.player.lock() {
                    *guard = update;
                }
            });

            let external_app = app.handle().clone();
            app.listen("external:open", move |event| {
                let state = external_app.state::<AppState>();
                let server = state.server.lock().ok().and_then(|guard| guard.clone());
                if !bridge::caller_is_server(&external_app, &server) {
                    return;
                }
                let payload: serde_json::Value = match serde_json::from_str(event.payload()) {
                    Ok(payload) => payload,
                    Err(_) => return,
                };
                let Some(url) = payload.get("url").and_then(|value| value.as_str()) else {
                    return;
                };
                if url.starts_with("http://") || url.starts_with("https://") {
                    let _ = external_app.opener().open_url(url, None::<&str>);
                }
            });

            let ready_app = app.handle().clone();
            app.listen("desktop:ready", move |_event| {
                let state = ready_app.state::<AppState>();
                let server = state.server.lock().ok().and_then(|guard| guard.clone());
                if bridge::caller_is_server(&ready_app, &server) {
                    bridge::emit_desktop_info(&ready_app);
                }
            });

            updater::spawn_check(app.handle());

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error al arrancar TolochaRadio");
}
