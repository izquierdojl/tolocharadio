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
    pub favorites: Mutex<Vec<bridge::FavoriteItem>>,
    pub shortcuts: Mutex<tray::ShortcutLabels>,
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

/// Registra los atajos globales y devuelve cuáles quedaron disponibles.
///
/// En Wayland u otros entornos sin soporte el registro puede fallar: no es bloqueante
/// y la acción sigue disponible desde la bandeja, sin mostrar el atajo.
fn register_shortcuts(app: &tauri::AppHandle) -> tray::ShortcutLabels {
    let ctrl_alt = Some(Modifiers::CONTROL | Modifiers::ALT);
    let register = |code: Code| {
        app.global_shortcut()
            .register(Shortcut::new(ctrl_alt, code))
            .is_ok()
    };
    tray::ShortcutLabels {
        play_pause: register(Code::KeyP),
        stop: register(Code::KeyS),
        volume_up: register(Code::ArrowUp),
        volume_down: register(Code::ArrowDown),
        mute: register(Code::KeyM),
    }
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
                    let ctrl_alt = Modifiers::CONTROL | Modifiers::ALT;
                    let action = if shortcut.matches(ctrl_alt, Code::KeyP) {
                        "toggle"
                    } else if shortcut.matches(ctrl_alt, Code::KeyS) {
                        "stop"
                    } else if shortcut.matches(ctrl_alt, Code::ArrowUp) {
                        "volume_up"
                    } else if shortcut.matches(ctrl_alt, Code::ArrowDown) {
                        "volume_down"
                    } else if shortcut.matches(ctrl_alt, Code::KeyM) {
                        "mute_toggle"
                    } else {
                        return;
                    };
                    bridge::emit_command(app, bridge::action_command(action));
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
                favorites: Mutex::new(Vec::new()),
                shortcuts: Mutex::new(tray::ShortcutLabels::default()),
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

            let labels = register_shortcuts(app.handle());
            if let Ok(mut guard) = app.state::<AppState>().shortcuts.lock() {
                *guard = labels;
            }
            tray::build_tray(app)?;

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
                };
                tray::refresh(&player_app);
            });

            let favorites_app = app.handle().clone();
            app.listen("desktop:favorites", move |event| {
                let state = favorites_app.state::<AppState>();
                let server = state.server.lock().ok().and_then(|guard| guard.clone());
                if !bridge::caller_is_server(&favorites_app, &server) {
                    return;
                }
                let update: bridge::FavoritesUpdate = match serde_json::from_str(event.payload()) {
                    Ok(update) => update,
                    Err(_) => return,
                };
                if let Ok(mut guard) = state.favorites.lock() {
                    *guard = update.items;
                }
                tray::refresh(&favorites_app);
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
