use tauri::menu::{IsMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{App, AppHandle, Manager, Wry};

use crate::bridge::{self, PlayerUpdate};
use crate::AppState;

const NO_STATION_TEXT: &str = "Ninguna emisora en reproducción";
const NO_FAVORITES_TEXT: &str = "Sin favoritos";

/// Qué atajos globales quedaron registrados. Solo se muestran en el menú los registrados.
#[derive(Clone, Copy, Debug, Default)]
pub struct ShortcutLabels {
    pub play_pause: bool,
    pub stop: bool,
    pub volume_up: bool,
    pub volume_down: bool,
    pub mute: bool,
}

/// Añade el atajo entre paréntesis solo si está registrado.
fn with_shortcut(text: &str, shortcut: &str, registered: bool) -> String {
    if registered {
        format!("{text} ({shortcut})")
    } else {
        text.to_string()
    }
}

pub fn build_tray(app: &App) -> tauri::Result<()> {
    let menu = build_menu(app.handle())?;

    let mut builder = TrayIconBuilder::with_id("main")
        .tooltip("TolochaRadio")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| handle_menu_event(app, event.id().as_ref()))
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_window(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder.build(app)?;
    Ok(())
}

/// Reconstruye el menú de la bandeja con el estado actual (emisora, volumen y favoritos).
pub fn refresh(app: &AppHandle) {
    let Some(tray) = app.tray_by_id("main") else {
        return;
    };
    if let Ok(menu) = build_menu(app) {
        let _ = tray.set_menu(Some(menu));
    }
}

fn build_menu(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    let state = app.state::<AppState>();
    let player = state
        .player
        .lock()
        .map(|guard| guard.clone())
        .unwrap_or_default();
    let favorites = state
        .favorites
        .lock()
        .map(|guard| guard.clone())
        .unwrap_or_default();
    let shortcuts = state.shortcuts.lock().map(|guard| *guard).unwrap_or_default();

    let show_hide = MenuItem::with_id(
        app,
        "toggle_window",
        "Mostrar u ocultar ventana",
        true,
        None::<&str>,
    )?;

    let player_menu = build_player_submenu(app, &player, shortcuts)?;

    let explore = MenuItem::with_id(app, "nav:/explorar", "Explorar", true, None::<&str>)?;
    let history = MenuItem::with_id(app, "nav:/historial", "Historial", true, None::<&str>)?;
    let stats = MenuItem::with_id(app, "nav:/estadisticas", "Estadísticas", true, None::<&str>)?;
    let favorites_menu = build_favorites_submenu(app, &favorites)?;

    let separator_top = PredefinedMenuItem::separator(app)?;
    let separator_bottom = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;

    Menu::with_items(
        app,
        &[
            &show_hide,
            &separator_top,
            &player_menu,
            &explore,
            &favorites_menu,
            &history,
            &stats,
            &separator_bottom,
            &quit,
        ],
    )
}

/// Submenú de la emisora en reproducción: controles, volumen y silencio.
fn build_player_submenu(
    app: &AppHandle,
    player: &PlayerUpdate,
    shortcuts: ShortcutLabels,
) -> tauri::Result<Submenu<Wry>> {
    let has_station = player.has_station();
    let title = match player.name.as_deref().filter(|name| !name.trim().is_empty()) {
        Some(name) if has_station => name.to_string(),
        _ if has_station => "Emisora en reproducción".to_string(),
        _ => NO_STATION_TEXT.to_string(),
    };

    let play_text = if player.is_playing { "Pausar" } else { "Reproducir" };
    let play = MenuItem::with_id(
        app,
        "player_toggle",
        with_shortcut(play_text, "Ctrl+Alt+P", shortcuts.play_pause),
        has_station,
        None::<&str>,
    )?;
    let stop = MenuItem::with_id(
        app,
        "player_stop",
        with_shortcut("Detener", "Ctrl+Alt+S", shortcuts.stop),
        has_station,
        None::<&str>,
    )?;
    let separator = PredefinedMenuItem::separator(app)?;
    let volume_up = MenuItem::with_id(
        app,
        "player_volume_up",
        with_shortcut("Subir volumen", "Ctrl+Alt+↑", shortcuts.volume_up),
        has_station,
        None::<&str>,
    )?;
    let volume_down = MenuItem::with_id(
        app,
        "player_volume_down",
        with_shortcut("Bajar volumen", "Ctrl+Alt+↓", shortcuts.volume_down),
        has_station,
        None::<&str>,
    )?;
    let mute_text = if player.muted {
        "Reactivar sonido"
    } else {
        "Silenciar"
    };
    let mute = MenuItem::with_id(
        app,
        "player_mute",
        with_shortcut(mute_text, "Ctrl+Alt+M", shortcuts.mute),
        has_station,
        None::<&str>,
    )?;
    let volume_percent = (player.volume * 100.0).round();
    let volume_text = if player.muted {
        format!("Volumen: {volume_percent} % (silenciado)")
    } else {
        format!("Volumen: {volume_percent} %")
    };
    let volume_info = MenuItem::with_id(app, "player_volume_info", volume_text, false, None::<&str>)?;

    let items: [&dyn IsMenuItem<Wry>; 7] = [
        &play,
        &stop,
        &separator,
        &volume_up,
        &volume_down,
        &mute,
        &volume_info,
    ];
    Submenu::with_id_and_items(app, "player_menu", title, has_station, &items)
}

/// Submenú de favoritos: acceso a la sección y una entrada por emisora.
fn build_favorites_submenu(
    app: &AppHandle,
    favorites: &[bridge::FavoriteItem],
) -> tauri::Result<Submenu<Wry>> {
    let open_favorites = MenuItem::with_id(
        app,
        "nav:/favoritos",
        "Abrir favoritos",
        true,
        None::<&str>,
    )?;
    let separator = PredefinedMenuItem::separator(app)?;

    let station_items: Vec<MenuItem<Wry>> = favorites
        .iter()
        .map(|favorite| {
            MenuItem::with_id(
                app,
                format!("fav:{}", favorite.id),
                favorite.name.as_str(),
                true,
                None::<&str>,
            )
        })
        .collect::<tauri::Result<_>>()?;

    let empty_text = MenuItem::with_id(
        app,
        "favorites_empty",
        NO_FAVORITES_TEXT,
        false,
        None::<&str>,
    )?;

    let mut items: Vec<&dyn IsMenuItem<Wry>> = vec![&open_favorites, &separator];
    if station_items.is_empty() {
        items.push(&empty_text);
    } else {
        for item in &station_items {
            items.push(item);
        }
    }

    Submenu::with_id_and_items(app, "favorites_menu", "Favoritos", true, &items)
}

fn handle_menu_event(app: &AppHandle, id: &str) {
    match id {
        "toggle_window" => toggle_window(app),
        "player_toggle" => bridge::emit_command(app, bridge::action_command("toggle")),
        "player_stop" => bridge::emit_command(app, bridge::action_command("stop")),
        "player_volume_up" => bridge::emit_command(app, bridge::action_command("volume_up")),
        "player_volume_down" => bridge::emit_command(app, bridge::action_command("volume_down")),
        "player_mute" => bridge::emit_command(app, bridge::action_command("mute_toggle")),
        "quit" => app.exit(0),
        other => {
            if let Some(path) = other.strip_prefix("nav:") {
                show_window(app);
                bridge::emit_navigate(app, path);
            } else if let Some(station_id) = other.strip_prefix("fav:") {
                bridge::emit_command(app, bridge::play_station_command(station_id));
            }
        }
    }
}

fn show_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

pub fn toggle_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let visible = window.is_visible().unwrap_or(false);
    if visible {
        let _ = window.hide();
    } else {
        show_window(app);
    }
}

/// Actualiza la información del icono de bandeja con la emisora en curso.
pub fn update_tooltip(app: &AppHandle, station: Option<&str>) {
    if let Some(tray) = app.tray_by_id("main") {
        let tooltip = match station {
            Some(name) if !name.trim().is_empty() => format!("TolochaRadio — {name}"),
            _ => "TolochaRadio".to_string(),
        };
        let _ = tray.set_tooltip(Some(tooltip));
    }
}
