use url::Url;

pub const EXAMPLE_SERVER: &str = "https://radio.ejemplo.com";

/// Normaliza y valida la URL del servidor TolochaRadio.
///
/// - Añade `https://` si el usuario no escribe esquema.
/// - Exige HTTPS salvo `localhost`/`127.0.0.1` (desarrollo).
/// - Exige la raíz del servidor (sin ruta, query ni fragmento).
pub fn normalize_server_url(input: &str) -> Result<Url, String> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return Err("Introduce la URL de tu servidor TolochaRadio".to_string());
    }

    let candidate = if trimmed.contains("://") {
        trimmed.to_string()
    } else {
        format!("https://{trimmed}")
    };

    let mut url = Url::parse(&candidate).map_err(|_| {
        format!("La URL no es válida (ejemplo: {EXAMPLE_SERVER})")
    })?;

    match url.scheme() {
        "https" => {}
        "http" => {
            let host = url.host_str().unwrap_or_default();
            if !is_local_host(host) {
                return Err(
                    "Usa HTTPS para tu servidor. Solo se permite HTTP en localhost (desarrollo)."
                        .to_string(),
                );
            }
        }
        _ => {
            return Err("La URL debe empezar por https://".to_string());
        }
    }

    if url.host_str().is_none() {
        return Err("La URL debe incluir un dominio".to_string());
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err("La URL no puede incluir credenciales".to_string());
    }

    let path = url.path();
    if !(path.is_empty() || path == "/") {
        return Err("La URL debe ser la raíz del servidor, sin rutas adicionales".to_string());
    }
    if url.query().is_some() || url.fragment().is_some() {
        return Err("La URL no puede incluir parámetros ni fragmentos".to_string());
    }

    url.set_path("/");
    Ok(url)
}

fn is_local_host(host: &str) -> bool {
    matches!(host, "localhost" | "127.0.0.1" | "::1")
}

pub fn health_url(server: &Url) -> Result<Url, String> {
    server
        .join("api/v1/health")
        .map_err(|_| "No se pudo construir la URL de comprobación".to_string())
}

pub fn same_origin(a: &Url, b: &Url) -> bool {
    a.scheme() == b.scheme()
        && a.host_str() == b.host_str()
        && a.port_or_known_default() == b.port_or_known_default()
}

/// Comprueba que el servidor está accesible (endpoint público de salud de la API).
pub async fn check_health(server: &Url) -> Result<(), String> {
    let url = health_url(server)?;
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .user_agent("TolochaRadio-Desktop")
        .build()
        .map_err(|_| "No se pudo preparar la comprobación de conexión".to_string())?;

    match client.get(url).send().await {
        Ok(response) if response.status().is_success() => Ok(()),
        Ok(response) => Err(format!(
            "El servidor respondió con el estado {}",
            response.status().as_u16()
        )),
        Err(_) => Err(
            "No se pudo conectar con el servidor. Comprueba la URL y tu conexión."
                .to_string(),
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn acepta_https_simple() {
        let url = normalize_server_url("https://radio.ejemplo.com").unwrap();
        assert_eq!(url.as_str(), "https://radio.ejemplo.com/");
    }

    #[test]
    fn acepta_https_con_barra_final() {
        let url = normalize_server_url("https://radio.ejemplo.com/").unwrap();
        assert_eq!(url.as_str(), "https://radio.ejemplo.com/");
    }

    #[test]
    fn anade_https_si_falta_esquema() {
        let url = normalize_server_url("radio.ejemplo.com").unwrap();
        assert_eq!(url.scheme(), "https");
        assert_eq!(url.host_str(), Some("radio.ejemplo.com"));
    }

    #[test]
    fn permite_http_en_localhost() {
        let url = normalize_server_url("http://localhost:3000").unwrap();
        assert_eq!(url.host_str(), Some("localhost"));
        assert_eq!(url.port(), Some(3000));
    }

    #[test]
    fn permite_http_en_127_0_0_1() {
        assert!(normalize_server_url("http://127.0.0.1:3000").is_ok());
    }

    #[test]
    fn rechaza_http_remoto() {
        let error = normalize_server_url("http://radio.ejemplo.com").unwrap_err();
        assert!(error.contains("HTTPS"));
    }

    #[test]
    fn rechaza_url_mal_formada() {
        assert!(normalize_server_url("https://").is_err());
        assert!(normalize_server_url("   ").is_err());
    }

    #[test]
    fn rechaza_rutas() {
        assert!(normalize_server_url("https://radio.ejemplo.com/app").is_err());
    }

    #[test]
    fn rechaza_query_y_fragmento() {
        assert!(normalize_server_url("https://radio.ejemplo.com/?token=1").is_err());
        assert!(normalize_server_url("https://radio.ejemplo.com/#frag").is_err());
    }

    #[test]
    fn rechaza_credenciales() {
        assert!(normalize_server_url("https://user:pass@radio.ejemplo.com").is_err());
    }

    #[test]
    fn same_origin_compara_esquema_host_y_puerto() {
        let a = Url::parse("https://radio.ejemplo.com").unwrap();
        let b = Url::parse("https://radio.ejemplo.com/explorar").unwrap();
        let c = Url::parse("http://radio.ejemplo.com").unwrap();
        let d = Url::parse("https://otro.ejemplo.com").unwrap();
        assert!(same_origin(&a, &b));
        assert!(!same_origin(&a, &c));
        assert!(!same_origin(&a, &d));
    }
}
