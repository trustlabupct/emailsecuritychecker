// injected.js
window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data.emailDetect) return;

    let iframes = document.querySelectorAll("iframe");
    iframes.forEach((iframe) => {
        try {
            let doc = iframe.contentDocument || iframe.contentWindow.document;
            if (!doc) return;

            let emailContent = doc.body.innerText;
            console.log("Contenido del email detectado:", emailContent);

            // Enviar contenido al `content.js`
            window.postMessage({ emailContent }, "*");
        } catch (err) {
            console.error("Acceso bloqueado al iframe:", err);
        }
    });
});
