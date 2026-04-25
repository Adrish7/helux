import { useEffect, useMemo, useState } from "react";
import { Check, Home, Monitor, Moon, PanelLeftClose, PanelLeftOpen, Settings, Sun, X } from "lucide-react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const fallbackState = {
  activeProviderId: null,
  theme: "auto",
  resolvedTheme: "light",
  sidebarVisible: true,
  providers: []
};

const themeOptions = [
  {
    id: "light",
    label: "Light",
    description: "Use the off-white Switchboard theme.",
    icon: Sun
  },
  {
    id: "dark",
    label: "Dark",
    description: "Use the warm dark Switchboard theme.",
    icon: Moon
  },
  {
    id: "auto",
    label: "Auto",
    description: "Match your Mac appearance.",
    icon: Monitor
  }
];

function App() {
  const [state, setState] = useState(fallbackState);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = state.resolvedTheme ?? state.theme;
    document.documentElement.dataset.sidebar = state.sidebarVisible ? "visible" : "hidden";
  }, [state.resolvedTheme, state.sidebarVisible, state.theme]);

  useEffect(() => {
    let unsubscribe;

    window.aiSwitchboard.getState().then(setState);
    unsubscribe = window.aiSwitchboard.onStateChanged(setState);

    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    if (!settingsOpen) return undefined;

    window.aiSwitchboard.setChromeOverlayActive(true).then(setState);

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.aiSwitchboard.setChromeOverlayActive(false).then(setState);
    };
  }, [settingsOpen]);

  const activeProvider = useMemo(
    () => state.providers.find((provider) => provider.id === state.activeProviderId),
    [state.activeProviderId, state.providers]
  );

  const openProvider = async (providerId) => {
    const nextState = await window.aiSwitchboard.openProvider(providerId);
    setState(nextState);
  };

  const showHome = async () => {
    const nextState = await window.aiSwitchboard.showHome();
    setState(nextState);
  };

  const setTheme = async (theme) => {
    const nextState = await window.aiSwitchboard.setTheme(theme);
    setState(nextState);
  };

  const setSidebarVisible = async (visible) => {
    const nextState = await window.aiSwitchboard.setSidebarVisible(visible);
    setState(nextState);
  };

  const chromeAccent = activeProvider?.accent ?? state.providers[0]?.accent ?? "#d97757";

  return (
    <main className={`shell ${state.sidebarVisible ? "" : "sidebar-hidden"}`} style={{ "--chrome-accent": chromeAccent }}>
      <button
        className="sidebar-peek"
        type="button"
        onClick={() => setSidebarVisible(true)}
        title="Show sidebar"
        aria-label="Show sidebar"
      >
        <PanelLeftOpen size={14} />
      </button>

      <aside className="sidebar" aria-label="AI services" aria-hidden={!state.sidebarVisible}>
        <div className="window-drag-space" />
        <button
          className="rail-button"
          type="button"
          onClick={() => setSidebarVisible(false)}
          title="Hide sidebar"
          aria-label="Hide sidebar"
        >
          <PanelLeftClose size={17} />
        </button>
        <button
          className={`rail-button ${!state.activeProviderId ? "active" : ""}`}
          type="button"
          onClick={showHome}
          title="Home"
          aria-label="Home"
        >
          <Home size={18} />
        </button>

        <nav className="provider-rail">
          {state.providers.map((provider) => (
            <button
              className={`rail-button provider-button ${provider.id === state.activeProviderId ? "active" : ""}`}
              type="button"
              key={provider.id}
              onClick={() => openProvider(provider.id)}
              style={{ "--accent": provider.accent }}
              title={`${provider.name} - Cmd+${provider.shortcut}`}
              aria-label={`${provider.name} - Cmd+${provider.shortcut}`}
            >
              <img className="provider-icon" src={provider.icon} alt="" />
            </button>
          ))}
        </nav>

        <div className="rail-tools">
          <button className="rail-button" type="button" onClick={() => setSettingsOpen(true)} title="Settings" aria-label="Settings">
            <Settings size={17} />
          </button>
        </div>
      </aside>

      {!activeProvider && (
        <section className="home-view">
          <div className="logo-grid" aria-label="Choose an AI service">
            {state.providers.map((provider) => (
              <button
                className="logo-tile"
                type="button"
                key={provider.id}
                onClick={() => openProvider(provider.id)}
                style={{ "--accent": provider.accent }}
                title={`${provider.name} - Cmd+${provider.shortcut}`}
                aria-label={`${provider.name} - Cmd+${provider.shortcut}`}
              >
                <img className="home-logo" src={provider.icon} alt="" />
              </button>
            ))}
          </div>
        </section>
      )}

      {settingsOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSettingsOpen(false)}>
          <section
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="settings-header">
              <div>
                <p className="settings-kicker">Settings</p>
                <h1 id="settings-title">Appearance</h1>
              </div>
              <button className="modal-close" type="button" onClick={() => setSettingsOpen(false)} title="Close settings" aria-label="Close settings">
                <X size={20} />
              </button>
            </header>

            <div className="theme-options" role="radiogroup" aria-label="Default appearance">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const selected = state.theme === option.id;

                return (
                  <button
                    className={`theme-option ${selected ? "selected" : ""}`}
                    type="button"
                    key={option.id}
                    onClick={() => setTheme(option.id)}
                    role="radio"
                    aria-checked={selected}
                  >
                    <span className="theme-icon">
                      <Icon size={22} />
                    </span>
                    <span className="theme-copy">
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                    <span className="theme-check">{selected && <Check size={18} />}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
