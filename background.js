console.log("Service Worker cargado correctamente.");

// Mantener vivo el Service Worker
chrome.alarms.create("mantenerVivo", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "mantenerVivo") {
        console.debug("Manteniendo vivo el Service Worker...");
    }
});

// Evento cuando la extensión se instala o actualiza
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ emailAnalysisEnabled: true });
});

// Función para obtener o actualizar el token de Gmail
function obtenerToken(callback) {
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
        if (chrome.runtime.lastError || !token) {
            callback(null);
            return;
        }
        chrome.storage.local.set({ gmail_token: token }, () => {
            callback(token);
        });
    });
}

// Revocar token y solicitar uno nuevo
function renovarToken(callback) {
    chrome.storage.local.get("gmail_token", (data) => {
        if (!data.gmail_token) {
            obtenerToken(callback);
            return;
        }
        chrome.identity.removeCachedAuthToken({ token: data.gmail_token }, function() {
            obtenerToken(callback);
        });
    });
}

// Obtener el correo del usuario autenticado
function obtenerCorreoUsuario(sendResponse) {
    obtenerToken((token) => {
        if (!token) {
            sendResponse({ success: false, error: "No hay token disponible." });
            return;
        }
        fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(response => response.json())
        .then(data => {
            if (data.email) {
                chrome.storage.local.set({ user_email: data.email }, () => {
                    sendResponse({ success: true, email: data.email });
                });
            } else {
                sendResponse({ success: false, error: "No se encontró el email en la respuesta." });
            }
        })
        .catch(error => {
            sendResponse({ success: false, error: error.message });
        });

        return true;
    });
}

// Obtener y analizar correos
function obtenerCorreos(sendResponse) {
    chrome.storage.local.get("gmail_token", (data) => {
        if (!data.gmail_token) {
            obtenerToken((token) => {
                if (!token) {
                    sendResponse({ success: false, error: "No se pudo obtener un token válido." });
                    return;
                }
                analizarCorreos(token, sendResponse);
            });
            return;
        }
        analizarCorreos(data.gmail_token, sendResponse);
    });
}

// 📩 Función que analiza los correos electrónicos
async function analizarCorreos(token, sendResponse) {
    console.debug("Obteniendo correos de Gmail...");

    try {
        const response = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=5", {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();

        if (!data.messages) {
            sendResponse({ success: true, correos: [] });
            return;
        }

        let correos = [];

        let requests = data.messages.map(async (msg) => {
            try {
                const msgResponse = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const messageData = await msgResponse.json();

                let asunto = messageData.payload.headers.find(header => header.name === "Subject")?.value || "Sin asunto";
                let cuerpo = messageData.snippet || "No se pudo obtener el contenido.";

                // Validar metadatos
                let headers = messageData.payload.headers;
                let validacion = validarMetadatosCorreo(headers);

                correos.push({
                    texto: asunto,
                    resumen: cuerpo,
                    autenticado: validacion.autenticado,
                    detalles: validacion.detalles
                });

            } catch (error) {
                console.error(`Error al obtener el correo ${msg.id}:`, error);
            }
        });

        await Promise.all(requests);
        sendResponse({ success: true, correos });

    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
    return true;
}

// 📤 Obtener reglas de reenvío de Gmail
async function obtenerReglasDeReenvio(token, sendResponse) {
    console.debug("📤 Obteniendo reglas de reenvío de Gmail...");

    try {
        const response = await fetch("https://www.googleapis.com/gmail/v1/users/me/settings/forwardingAddresses", {
            headers: { Authorization: `Bearer ${token}` }
        });

        const text = await response.text();
        if (!text.trim()) {
            sendResponse({ success: true, reenvios: [] });
            return;
        }

        const data = JSON.parse(text);
        if (!data.forwardingAddresses || data.forwardingAddresses.length === 0) {
            sendResponse({ success: true, reenvios: [] });
            return;
        }

        let reenvios = data.forwardingAddresses.map(forwarding => ({
            email: forwarding.forwardingEmail,
            verificado: forwarding.verificationStatus === "accepted"
        }));

        sendResponse({ success: true, reenvios });

    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

// Manejo de mensajes en `onMessage`
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "iniciarSesion") {
        obtenerToken((token) => {
            if (!token) {
                sendResponse({ success: false, error: "No se pudo obtener el token." });
                return;
            }
            sendResponse({ success: true, token });
        });
    } 
    else if (message.action === "obtenerCorreoUsuario") {
        obtenerCorreoUsuario(sendResponse);
    } 
    else if (message.action === "obtenerCorreos") {
        obtenerCorreos(sendResponse);
    }
    else if (message.action === "obtenerReenvios") {
        chrome.storage.local.get("gmail_token", (data) => {
            if (!data.gmail_token) {
                sendResponse({ success: false, error: "No hay token disponible." });
                return;
            }
            obtenerReglasDeReenvio(data.gmail_token, sendResponse);
        });
        return true;
    }
    return true;
});
