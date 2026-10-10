#[cfg(any(target_os = "linux", target_os = "windows"))]
mod imp {
    use std::sync::mpsc::{self, Receiver, Sender};
    use std::sync::Mutex;

    use souvlaki::{MediaControlEvent, MediaControls, MediaMetadata, MediaPlayback, PlatformConfig};
    use tauri::AppHandle;

    use crate::bridge::{self, PlayerUpdate};

    pub enum MediaCmd {
        Update(PlayerUpdate),
    }

    /// Envío de actualizaciones al hilo que posee los controles multimedia.
    pub struct MediaSender(Mutex<Sender<MediaCmd>>);

    impl MediaSender {
        pub fn send(&self, cmd: MediaCmd) {
            if let Ok(sender) = self.0.lock() {
                let _ = sender.send(cmd);
            }
        }
    }

    /// Crea los controles multimedia en un hilo propio.
    ///
    /// El hilo es el dueño de `MediaControls` (evita requisitos de `Send` sobre la
    /// estructura) y consume las actualizaciones de estado que llegan por canal.
    pub fn spawn(app: &AppHandle) -> MediaSender {
        let (sender, receiver) = mpsc::channel::<MediaCmd>();
        let app = app.clone();
        std::thread::Builder::new()
            .name("tolocha-media".to_string())
            .spawn(move || run(app, receiver))
            .expect("no se pudo crear el hilo de controles multimedia");
        MediaSender(Mutex::new(sender))
    }

    fn run(app: AppHandle, receiver: Receiver<MediaCmd>) {
        let config = PlatformConfig {
            display_name: "TolochaRadio",
            dbus_name: "tolocharadio",
            hwnd: platform_hwnd(&app),
        };

        let mut controls = match MediaControls::new(config) {
            Ok(controls) => controls,
            Err(_) => return,
        };

        let command_app = app.clone();
        if controls
            .attach(move |event| on_media_event(&command_app, event))
            .is_err()
        {
            return;
        }

        let mut last_playing: Option<bool> = None;
        while let Ok(cmd) = receiver.recv() {
            match cmd {
                MediaCmd::Update(update) => apply(&mut controls, &update, &mut last_playing),
            }
        }
    }

    fn on_media_event(app: &AppHandle, event: MediaControlEvent) {
        match event {
            MediaControlEvent::Play | MediaControlEvent::Pause | MediaControlEvent::Toggle => {
                bridge::emit_command(app, bridge::toggle_command());
            }
            MediaControlEvent::Stop => {
                bridge::emit_command(app, bridge::stop_command());
            }
            _ => {}
        }
    }

    fn apply(controls: &mut MediaControls, update: &PlayerUpdate, last_playing: &mut Option<bool>) {
        let title = update.name.as_deref().unwrap_or("TolochaRadio");
        let cover = update
            .favicon
            .as_deref()
            .filter(|url| url.starts_with("http://") || url.starts_with("https://"));

        let _ = controls.set_metadata(MediaMetadata {
            title: Some(title),
            artist: Some("TolochaRadio"),
            album: None,
            cover_url: cover,
            duration: None,
        });

        let playback = if update.is_playing {
            MediaPlayback::Playing { progress: None }
        } else if update.has_station() {
            MediaPlayback::Paused { progress: None }
        } else {
            MediaPlayback::Stopped
        };

        let playing = matches!(playback, MediaPlayback::Playing { .. });
        if *last_playing != Some(playing) {
            let _ = controls.set_playback(playback);
            *last_playing = Some(playing);
        }
    }

    #[cfg(target_os = "windows")]
    fn platform_hwnd(app: &AppHandle) -> Option<*mut std::ffi::c_void> {
        use tauri::Manager;
        let window = app.get_window("main")?;
        window.hwnd().ok().map(|handle| handle.0)
    }

    #[cfg(not(target_os = "windows"))]
    fn platform_hwnd(_app: &AppHandle) -> Option<*mut std::ffi::c_void> {
        None
    }
}

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
mod imp {
    use tauri::AppHandle;

    use crate::bridge::PlayerUpdate;

    pub enum MediaCmd {
        Update(PlayerUpdate),
    }

    /// Reserva para plataformas sin soporte multimedia en esta fase (macOS).
    #[derive(Clone, Default)]
    pub struct MediaSender;

    impl MediaSender {
        pub fn send(&self, _cmd: MediaCmd) {}
    }

    pub fn spawn(_app: &AppHandle) -> MediaSender {
        MediaSender
    }
}

pub use imp::{spawn, MediaCmd, MediaSender};
