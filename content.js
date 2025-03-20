// content.js
console.log("Email Detect Content Script Loaded");

// Conjunto para evitar analizar emails duplicados
const emailsAnalizados = new Set();

// Observer para detectar cuando el usuario abre un email
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    let emailBody = node.querySelector("div[role='main']");
                    if (emailBody) {
                        let emailId = obtenerIdEmail(emailBody);
                        if (!emailsAnalizados.has(emailId)) {
                            console.log("Se detectó la apertura de un email.");
                            analizarEmail(emailBody);
                            emailsAnalizados.add(emailId);
                        }
                    }
                }
            });
        }
    });
});

// Iniciar el observer en el cuerpo de la página
observer.observe(document.body, { childList: true, subtree: true });

// Función para obtener un identificador único del email
function obtenerIdEmail(emailNode) {
    let subject = emailNode.querySelector("h2.hP")?.innerText || "Sin asunto";
    let from = emailNode.querySelector(".gD")?.innerText || "Desconocido";
    return `${from}-${subject}`; // Identificador único basado en remitente + asunto
}

// Función principal para analizar el email
function analizarEmail(emailBody) {
    let metadatos = extraerMetadatos();
    let enlaces = extraerEnlaces(emailBody);

    console.log("Metadatos:", metadatos);
    console.log("Enlaces detectados:", enlaces);

    // Enviar datos al `background.js`
    chrome.runtime.sendMessage({
        action: "emailsExtraidos",
        data: { metadatos, enlaces }
    });
}

// Extraer metadatos del email (remitente y asunto)
function extraerMetadatos() {
    let fromElement = document.querySelector(".gD") || document.querySelector(".go");
    let subjectElement = document.querySelector("h2.hP") || document.querySelector("h2");

    let from = fromElement ? fromElement.innerText : "Desconocido";
    let subject = subjectElement ? subjectElement.innerText : "Sin asunto";

    return { from, subject };
}

// Extraer y analizar URLs dentro del email
function extraerEnlaces(emailBody) {
    let links = emailBody.querySelectorAll("a[href]");
    return Array.from(links).map((link) => link.href);
}

// Inyección de `injected.js` en iframes
function injectScript() {
    let script = document.createElement("script");
    script.src = chrome.runtime.getURL("injected.js");
    document.documentElement.appendChild(script);
}

injectScript();
