const path = require("path");
const fs = require("fs");
const {
  app,
  BrowserWindow,
  WebContentsView,
  ipcMain,
  shell,
  session,
  Menu,
  nativeTheme
} = require("electron");
const { providers } = require("./providers.cjs");

const SIDEBAR_WIDTH = 72;
const COLLAPSED_SIDEBAR_WIDTH = 14;
const BROWSER_PARTITION = "persist:ai-switchboard-browser";
const CHROME_USER_AGENT = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;

app.setName("Helux");

let mainWindow;
let activeProviderId = null;
let theme = "auto";
let sidebarVisible = true;
let chromeOverlayActive = false;
const providerViews = new Map();
const configuredPartitions = new Set();
const authWindows = new Map();

function getPreferencesPath() {
  return path.join(app.getPath("userData"), "preferences.json");
}

function loadPreferences() {
  try {
    const preferences = JSON.parse(fs.readFileSync(getPreferencesPath(), "utf8"));
    theme = ["light", "dark", "auto"].includes(preferences.theme) ? preferences.theme : "auto";
    sidebarVisible = preferences.sidebarVisible !== false;
  } catch {
    theme = "auto";
    sidebarVisible = true;
  }
}

function savePreferences() {
  fs.writeFileSync(getPreferencesPath(), JSON.stringify({ theme, sidebarVisible }, null, 2));
}

function getProvider(providerId) {
  return providers.find((provider) => provider.id === providerId);
}

function getActiveView() {
  return activeProviderId ? providerViews.get(activeProviderId) : null;
}

function getState() {
  return {
    activeProviderId,
    theme,
    resolvedTheme: theme === "auto" ? (nativeTheme.shouldUseDarkColors ? "dark" : "light") : theme,
    sidebarVisible,
    providers: providers.map(({ id, name, url, icon, accent, shortcut }) => ({
      id,
      name,
      url,
      icon,
      accent,
      shortcut
    }))
  };
}

function sendState() {
  if (!mainWindow || mainWindow.webContents.isDestroyed()) return;
  mainWindow.webContents.send("app:state", getState());
}

function getContentBounds() {
  const chromeWidth = sidebarVisible ? SIDEBAR_WIDTH : COLLAPSED_SIDEBAR_WIDTH;
  if (!mainWindow) return { x: chromeWidth, y: 0, width: 900, height: 600 };
  const { width, height } = mainWindow.getContentBounds();
  return {
    x: chromeWidth,
    y: 0,
    width: Math.max(0, width - chromeWidth),
    height
  };
}

function resizeActiveView() {
  const activeView = getActiveView();
  if (activeView && !chromeOverlayActive) activeView.setBounds(getContentBounds());
}

function getPartition(provider) {
  return BROWSER_PARTITION;
}

function getProviderOrigin(provider) {
  return new URL(provider.url).origin;
}

function configureSession(partition) {
  if (configuredPartitions.has(partition)) return;

  const providerSession = session.fromPartition(partition);
  providerSession.setUserAgent(CHROME_USER_AGENT, "en-US,en");
  configuredPartitions.add(partition);
}

function isHttpUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function isGoogleAuthUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === "accounts.google.com";
  } catch {
    return false;
  }
}

function isProviderUrl(provider, url) {
  try {
    return new URL(url).origin === getProviderOrigin(provider);
  } catch {
    return false;
  }
}

function configureChildWindow(childWindow, provider, partition) {
  childWindow.webContents.setUserAgent(CHROME_USER_AGENT);

  childWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isHttpUrl(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }

    return {
      action: "allow",
      overrideBrowserWindowOptions: {
        width: 980,
        height: 760,
        title: `Sign in to ${provider.name}`,
        backgroundColor: "#fbfaf6",
        webPreferences: {
          partition,
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          nativeWindowOpen: true
        }
      }
    };
  });

  childWindow.webContents.on("did-create-window", (nextWindow) => {
    configureChildWindow(nextWindow, provider, partition);
  });
}

function createAuthWindow(provider, initialUrl) {
  const partition = getPartition(provider);
  configureSession(partition);

  const existingWindow = authWindows.get(provider.id);
  if (existingWindow && !existingWindow.isDestroyed()) {
    existingWindow.show();
    existingWindow.focus();
    existingWindow.webContents.loadURL(initialUrl);
    return;
  }

  const authWindow = new BrowserWindow({
    parent: mainWindow,
    width: 980,
    height: 760,
    minWidth: 720,
    minHeight: 560,
    title: `Sign in to ${provider.name}`,
    backgroundColor: "#fbfaf6",
    webPreferences: {
      partition,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      nativeWindowOpen: true
    }
  });

  authWindows.set(provider.id, authWindow);
  configureChildWindow(authWindow, provider, partition);

  authWindow.on("closed", () => {
    authWindows.delete(provider.id);
  });

  authWindow.webContents.on("did-navigate", (_event, url) => {
    if (isProviderUrl(provider, url)) {
      const providerView = providerViews.get(provider.id);
      if (providerView && !providerView.webContents.isDestroyed()) {
        providerView.webContents.loadURL(provider.url);
      }
      setTimeout(() => {
        if (!authWindow.isDestroyed()) authWindow.close();
      }, 750);
    }
  });

  authWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame && errorCode !== -3) {
      console.error(`Auth window failed to load ${provider.name}: ${errorDescription} (${validatedURL})`);
    }
  });

  authWindow.webContents.loadURL(initialUrl);
}

function openGoogleAuthWindow(event, provider, url) {
  event.preventDefault();
  createAuthWindow(provider, url);
}

function createProviderView(provider) {
  const partition = getPartition(provider);
  configureSession(partition);

  const view = new WebContentsView({
    webPreferences: {
      partition,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      nativeWindowOpen: true
    }
  });

  view.setBackgroundColor("#faf8f2");
  view.webContents.setUserAgent(CHROME_USER_AGENT);

  view.webContents.setWindowOpenHandler(({ url }) => {
    if (isGoogleAuthUrl(url)) {
      setImmediate(() => createAuthWindow(provider, url));
      return { action: "deny" };
    }

    if (isHttpUrl(url)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width: 980,
          height: 760,
          title: provider.name,
          webPreferences: {
            partition,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
          }
        }
      };
    }

    shell.openExternal(url);
    return { action: "deny" };
  });

  view.webContents.on("did-create-window", (childWindow) => {
    configureChildWindow(childWindow, provider, partition);
  });

  view.webContents.on("will-navigate", (event, url) => {
    const nextUrl = event.url || url;
    if (isGoogleAuthUrl(nextUrl)) openGoogleAuthWindow(event, provider, nextUrl);
  });

  view.webContents.on("will-redirect", (event, url) => {
    const nextUrl = event.url || url;
    if (isGoogleAuthUrl(nextUrl)) openGoogleAuthWindow(event, provider, nextUrl);
  });

  view.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame && errorCode !== -3) {
      console.error(`Failed to load ${provider.name}: ${errorDescription} (${validatedURL})`);
    }
  });

  view.webContents.on("did-finish-load", () => {
    if (process.env.AI_SWITCHBOARD_DEBUG === "1") {
      console.log(`${provider.name} loaded: ${view.webContents.getURL()}`);
    }
  });

  view.webContents.loadURL(provider.url);
  return view;
}

function ensureProviderView(providerId) {
  const provider = getProvider(providerId);
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);

  if (!providerViews.has(providerId)) {
    providerViews.set(providerId, createProviderView(provider));
  }

  return providerViews.get(providerId);
}

function detachActiveView() {
  const activeView = getActiveView();
  if (activeView && mainWindow) {
    try {
      mainWindow.contentView.removeChildView(activeView);
    } catch {
      // The view may already be detached when switching quickly.
    }
  }
}

async function openProvider(providerId) {
  if (!mainWindow) return getState();

  if (providerId === activeProviderId) {
    resizeActiveView();
    sendState();
    return getState();
  }

  detachActiveView();
  activeProviderId = providerId;

  const nextView = ensureProviderView(providerId);
  if (!chromeOverlayActive) {
    nextView.setBounds(getContentBounds());
    mainWindow.contentView.addChildView(nextView);
    nextView.webContents.focus();
  }

  sendState();
  return getState();
}

async function showHome() {
  detachActiveView();
  activeProviderId = null;
  if (mainWindow) mainWindow.webContents.focus();
  sendState();
  return getState();
}

function restoreActiveView() {
  if (!mainWindow || chromeOverlayActive || !activeProviderId) return;

  const activeView = ensureProviderView(activeProviderId);
  activeView.setBounds(getContentBounds());
  try {
    mainWindow.contentView.addChildView(activeView);
  } catch {
    // The view may already be attached.
  }
  activeView.webContents.focus();
}

async function setChromeOverlayActive(nextActive) {
  chromeOverlayActive = nextActive === true;

  if (chromeOverlayActive) {
    detachActiveView();
    if (mainWindow) mainWindow.webContents.focus();
  } else {
    restoreActiveView();
  }

  sendState();
  return getState();
}

async function setSidebarVisible(nextVisible) {
  sidebarVisible = nextVisible === true;
  savePreferences();
  resizeActiveView();
  sendState();
  return getState();
}

async function toggleSidebar() {
  return setSidebarVisible(!sidebarVisible);
}

function createMenu() {
  const reloadActive = () => getActiveView()?.webContents.reload();
  const goBackActive = () => {
    const webContents = getActiveView()?.webContents;
    if (webContents?.navigationHistory.canGoBack()) webContents.navigationHistory.goBack();
  };
  const goForwardActive = () => {
    const webContents = getActiveView()?.webContents;
    if (webContents?.navigationHistory.canGoForward()) webContents.navigationHistory.goForward();
  };

  const template = [
    {
      label: "Helux",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { label: "Hide Helux", accelerator: "Command+Shift+H", click: () => app.hide() },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" }
      ]
    },
    {
      label: "Navigate",
      submenu: [
        { label: "Home", accelerator: "Command+H", click: showHome },
        { label: "Home", accelerator: "Command+0", visible: false, click: showHome },
        { label: "Reload", accelerator: "Command+R", click: reloadActive },
        { label: "Back", accelerator: "Command+[", click: goBackActive },
        { label: "Forward", accelerator: "Command+]", click: goForwardActive },
        { type: "separator" },
        ...providers.map((provider) => ({
          label: provider.name,
          accelerator: `Command+${provider.shortcut}`,
          click: () => openProvider(provider.id)
        }))
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        { label: "Toggle Sidebar", accelerator: "Command+B", click: toggleSidebar },
        { type: "separator" },
        { role: "toggleDevTools" },
        { role: "togglefullscreen" }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 860,
    minHeight: 620,
    title: "Helux",
    titleBarStyle: "hiddenInset",
    backgroundColor: "#fbfaf6",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (process.env.AI_SWITCHBOARD_DEBUG === "1") {
    mainWindow.webContents.on("console-message", (event) => {
      const source = event.sourceId ? `${event.sourceId}:${event.lineNumber}` : `line ${event.lineNumber}`;
      console.log(`[renderer:${event.level}] ${event.message} (${source})`);
    });
  }

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame && errorCode !== -3) {
      console.error(`Renderer failed to load: ${errorDescription} (${validatedURL})`);
    }
  });

  if (app.isPackaged || process.env.AI_SWITCHBOARD_USE_DIST === "1") {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  } else {
    mainWindow.loadURL("http://127.0.0.1:5173");
  }

  mainWindow.on("resize", resizeActiveView);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.once("did-finish-load", () => {
    sendState();

    if (process.env.AI_SWITCHBOARD_CAPTURE) {
      setTimeout(async () => {
        if (process.env.AI_SWITCHBOARD_TEST_PROVIDER) {
          await openProvider(process.env.AI_SWITCHBOARD_TEST_PROVIDER);
          await new Promise((resolve) => setTimeout(resolve, 5000));

        }

        try {
          const activeView = getActiveView();
          const image = activeView
            ? await activeView.webContents.capturePage()
            : await mainWindow.webContents.capturePage();
          fs.writeFileSync(process.env.AI_SWITCHBOARD_CAPTURE, image.toPNG());
        } catch (error) {
          console.error(`Capture failed: ${error.message}`);
        } finally {
          app.quit();
        }
      }, 1000);
    }
  });
}

ipcMain.handle("app:get-state", () => getState());
ipcMain.handle("provider:open", (_event, providerId) => openProvider(providerId));
ipcMain.handle("provider:home", showHome);
ipcMain.handle("provider:reload", () => {
  getActiveView()?.webContents.reload();
  return getState();
});
ipcMain.handle("provider:back", () => {
  const webContents = getActiveView()?.webContents;
  if (webContents?.navigationHistory.canGoBack()) webContents.navigationHistory.goBack();
  return getState();
});
ipcMain.handle("provider:forward", () => {
  const webContents = getActiveView()?.webContents;
  if (webContents?.navigationHistory.canGoForward()) webContents.navigationHistory.goForward();
  return getState();
});
ipcMain.handle("provider:open-external", () => {
  const view = getActiveView();
  if (view) shell.openExternal(view.webContents.getURL());
  return getState();
});
ipcMain.handle("app:set-theme", (_event, nextTheme) => {
  theme = ["light", "dark", "auto"].includes(nextTheme) ? nextTheme : "auto";
  savePreferences();
  sendState();
  return getState();
});
ipcMain.handle("app:set-sidebar-visible", (_event, nextVisible) => setSidebarVisible(nextVisible));
ipcMain.handle("app:set-chrome-overlay-active", (_event, nextActive) => setChromeOverlayActive(nextActive));
ipcMain.handle("app:clear-data", async () => {
  const providerSession = session.fromPartition(BROWSER_PARTITION);
  await providerSession.clearStorageData();
  await providerSession.clearCache();

  for (const view of providerViews.values()) {
    if (!view.webContents.isDestroyed()) view.webContents.reload();
  }

  return getState();
});

app.whenReady().then(() => {
  loadPreferences();
  nativeTheme.on("updated", sendState);
  createMenu();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
