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

const SIDEBAR_WIDTH = 68;
const COLLAPSED_SIDEBAR_WIDTH = 0;
const BROWSER_PARTITION = "persist:ai-switchboard-browser";
const CHROME_USER_AGENT = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
const BG_LIGHT = "#f7f6f3";
const BG_DARK = "#0c0c0c";
const BOOST_KEYS = ["main", "sidebar", "surface", "surfaceRaised", "text", "muted", "accent"];
const PROVIDER_AUTH_HOSTS = {
  claude: ["accounts.google.com", "appleid.apple.com", "login.anthropic.com"],
  chatgpt: ["auth.openai.com", "auth0.openai.com", "accounts.google.com", "appleid.apple.com"],
  gemini: ["accounts.google.com", "myaccount.google.com"],
  perplexity: ["accounts.google.com", "appleid.apple.com"],
  kimi: ["accounts.google.com", "appleid.apple.com"]
};
const DEFAULT_PROVIDER_BOOSTS = {
  claude: {
    main: "#241713",
    sidebar: "#2f1e18",
    surface: "#432a21",
    surfaceRaised: "#56362a",
    text: "#f7eadf",
    muted: "#d7bca9",
    accent: "#d97757"
  },
  chatgpt: {
    main: "#21170f",
    sidebar: "#2a1f17",
    surface: "#3b2e22",
    surfaceRaised: "#463729",
    text: "#f4eadc",
    muted: "#d4c2aa",
    accent: "#3fad84"
  },
  gemini: {
    main: "#111827",
    sidebar: "#172033",
    surface: "#243147",
    surfaceRaised: "#2f405d",
    text: "#edf4ff",
    muted: "#b7c7da",
    accent: "#78a8ff"
  },
  perplexity: {
    main: "#0e1f21",
    sidebar: "#13292b",
    surface: "#1e3a3d",
    surfaceRaised: "#28484c",
    text: "#e8f5f2",
    muted: "#a9c9c5",
    accent: "#54c2c7"
  },
  kimi: {
    main: "#18171d",
    sidebar: "#201e27",
    surface: "#2c2934",
    surfaceRaised: "#383341",
    text: "#f0edf5",
    muted: "#bfb6ca",
    accent: "#b8a7ff"
  }
};

app.setName("Helux");

let mainWindow;
let activeProviderId = null;
let theme = "auto";
let sidebarVisible = true;
let chromeOverlayActive = false;
let providerBoosts = {};
const providerViews = new Map();
const configuredPartitions = new Set();

function getDefaultBoost(providerId) {
  return DEFAULT_PROVIDER_BOOSTS[providerId] ?? DEFAULT_PROVIDER_BOOSTS.chatgpt;
}

function getDefaultProviderBoosts() {
  return Object.fromEntries(
    providers.map((provider) => [provider.id, null])
  );
}

function getSuggestedProviderBoosts() {
  return Object.fromEntries(
    providers.map((provider) => [provider.id, normalizeProviderBoost(provider.id, DEFAULT_PROVIDER_BOOSTS[provider.id])])
  );
}

function normalizeHexColor(value, fallback) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : fallback;
}

function normalizeProviderBoost(providerId, boost) {
  if (!boost || typeof boost !== "object") return null;

  const defaults = getDefaultBoost(providerId);
  return Object.fromEntries(
    BOOST_KEYS.map((key) => [key, normalizeHexColor(boost[key], defaults[key])])
  );
}

function boostsMatch(first, second) {
  if (!first || !second) return false;
  return BOOST_KEYS.every((key) => first[key] === second[key]);
}

function getProviderBoost(providerId) {
  return normalizeProviderBoost(providerId, providerBoosts[providerId]);
}

function getSerializableProviderBoosts() {
  return Object.fromEntries(
    providers.map((provider) => [provider.id, normalizeProviderBoost(provider.id, providerBoosts[provider.id])])
  );
}

function getPreferencesPath() {
  return path.join(app.getPath("userData"), "preferences.json");
}

function loadPreferences() {
  providerBoosts = getDefaultProviderBoosts();

  try {
    const preferences = JSON.parse(fs.readFileSync(getPreferencesPath(), "utf8"));
    let shouldSavePreferences = false;
    theme = ["light", "dark", "auto"].includes(preferences.theme) ? preferences.theme : "auto";
    sidebarVisible = preferences.sidebarVisible !== false;
    providerBoosts = Object.fromEntries(
      providers.map((provider) => {
        const boost = normalizeProviderBoost(provider.id, preferences.providerBoosts?.[provider.id]);
        const defaultBoost = normalizeProviderBoost(provider.id, DEFAULT_PROVIDER_BOOSTS[provider.id]);
        const migratedBoost = boostsMatch(boost, defaultBoost) ? null : boost;
        shouldSavePreferences ||= boost !== migratedBoost;
        return [provider.id, migratedBoost];
      })
    );
    if (shouldSavePreferences) savePreferences();
  } catch {
    theme = "auto";
    sidebarVisible = true;
  }
}

function savePreferences() {
  fs.writeFileSync(
    getPreferencesPath(),
    JSON.stringify({ theme, sidebarVisible, providerBoosts: getSerializableProviderBoosts() }, null, 2)
  );
}

function getProvider(providerId) {
  return providers.find((provider) => provider.id === providerId);
}

function getActiveView() {
  return activeProviderId ? providerViews.get(activeProviderId) : null;
}

function getResolvedTheme() {
  return theme === "auto" ? (nativeTheme.shouldUseDarkColors ? "dark" : "light") : theme;
}

function getState() {
  return {
    activeProviderId,
    theme,
    resolvedTheme: getResolvedTheme(),
    sidebarVisible,
    providerBoosts: getSerializableProviderBoosts(),
    suggestedProviderBoosts: getSuggestedProviderBoosts(),
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

function applyWindowBackground() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const color = getResolvedTheme() === "dark" ? BG_DARK : BG_LIGHT;
  try {
    mainWindow.setBackgroundColor(color);
  } catch {
    // setBackgroundColor may be unavailable in older Electron versions.
  }
}

function sendState() {
  if (!mainWindow || mainWindow.webContents.isDestroyed()) return;
  applyWindowBackground();
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

function configureSession(partition) {
  if (configuredPartitions.has(partition)) return;

  const providerSession = session.fromPartition(partition);
  providerSession.setUserAgent(CHROME_USER_AGENT, "en-US,en");
  configuredPartitions.add(partition);
}

function buildProviderBoostCss(boost) {
  return `
    :root,
    html,
    html.dark,
    body,
    .dark,
    [data-theme="dark"] {
      color-scheme: dark !important;
      --black: ${boost.main} !important;
      --white: ${boost.text} !important;
      --gray-950: ${boost.main} !important;
      --gray-900: ${boost.sidebar} !important;
      --gray-850: ${boost.surface} !important;
      --gray-800: ${boost.surface} !important;
      --gray-750: ${boost.surfaceRaised} !important;
      --main-surface-primary: ${boost.main} !important;
      --main-surface-secondary: ${boost.sidebar} !important;
      --main-surface-tertiary: ${boost.surface} !important;
      --sidebar-surface-primary: ${boost.sidebar} !important;
      --sidebar-surface-secondary: ${boost.surface} !important;
      --sidebar-surface-tertiary: ${boost.surfaceRaised} !important;
      --text-primary: ${boost.text} !important;
      --text-secondary: ${boost.muted} !important;
      --text-tertiary: ${boost.muted} !important;
      --border-light: color-mix(in srgb, ${boost.text} 12%, transparent) !important;
      --border-medium: color-mix(in srgb, ${boost.text} 20%, transparent) !important;
    }

    html,
    body,
    #__next,
    #root,
    main,
    [role="main"] {
      background: ${boost.main} !important;
      color: ${boost.text} !important;
    }

    [class*="bg-black"],
    [class*="bg-gray-950"],
    [class*="bg-[#000"],
    [class*="dark:bg-black"],
    [class*="dark:bg-gray-950"],
    [class*="bg-token-main-surface-primary"] {
      background-color: ${boost.main} !important;
    }

    [class*="bg-gray-900"],
    [class*="bg-[#212121"],
    [class*="bg-token-main-surface-secondary"] {
      background-color: ${boost.sidebar} !important;
    }

    [class*="bg-token-main-surface-tertiary"],
    [class*="bg-token-sidebar-surface-secondary"] {
      background-color: ${boost.surface} !important;
    }

    [class*="bg-token-sidebar-surface-primary"] {
      background-color: ${boost.sidebar} !important;
    }

    textarea,
    [contenteditable="true"] {
      color: ${boost.text} !important;
      caret-color: ${boost.text} !important;
    }

    ::selection {
      background: color-mix(in srgb, ${boost.accent} 42%, transparent) !important;
      color: #ffffff !important;
    }
  `;
}

function buildProviderBoostScript(boost) {
  const payload = JSON.stringify({ boost, css: buildProviderBoostCss(boost) });

  return `
    (() => {
      const payload = ${payload};
      const state = window.__heluxProviderBoostState || {
        marked: new WeakMap(),
        queued: false
      };

      window.__heluxProviderBoostState = state;
      state.palette = payload.boost;
      state.baseColorRoles = new Map([
        ["rgb(0, 0, 0)", "main"],
        ["rgb(9, 9, 11)", "main"],
        ["rgb(13, 13, 13)", "sidebar"],
        ["rgb(15, 15, 15)", "sidebar"],
        ["rgb(18, 18, 18)", "main"],
        ["rgb(24, 24, 27)", "main"],
        ["rgb(31, 31, 31)", "surface"],
        ["rgb(32, 32, 32)", "surface"],
        ["rgb(33, 33, 33)", "surface"],
        ["rgb(38, 38, 38)", "surface"],
        ["rgb(48, 48, 48)", "surfaceRaised"],
        ["rgb(52, 53, 65)", "surfaceRaised"]
      ]);

      let style = document.getElementById("helux-provider-boost");
      if (!style) {
        style = document.createElement("style");
        style.id = "helux-provider-boost";
        document.documentElement.appendChild(style);
      }
      style.textContent = payload.css;

      state.applyRole = (element, role) => {
        const color = state.palette[role];
        if (!color) return;
        if (element.style.getPropertyValue("background-color") !== color) {
          element.style.setProperty("background-color", color, "important");
        }
        state.marked.set(element, role);
      };

      state.softenElement = (element) => {
        if (!(element instanceof HTMLElement)) return;
        const styles = window.getComputedStyle(element);
        const role = state.marked.get(element) || state.baseColorRoles.get(styles.backgroundColor);
        if (role) state.applyRole(element, role);
      };

      state.softenPage = () => {
        state.queued = false;
        state.softenElement(document.documentElement);
        state.softenElement(document.body);
        document.querySelectorAll("body *").forEach(state.softenElement);
      };

      state.scheduleSoften = () => {
        if (state.queued) return;
        state.queued = true;
        window.requestAnimationFrame(state.softenPage);
      };

      state.softenPage();
      if (!state.observer) {
        state.observer = new MutationObserver(state.scheduleSoften);
        state.observer.observe(document.documentElement, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ["class", "style"]
        });
      }
    })();
  `;
}

function buildDisableProviderBoostScript() {
  return `
    (() => {
      const style = document.getElementById("helux-provider-boost");
      if (style) style.remove();

      const state = window.__heluxProviderBoostState;
      if (state?.observer) state.observer.disconnect();
      delete window.__heluxProviderBoostState;
    })();
  `;
}

function getDefaultViewBackground() {
  return getResolvedTheme() === "dark" ? BG_DARK : BG_LIGHT;
}

function applyProviderBoost(view, provider) {
  if (view.webContents.isDestroyed()) return;

  const boost = getProviderBoost(provider.id);
  if (!boost) {
    try {
      view.setBackgroundColor(getDefaultViewBackground());
    } catch {
      // WebContentsView background support can vary by Electron version.
    }
    return;
  }

  try {
    view.setBackgroundColor(boost.main);
  } catch {
    // WebContentsView background support can vary by Electron version.
  }

  view.webContents.executeJavaScript(buildProviderBoostScript(boost), true).catch((error) => {
    console.error(`Failed to apply ${provider.name} boost: ${error.message}`);
  });
}

function applyProviderBoostById(providerId) {
  const provider = getProvider(providerId);
  const view = providerViews.get(providerId);
  if (provider && view) applyProviderBoost(view, provider);
}

function setProviderBoost(providerId, nextBoost) {
  const provider = getProvider(providerId);
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);

  providerBoosts[providerId] = normalizeProviderBoost(providerId, nextBoost);
  savePreferences();
  applyProviderBoostById(providerId);
  sendState();
  return getState();
}

function resetProviderBoost(providerId) {
  const provider = getProvider(providerId);
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);

  providerBoosts[providerId] = null;
  savePreferences();
  const view = providerViews.get(providerId);

  if (view && !view.webContents.isDestroyed()) {
    try {
      view.setBackgroundColor(getDefaultViewBackground());
    } catch {
      // WebContentsView background support can vary by Electron version.
    }

    view.webContents.executeJavaScript(buildDisableProviderBoostScript(), true).finally(() => {
      if (!view.webContents.isDestroyed()) view.webContents.reload();
    });
  }

  sendState();
  return getState();
}

function isHttpUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function canOpenExternally(url) {
  try {
    const parsedUrl = new URL(url);
    return ["http:", "https:", "mailto:", "tel:"].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

function getUrlHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function getProviderHostnames(provider) {
  const hostname = getUrlHostname(provider.url);
  if (!hostname) return [];

  const hostnames = new Set([hostname]);
  if (hostname.startsWith("www.")) hostnames.add(hostname.slice(4));
  return [...hostnames];
}

function hostnameMatches(hostname, allowedHostname) {
  return hostname === allowedHostname || hostname.endsWith(`.${allowedHostname}`);
}

function isProviderUrl(provider, url) {
  const hostname = getUrlHostname(url);
  if (!hostname) return false;
  return getProviderHostnames(provider).some((allowedHostname) => hostnameMatches(hostname, allowedHostname));
}

function isProviderAuthUrl(provider, url) {
  const hostname = getUrlHostname(url);
  if (!hostname) return false;
  return (PROVIDER_AUTH_HOSTS[provider.id] ?? []).some((allowedHostname) => hostnameMatches(hostname, allowedHostname));
}

function openUrlExternally(url) {
  if (!canOpenExternally(url)) return;

  shell.openExternal(url).catch((error) => {
    console.error(`Failed to open external URL: ${error.message}`);
  });
}

function shouldKeepNavigationInHelux(provider, url) {
  return isHttpUrl(url) && (isProviderUrl(provider, url) || isProviderAuthUrl(provider, url));
}

function getChildWindowOptions(provider, partition) {
  return {
    width: 980,
    height: 760,
    minWidth: 720,
    minHeight: 560,
    title: provider.name,
    backgroundColor: "#fbfaf6",
    webPreferences: {
      partition,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      nativeWindowOpen: true
    }
  };
}

function configureChildWindow(childWindow, provider, partition) {
  childWindow.webContents.setUserAgent(CHROME_USER_AGENT);

  childWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isProviderAuthUrl(provider, url)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: getChildWindowOptions(provider, partition)
      };
    }

    openUrlExternally(url);
    return { action: "deny" };
  });

  childWindow.webContents.on("will-navigate", (event, url) => {
    if (shouldKeepNavigationInHelux(provider, url)) return;

    event.preventDefault();
    openUrlExternally(url);
  });

  childWindow.webContents.on("did-create-window", (nextWindow) => {
    configureChildWindow(nextWindow, provider, partition);
  });

  childWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame && errorCode !== -3) {
      console.error(`${provider.name} popup failed to load: ${errorDescription} (${validatedURL})`);
    }
  });
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

  view.setBackgroundColor(getProviderBoost(provider.id)?.main ?? getDefaultViewBackground());
  view.webContents.setUserAgent(CHROME_USER_AGENT);

  // Intercept Cmd+B at the Electron layer before the page's JS can preventDefault
  // it. Claude/Gemini/etc. bind their own Cmd+B handlers inside the page, which
  // swallows the application menu accelerator. Catching it here guarantees the
  // sidebar always toggles regardless of what the loaded site does.
  view.webContents.on("before-input-event", (event, input) => {
    if (
      input.type === "keyDown" &&
      input.meta &&
      !input.shift &&
      !input.alt &&
      !input.control &&
      input.key.toLowerCase() === "b"
    ) {
      event.preventDefault();
      toggleSidebar();
    }
  });

  view.webContents.setWindowOpenHandler(({ url }) => {
    if (isProviderAuthUrl(provider, url)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: getChildWindowOptions(provider, partition)
      };
    }

    openUrlExternally(url);
    return { action: "deny" };
  });

  view.webContents.on("will-navigate", (event, url) => {
    if (shouldKeepNavigationInHelux(provider, url)) return;

    event.preventDefault();
    openUrlExternally(url);
  });

  view.webContents.on("did-create-window", (childWindow) => {
    configureChildWindow(childWindow, provider, partition);
  });

  view.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame && errorCode !== -3) {
      console.error(`Failed to load ${provider.name}: ${errorDescription} (${validatedURL})`);
    }
  });

  view.webContents.on("did-finish-load", () => {
    applyProviderBoost(view, provider);

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
    backgroundColor: getResolvedTheme() === "dark" ? BG_DARK : BG_LIGHT,
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
    applyWindowBackground();
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
ipcMain.handle("app:set-provider-boost", (_event, providerId, nextBoost) => setProviderBoost(providerId, nextBoost));
ipcMain.handle("app:reset-provider-boost", (_event, providerId) => resetProviderBoost(providerId));
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
