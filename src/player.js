const { ipcRenderer } = require("electron");

const audio = document.getElementById("player");

ipcRenderer.on("play-audio", (_event, dataUrl) => {
  audio.src = dataUrl;
  audio.currentTime = 0;
  audio.play().catch((err) => {
    console.error("Failed to play audio", err);
  });
});
