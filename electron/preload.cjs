const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("aiSwitchboard", {
  getState: () => ipcRenderer.invoke("app:get-state"),
  openProvider: (providerId) => ipcRenderer.invoke("provider:open", providerId),
  showHome: () => ipcRenderer.invoke("provider:home"),
  reloadActive: () => ipcRenderer.invoke("provider:reload"),
  goBack: () => ipcRenderer.invoke("provider:back"),
  goForward: () => ipcRenderer.invoke("provider:forward"),
  openExternalActive: () => ipcRenderer.invoke("provider:open-external"),
  clearData: () => ipcRenderer.invoke("app:clear-data"),
  setTheme: (theme) => ipcRenderer.invoke("app:set-theme", theme),
  setSidebarVisible: (visible) => ipcRenderer.invoke("app:set-sidebar-visible", visible),
  setChromeOverlayActive: (active) => ipcRenderer.invoke("app:set-chrome-overlay-active", active),
  onStateChanged: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("app:state", listener);
    return () => ipcRenderer.removeListener("app:state", listener);
  }
});
