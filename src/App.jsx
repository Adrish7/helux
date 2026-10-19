import { useEffect, useMemo, useState } from "react";
import { Check, Home, Monitor, Moon, Paintbrush, PanelLeftClose, RotateCcw, Search, Sun } from "lucide-react";
import { createRoot } from "react-dom/client";
import { boostThemes } from "./boost-themes";
import "./styles.css";

const fallbackState = {
  activeProviderId: null,
  theme: "auto",
  resolvedTheme: "light",
  sidebarVisible: true,
  providerBoosts: {},
  suggestedProviderBoosts: {},
  providers: []
};

const themeCycle = ["light", "dark", "auto"];
const themeIcons = { light: Sun, dark: Moon, auto: Monitor };
const fallbackBoost = {
  main: "#21170f",
  sidebar: "#2a1f17",
  surface: "#3b2e22",
  surfaceRaised: "#463729",
  text: "#f4eadc",
  muted: "#d4c2aa",
  accent: "#3fad84"
};
const boostFields = [
  { key: "main", label: "Canvas" },
  { key: "sidebar", label: "Sidebar" },
  { key: "surface", label: "Surface" },
  { key: "surfaceRaised", label: "Lift" },
  { key: "text", label: "Text" },
  { key: "muted", label: "Muted" },
  { key: "accent", label: "Accent" }
];

function boostsMatch(first, second) {
  return boostFields.every((field) => first?.[field.key]?.toLowerCase() === second?.[field.key]?.toLowerCase());
}

function getBoost(providerBoosts, suggestedProviderBoosts, providerId) {
  return providerBoosts?.[providerId] ?? suggestedProviderBoosts?.[providerId] ?? fallbackBoost;
}

function ThemeLibrary({ provider, boost, boostEnabled, onApplyTheme }) {
  const [query, setQuery] = useState("");
  const activeThemeId = boostEnabled
    ? boostThemes.find((theme) => boostsMatch(theme.palette, boost))?.id
    : null;
  const filteredThemes = boostThemes.filter((theme) =>
    theme.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <section className="theme-library" aria-labelledby="theme-library-title">
      <div className="theme-library-heading">
        <div>
          <h1 id="theme-library-title">Themes for {provider.name}</h1>
          <p>{boostThemes.length} palettes adapted from the tweakcn theme collection.</p>
        </div>
        {boostEnabled && <span>{activeThemeId ? "Preset active" : "Custom palette"}</span>}
      </div>

      <div className="theme-library-tools">
        <label className="theme-search">
          <Search size={14} strokeWidth={1.9} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search themes"
            aria-label="Search themes"
          />
        </label>
        <span>{filteredThemes.length} shown</span>
      </div>

      <div className="theme-grid" role="group" aria-label="tweakcn themes">
        {filteredThemes.map((theme) => {
          const isActive = theme.id === activeThemeId;
          return (
            <button
              key={theme.id}
              className={`theme-card ${isActive ? "active" : ""}`}
              type="button"
              aria-pressed={isActive}
              aria-label={`Apply ${theme.name} theme to ${provider.name}`}
              onClick={() => onApplyTheme(theme.palette)}
              style={{
                "--theme-main": theme.palette.main,
                "--theme-sidebar": theme.palette.sidebar,
                "--theme-surface": theme.palette.surface,
                "--theme-text": theme.palette.text,
                "--theme-accent": theme.palette.accent
              }}
            >
              <span className="theme-card-name">{theme.name}</span>
              <span className="theme-swatches" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </span>
              <span className="theme-card-check" aria-hidden="true">
                <Check size={13} strokeWidth={2.2} />
              </span>
            </button>
          );
        })}
        {!filteredThemes.length && <p className="theme-empty">No themes match “{query}”.</p>}
      </div>
    </section>
  );
}

function HomeView({ providers, onOpenProvider, onOpenBoostStudio }) {
  return (
    <section className="home" aria-label="Choose an AI service">
      <div className="home-stack">
        <div className="home-grid">
          {providers.map((provider) => (
            <button
              key={provider.id}
              className="home-tile"
              type="button"
              onClick={() => onOpenProvider(provider.id)}
              style={{ "--prov": provider.accent }}
              title={`${provider.name} (⌘${provider.shortcut})`}
              aria-label={`${provider.name}, command ${provider.shortcut}`}
            >
              <img className="home-tile-icon" src={provider.icon} alt="" draggable="false" data-provider={provider.id} />
            </button>
          ))}
        </div>

        <button className="home-boost-btn" type="button" onClick={onOpenBoostStudio}>
          <Paintbrush size={17} strokeWidth={1.85} />
          <span>Boost Studio</span>
        </button>
      </div>
    </section>
  );
}

function BoostStudio({
  providers,
  providerBoosts,
  suggestedProviderBoosts,
  onBack,
  onOpenProvider,
  onChangeBoost,
  onResetBoost
}) {
  const [selectedProviderId, setSelectedProviderId] = useState("chatgpt");

  useEffect(() => {
    if (providers.length && !providers.some((provider) => provider.id === selectedProviderId)) {
      setSelectedProviderId(providers[0].id);
    }
  }, [providers, selectedProviderId]);

  const selectedProvider = providers.find((provider) => provider.id === selectedProviderId) ?? providers[0];
  const boost = getBoost(providerBoosts, suggestedProviderBoosts, selectedProvider?.id);
  const boostEnabled = Boolean(providerBoosts?.[selectedProvider?.id]);
  const activeTheme = boostEnabled ? boostThemes.find((theme) => boostsMatch(theme.palette, boost)) : null;

  if (!selectedProvider) return null;

  const updateColor = (key, value) => {
    onChangeBoost(selectedProvider.id, { ...boost, [key]: value });
  };

  return (
    <section className="boost-studio" aria-label="Boost Studio">
      <div className="boost-topbar">
        <button className="studio-back-btn" type="button" onClick={onBack}>
          <Home size={16} strokeWidth={1.85} />
          <span>Home</span>
        </button>

        <div className="boost-tabs" role="tablist" aria-label="Provider boosts">
          {providers.map((provider) => {
            const isSelected = provider.id === selectedProvider.id;
            return (
              <button
                key={provider.id}
                className={`boost-tab ${isSelected ? "active" : ""}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedProviderId(provider.id)}
                style={{ "--prov": provider.accent }}
              >
                <img className="boost-tab-icon" src={provider.icon} alt="" draggable="false" data-provider={provider.id} />
                <span>{provider.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <ThemeLibrary
        provider={selectedProvider}
        boost={boost}
        boostEnabled={boostEnabled}
        onApplyTheme={(palette) => onChangeBoost(selectedProvider.id, palette)}
      />

      <div className="boost-workspace">
        <div className="boost-controls" style={{ "--boost-accent": boost.accent }}>
          <div className="boost-panel-heading">
            <img className="boost-heading-icon" src={selectedProvider.icon} alt="" draggable="false" data-provider={selectedProvider.id} />
            <div>
              <h1>{selectedProvider.name}</h1>
              <span>{boostEnabled ? `Live Boost · ${activeTheme?.name ?? "Custom"}` : "Boost Off"}</span>
            </div>
          </div>

          <div className="color-grid">
            {boostFields.map((field) => (
              <label className="color-control" key={field.key}>
                <span className="swatch-shell" style={{ "--swatch": boost[field.key] }}>
                  <input
                    type="color"
                    value={boost[field.key]}
                    onChange={(event) => updateColor(field.key, event.target.value)}
                    aria-label={`${field.label} color`}
                  />
                </span>
                <span className="color-meta">
                  <span>{field.label}</span>
                  <code>{boost[field.key].toUpperCase()}</code>
                </span>
              </label>
            ))}
          </div>

          <div className="boost-actions">
            <button className="studio-action" type="button" onClick={() => onResetBoost(selectedProvider.id)}>
              <RotateCcw size={15} strokeWidth={1.85} />
              <span>Reset</span>
            </button>
            <button className="studio-action primary" type="button" onClick={() => onOpenProvider(selectedProvider.id)}>
              <span>Open {selectedProvider.name}</span>
            </button>
          </div>
        </div>

        <BoostPreview provider={selectedProvider} boost={boost} boostEnabled={boostEnabled} />
      </div>
    </section>
  );
}

function BoostPreview({ provider, boost, boostEnabled }) {
  const previewBoost = boostEnabled
    ? boost
    : {
        main: "#0c0c0c",
        sidebar: "#121212",
        surface: "#202020",
        surfaceRaised: "#303030",
        text: "#f3f3f3",
        muted: "#a8a8a8",
        accent: provider.accent
      };

  return (
    <div
      className={`boost-preview ${boostEnabled ? "" : "disabled"}`}
      style={{
        "--boost-main": previewBoost.main,
        "--boost-sidebar": previewBoost.sidebar,
        "--boost-surface": previewBoost.surface,
        "--boost-surface-raised": previewBoost.surfaceRaised,
        "--boost-text": previewBoost.text,
        "--boost-muted": previewBoost.muted,
        "--boost-accent": previewBoost.accent
      }}
      aria-label={`${provider.name} preview`}
    >
      <aside className="preview-sidebar">
        <div className="preview-brand">
          <img src={provider.icon} alt="" draggable="false" data-provider={provider.id} />
          <span>{provider.name}</span>
        </div>
        <div className="preview-nav active" />
        <div className="preview-nav" />
        <div className="preview-nav short" />
        <div className="preview-list">
          <span />
          <span />
          <span />
        </div>
      </aside>

      <div className="preview-main">
        <div className="preview-conversation">
          <div className="preview-message user">Can this feel calmer?</div>
          <div className="preview-message assistant">Yes. This palette is live.</div>
        </div>
        <div className="preview-composer">
          <span>Ask anything</span>
          <button type="button" aria-label="Preview send" />
        </div>
      </div>
    </div>
  );
}

function App() {
  const [state, setState] = useState(fallbackState);
  const [chromeView, setChromeView] = useState("home");

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
    setChromeView("home");
    setState(next);
  };

  const showHome = async () => {
    const next = await window.aiSwitchboard.showHome();
    setChromeView("home");
    setState(next);
  };

  const showBoostStudio = async () => {
    if (state.activeProviderId) {
      const next = await window.aiSwitchboard.showHome();
      setState(next);
    }

    setChromeView("boosts");
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

  const setProviderBoost = async (providerId, boost) => {
    const next = await window.aiSwitchboard.setProviderBoost(providerId, boost);
    setState(next);
  };

  const resetProviderBoost = async (providerId) => {
    const next = await window.aiSwitchboard.resetProviderBoost(providerId);
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

      {!activeProvider && chromeView === "home" && (
        <HomeView providers={state.providers} onOpenProvider={openProvider} onOpenBoostStudio={showBoostStudio} />
      )}

      {!activeProvider && chromeView === "boosts" && (
        <BoostStudio
          providers={state.providers}
          providerBoosts={state.providerBoosts}
          suggestedProviderBoosts={state.suggestedProviderBoosts}
          onBack={showHome}
          onOpenProvider={openProvider}
          onChangeBoost={setProviderBoost}
          onResetBoost={resetProviderBoost}
        />
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
