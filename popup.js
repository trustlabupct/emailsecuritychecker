document.addEventListener("DOMContentLoaded", function () {
    const statusMessage = document.getElementById("statusMessage");
    const authButton = document.getElementById("authButton");
    const signoutButton = document.getElementById("signoutButton");
    const correoLista = document.getElementById("correo-lista");
    const reenvioLista = document.getElementById("reenvio-lista");

    if (!authButton) return;

    verificarAutenticacion();

    authButton.addEventListener("click", () => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError || !token) {
                statusMessage.textContent = "Error al iniciar sesión.";
                return;
            }

            statusMessage.textContent = "Sesión iniciada.";
            chrome.storage.local.set({ gmail_token: token }, () => {
                setTimeout(() => {
                    obtenerCorreoUsuario();
                    obtenerCorreos();
                    obtenerReenvios();
                }, 500);
            });
        });
    });

    if (signoutButton) {
        signoutButton.addEventListener("click", () => {
            chrome.identity.clearAllCachedAuthTokens(() => {
                chrome.storage.local.remove("user_email", () => {
                    statusMessage.textContent = "No autenticado";
                });
            });
        });
    }

    function verificarAutenticacion() {
        chrome.storage.local.get("user_email", (data) => {
            if (data.user_email) {
                statusMessage.textContent = `Sesión iniciada como: ${data.user_email}`;
                obtenerCorreos();
                obtenerReenvios();
            } else {
                statusMessage.textContent = "Inicia sesión para ver tus correos.";
            }
        });
    }

    function obtenerCorreoUsuario() {
        chrome.storage.local.get("gmail_token", (data) => {
            if (!data.gmail_token) {
                chrome.runtime.sendMessage({ action: "iniciarSesion" }, (response) => {
                    if (!response || !response.success) return;
                    setTimeout(() => {
                        solicitarCorreo(response.token);
                    }, 500);
                });
                return;
            }
            solicitarCorreo(data.gmail_token);
        });
    }

    function solicitarCorreo(token) {
        fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(response => response.json())
        .then(data => {
            if (data.email) {
                chrome.storage.local.set({ user_email: data.email }, () => {
                    statusMessage.textContent = `Sesión iniciada como: ${data.email}`;
                });
            }
        })
        .catch(() => {
            statusMessage.textContent = "Error al obtener el correo.";
        });
    }

    function obtenerCorreos() {
        chrome.runtime.sendMessage({ action: "obtenerCorreos" }, (response) => {
            if (!response || !response.success) {
                statusMessage.textContent = "Error al cargar correos.";
                return;
            }

            correoLista.innerHTML = "";
            if (response.correos.length === 0) {
                correoLista.innerHTML = "<p>No se encontraron correos sospechosos.</p>";
            } else {
                response.correos.forEach((correo) => {
                    let li = document.createElement("li");
                    let autenticado = correo.autenticado ? "✔️ Autenticado" : "❌ No autenticado";

                    let detallesHTML = correo.detalles?.length > 0
                        ? correo.detalles.map(detalle => `<p style="color: red; font-size: 12px;">${detalle}</p>`).join("")
                        : "";

                    li.innerHTML = `
                        <div>
                            <strong>${correo.texto}</strong>
                            <p style="font-size: 12px; color: gray;">${correo.resumen || "Sin resumen disponible."}</p>
                            <p style="font-size: 12px; font-weight: bold; color: ${correo.autenticado ? "green" : "red"};">${autenticado}</p>
                            ${detallesHTML}
                        </div>
                    `;

                    if (correo.sospechoso) {
                        li.classList.add("sospechoso");
                    }

                    correoLista.appendChild(li);
                });
            }
        });
    }

    function obtenerReenvios() {
        chrome.runtime.sendMessage({ action: "obtenerReenvios" }, (response) => {
            if (!response || !response.success) {
                reenvioLista.innerHTML = "<p>Error al obtener reglas de reenvío.</p>";
                return;
            }

            reenvioLista.innerHTML = "";
            if (response.reenvios.length === 0) {
                reenvioLista.innerHTML = "<p>No hay reglas de reenvío configuradas.</p>";
            } else {
                response.reenvios.forEach((reenvio) => {
                    let li = document.createElement("li");
                    li.innerHTML = `<strong>${reenvio.email}</strong> - ${reenvio.verificado ? "✅ Verificado" : "❌ No verificado"}`;
                    reenvioLista.appendChild(li);
                });
            }
        });
    }
});
