const { ipcRenderer } = window;

const form = document.getElementById("setup-form");
const nicknameInput = document.getElementById("nickname");
const submitButton = document.getElementById("submit");
const errorEl = document.getElementById("error");

ipcRenderer.invoke("setup:get-defaults").then((defaults) => {
  if (defaults?.nickname) nicknameInput.value = defaults.nickname;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorEl.textContent = "";

  const nickname = nicknameInput.value.trim();

  if (!nickname) {
    errorEl.textContent = "Nickname is required.";
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Connecting...";

  const result = await ipcRenderer.invoke("setup:submit", { nickname });

  if (!result.ok) {
    errorEl.textContent = result.error;
    submitButton.disabled = false;
    submitButton.textContent = "Save & Connect";
  }
});
