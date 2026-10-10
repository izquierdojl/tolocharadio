use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use url::Url;

use crate::server::same_origin;

/// Estado del reproductor publicado por la interfaz web (evento `player:update`).
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct PlayerUpdate {
    pub station_id: Option<String>,
    pub name: Option<String>,
    pub favicon: Option<String>,
    pub is_playing: bool,
    pub is_buffering: bool,
    pub volume: f64,
}

impl PlayerUpdate {
    pub fn has_station(&self) -> bool {
        self.station_id.is_some()
    }
}

/// Comando de reproducción enviado a la interfaz web (evento `player:command`).
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerCommand {
    pub action: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<f64>,
}

pub fn toggle_command() -> PlayerCommand {
    PlayerCommand {
        action: "toggle",
        value: None,
    }
}

pub fn stop_command() -> PlayerCommand {
    PlayerCommand {
        action: "stop",
        value: None,
    }
}

pub fn emit_command(app: &AppHandle, command: PlayerCommand) {
    let _ = app.emit_to("main", "player:command", command);
}

/// Informa a la interfaz de la versión del cliente de escritorio.
pub fn emit_desktop_info(app: &AppHandle) {
    let info = serde_json::json!({
        "version": app.package_info().version.to_string(),
        "appName": "TolochaRadio",
    });
    let _ = app.emit_to("main", "desktop:info", info);
}

/// Valida que la webview que habla con el shell es el servidor configurado.
pub fn caller_is_server(app: &AppHandle, server: &Option<Url>) -> bool {
    let Some(server) = server else {
        return false;
    };
    let Some(window) = app.get_webview_window("main") else {
        return false;
    };
    match window.url() {
        Ok(current) => same_origin(&current, server),
        Err(_) => false,
    }
}
