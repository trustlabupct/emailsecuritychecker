document.addEventListener("DOMContentLoaded", function () {
    const enableAnalysisCheckbox = document.getElementById("enableAnalysis");
    const saveButton = document.getElementById("saveOptions");
    const statusMessage = document.getElementById("statusMessage");

    // Cargar la configuración guardada
    chrome.storage.sync.get("emailAnalysisEnabled", (data) => {
        enableAnalysisCheckbox.checked = data.emailAnalysisEnabled ?? true;
    });

    // Guardar la configuración cuando el usuario haga clic en el botón
    saveButton.addEventListener("click", () => {
        chrome.storage.sync.set({ emailAnalysisEnabled: enableAnalysisCheckbox.checked }, () => {
            statusMessage.textContent = "Configuración guardada.";
            setTimeout(() => { statusMessage.textContent = ""; }, 2000);
        });
    });
});
