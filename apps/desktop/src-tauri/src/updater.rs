use std::sync::Mutex;

use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_updater::{Update, UpdaterExt};

/// Actualización pendiente de confirmación del usuario.
pub struct PendingUpdate(pub Mutex<Option<Update>>);

/// Comprueba actualizaciones al arrancar sin bloquear la aplicación.
///
/// Cualquier fallo de red o del servicio se ignora: la app sigue funcionando.
pub fn spawn_check(app: &AppHandle) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let updater = match app.updater() {
            Ok(updater) => updater,
            Err(_) => return,
        };
        let update = match updater.check().await {
            Ok(Some(update)) => update,
            _ => return,
        };

        let version = update.version.clone();
        if let Ok(mut guard) = app.state::<PendingUpdate>().0.lock() {
            *guard = Some(update);
        }

        let dialog_app = app.clone();
        app.dialog()
            .message(format!(
                "Hay una versión nueva de TolochaRadio (v{version}). ¿Quieres descargarla e instalarla ahora?"
            ))
            .title("Actualización disponible")
            .kind(MessageDialogKind::Info)
            .buttons(MessageDialogButtons::OkCancelCustom(
                "Actualizar".to_string(),
                "Ahora no".to_string(),
            ))
            .show(move |confirmed| {
                if confirmed {
                    let app = dialog_app.clone();
                    tauri::async_runtime::spawn(async move {
                        install_pending(app).await;
                    });
                }
            });
    });
}

async fn install_pending(app: AppHandle) {
    let update = match app.state::<PendingUpdate>().0.lock() {
        Ok(mut guard) => guard.take(),
        Err(_) => None,
    };
    let Some(update) = update else {
        return;
    };

    if update
        .download_and_install(|_chunk, _total| {}, || {})
        .await
        .is_ok()
    {
        app.restart();
    }
}
