const tauri = window.__TAURI__;

const element = (id) => document.getElementById(id);

function show(view) {
  for (const name of ["loading", "configure", "error"]) {
    element(`view-${name}`).hidden = name !== view;
  }
}

function setLead(text) {
  element("lead").textContent = text;
}

function errorMessage(error, fallback) {
  return typeof error === "string" && error.length > 0 ? error : fallback;
}

async function connect() {
  setLead("Conectando con tu servidor…");
  show("loading");
  try {
    await tauri.core.invoke("connect");
  } catch (error) {
    element("error-message").textContent = errorMessage(
      error,
      "No se pudo conectar con el servidor",
    );
    setLead("No se pudo conectar");
    show("error");
  }
}

async function boot() {
  const status = await tauri.core.invoke("get_status");
  element("shell-version").textContent = `v${status.shellVersion}`;

  if (!status.configured) {
    setLead("Configura tu servidor para empezar");
    show("configure");
    element("server-url").focus();
    return;
  }

  await connect();
}

element("server-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = element("server-url");
  const formError = element("form-error");
  formError.hidden = true;

  try {
    await tauri.core.invoke("save_server_url", { url: input.value });
  } catch (error) {
    formError.textContent = errorMessage(error, "La URL no es válida");
    formError.hidden = false;
    return;
  }

  await connect();
});

element("retry").addEventListener("click", () => {
  void connect();
});

element("change").addEventListener("click", async () => {
  await tauri.core.invoke("clear_server_url");
  const input = element("server-url");
  input.value = "";
  setLead("Configura tu servidor para empezar");
  show("configure");
  input.focus();
});

boot().catch(() => {
  element("error-message").textContent = "No se pudo iniciar el cliente";
  show("error");
});
