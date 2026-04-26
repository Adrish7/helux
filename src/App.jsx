import { useEffect, useMemo, useState } from "react";
import { Home, Monitor, Moon, PanelLeftClose, Sun } from "lucide-react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const fallbackState = {
  activeProviderId: null,
  theme: "auto",
  resolvedTheme: "light",
  sidebarVisible: true,
  providers: []
};

const themeCycle = ["light", "dark", "auto"];
const themeIcons = { light: Sun, dark: Moon, auto: Monitor };

function App() {
  const [state, setState] = useState(fallbackState);

  useEffect(() => {
    document.documentElement.dataset.theme = state.resolvedTheme ?? state.theme;
  }, [state.resolvedTheme, state.theme]);

  useEffect(() => {
    let unsubscribe;
    window.aiSwitchboard.getState().then(setState);
    unsubscribe = window.aiSwitchboard.onStateChanged(setState);
    return () => unsubscribe?.();
  }, []);

  const activeProvider = useMemo(
    () => state.providers.find((provider) => provider.id === state.activeProviderId),
    [state.activeProviderId, state.providers]
  );

  const openProvider = async (providerId) => {
    const next = await window.aiSwitchboard.openProvider(providerId);
    setState(next);
  };

  const showHome = async () => {
    const next = await window.aiSwitchboard.showHome();
    setState(next);
  };

  const cycleTheme = async () => {
    const idx = themeCycle.indexOf(state.theme);
    const nextTheme = themeCycle[(idx + 1) % themeCycle.length];
    const next = await window.aiSwitchboard.setTheme(nextTheme);
    setState(next);
  };

  const setSidebarVisible = async (visible) => {
    const next = await window.aiSwitchboard.setSidebarVisible(visible);
    setState(next);
  };

  const accent = activeProvider?.accent ?? "transparent";
  const ThemeIcon = themeIcons[state.theme] ?? Monitor;

  return (
    <main
      className={`shell ${state.sidebarVisible ? "" : "collapsed"}`}
      style={{ "--accent": accent }}
      data-active={activeProvider?.id ?? "home"}
    >
      <aside className="sidebar" aria-hidden={!state.sidebarVisible}>
        <div className="drag-zone" />

        <button
          className="rail-btn"
          type="button"
          onClick={() => setSidebarVisible(false)}
          title="Hide sidebar (⌘B)"
          aria-label="Hide sidebar"
          tabIndex={state.sidebarVisible ? 0 : -1}
        >
          <PanelLeftClose size={15} strokeWidth={1.75} />
        </button>

        <button
          className={`rail-btn ${!state.activeProviderId ? "active" : ""}`}
          type="button"
          onClick={showHome}
          title="Home (⌘H)"
          aria-label="Home"
          tabIndex={state.sidebarVisible ? 0 : -1}
        >
          <Home size={15} strokeWidth={1.75} />
        </button>

        <div className="rail-sep" aria-hidden="true" />

        <nav className="provider-rail" aria-label="AI services">
          {state.providers.map((provider) => {
            const isActive = provider.id === state.activeProviderId;
            return (
              <button
                key={provider.id}
                className={`rail-btn provider-btn ${isActive ? "active" : ""}`}
                type="button"
                onClick={() => openProvider(provider.id)}
                style={{ "--prov": provider.accent }}
                title={`${provider.name} (⌘${provider.shortcut})`}
                aria-label={`${provider.name}, command ${provider.shortcut}`}
                tabIndex={state.sidebarVisible ? 0 : -1}
              >
                <img className="prov-icon" src={provider.icon} alt="" draggable="false" data-provider={provider.id} />
              </button>
            );
          })}
        </nav>

        <div className="rail-spacer" />

        <button
          className="rail-btn"
          type="button"
          onClick={cycleTheme}
          title={`Theme: ${state.theme}`}
          aria-label={`Theme: ${state.theme}. Click to cycle.`}
          tabIndex={state.sidebarVisible ? 0 : -1}
        >
          <ThemeIcon size={15} strokeWidth={1.75} />
        </button>
      </aside>

      {!activeProvider && (
        <section className="home" aria-label="Choose an AI service">
          <div className="home-grid">
            {state.providers.map((provider) => (
              <button
                key={provider.id}
                className="home-tile"
                type="button"
                onClick={() => openProvider(provider.id)}
                style={{ "--prov": provider.accent }}
                title={`${provider.name} (⌘${provider.shortcut})`}
                aria-label={`${provider.name}, command ${provider.shortcut}`}
              >
                <img className="home-tile-icon" src={provider.icon} alt="" draggable="false" data-provider={provider.id} />
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
