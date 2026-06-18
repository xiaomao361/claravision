const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ClaraVisionBridge", {
  mode: process.env.CLARAVISION_VIEW_MODE === "living" ? "living" : "orb",
  getState() {
    return ipcRenderer.invoke("claravision:getState");
  },
  refresh() {
    return ipcRenderer.invoke("claravision:refresh");
  },
  getConversation() {
    return ipcRenderer.invoke("claravision:getConversation");
  },
  sendMessage(message) {
    return ipcRenderer.invoke("claravision:sendMessage", { message });
  },
  cancelMessage() {
    return ipcRenderer.invoke("claravision:cancelMessage");
  },
  clearConversation() {
    return ipcRenderer.invoke("claravision:clearConversation");
  },
  setMouseInteractive(interactive) {
    return ipcRenderer.invoke("claravision:setMouseInteractive", { interactive });
  },
  onCommand(callback) {
    if (typeof callback !== "function") return;
    ipcRenderer.on("claravision:command", (_event, command) => callback(command));
  },
  onConversation(callback) {
    if (typeof callback !== "function") return;
    ipcRenderer.on("claravision:conversation", (_event, payload) => callback(payload));
  },
  onAgentEvent(callback) {
    if (typeof callback !== "function") return;
    ipcRenderer.on("claravision:agentEvent", (_event, evt) => callback(evt));
  }
});
