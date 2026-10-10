use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{App, AppHandle, Manager};

use crate::bridge::{emit_command, stop_command, toggle_command};

pub fn build_tray(app: &App) -> tauri::Result<()> {
    let show_hide = MenuItem::with_id(
        app,
        "toggle_window",
        "Mostrar u ocultar ventana",
        true,
        None::<&str>,
    )?;
    let play_pause = MenuItem::with_id(
        app,
        "play_pause",
        "Reproducir / Pausar (Ctrl+Alt+P)",
        true,
        None::<&str>,
    )?;
    let stop = MenuItem::with_id(app, "stop", "Detener (Ctrl+Alt+S)", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_hide, &play_pause, &stop, &separator, &quit])?;

    let mut builder = TrayIconBuilder::with_id("main")
        .tooltip("TolochaRadio")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "toggle_window" => toggle_window(app),
            "play_pause" => emit_command(app, toggle_command()),
            "stop" => emit_command(app, stop_command()),
            "quit" => app.exit(0),
            _ => {}
        })
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

/// Menú de la aplicación, con las acciones del reproductor y sus atajos.
pub fn build_app_menu(app: &AppHandle) -> tauri::Result<()> {
    let play_pause = MenuItem::with_id(
        app,
        "menu_play_pause",
        "Reproducir / Pausar (Ctrl+Alt+P)",
        true,
        None::<&str>,
    )?;
    let stop = MenuItem::with_id(
        app,
        "menu_stop",
        "Detener (Ctrl+Alt+S)",
        true,
        None::<&str>,
    )?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "menu_quit", "Salir", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&play_pause, &stop, &separator, &quit])?;

    app.set_menu(menu)?;
    app.on_menu_event(|app, event| match event.id().as_ref() {
        "menu_play_pause" => emit_command(app, toggle_command()),
        "menu_stop" => emit_command(app, stop_command()),
        "menu_quit" => app.exit(0),
        _ => {}
    });

    Ok(())
}

pub fn toggle_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let visible = window.is_visible().unwrap_or(false);
    if visible {
        let _ = window.hide();
    } else {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
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
