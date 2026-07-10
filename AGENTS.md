# Helux Agent Notes

Helux is a small macOS Electron/Vite app that wraps several AI chat services in one native window. It is intentionally minimal: a React-rendered sidebar/home screen controls Electron `WebContentsView` instances that load the provider websites.

## Project Map

- `electron/main.cjs`: main process, window creation, provider `WebContentsView` lifecycle, keyboard shortcuts, preferences, theme resolution, and session setup.
- `electron/providers.cjs`: provider list, URLs, icons, accent colors, and command-number shortcuts.
- `electron/preload.cjs`: safe IPC bridge exposed as `window.aiSwitchboard`.
- `src/App.jsx`: React shell for the sidebar, home picker, theme button, provider buttons, and Boost Studio.
- `src/styles.css`: Helux chrome styling and light/dark CSS variables.
- `public/logos/`: provider icons used by the rail and home grid.

## Run And Verify

- Install dependencies: `npm install`
- Dev app: `npm run dev`
- Renderer build: `npm run build`
- Run built UI: `npm start`
- Package macOS app: `npm run make:mac`

If Electron behaves oddly in a shell, check whether `ELECTRON_RUN_AS_NODE` is set before assuming app code is broken.

## Important Architecture Notes

- The Helux sidebar/home UI and each provider website are separate surfaces. Styling `src/styles.css` only changes Helux chrome, not ChatGPT, Claude, Gemini, etc.
- Provider pages live in Electron `WebContentsView` objects created in `createProviderView(provider)` in `electron/main.cjs`.
- All providers currently share one persistent browser partition: `persist:ai-switchboard-browser`.
- The provider content bounds are controlled by `getContentBounds()` and `resizeActiveView()`. Sidebar width changes must keep those functions in sync.
- `Cmd+B` is intercepted in `before-input-event` so provider pages cannot swallow the sidebar toggle.
- External links from provider pages should open in the user's default browser via `shell.openExternal()`. Keep provider URLs and known auth hosts inside Helux; do not reintroduce general-purpose child browser windows for arbitrary links.
- Theme preference is app-level: `light`, `dark`, or `auto`. It updates Helux shell colors and the native window background.
- Provider color boosts are also persisted in `preferences.json` under `providerBoosts`. A provider value of `null` means no boost. The renderer edits boosts through `window.aiSwitchboard.setProviderBoost()` / `resetProviderBoost()`, and the main process applies them to loaded provider pages.

## UI Style Guidance

- Keep the app quiet and tool-like. Avoid marketing-page layouts, oversized hero copy, or decorative gradients.
- Prefer the existing narrow rail plus centered home grid unless the user asks for a larger navigation change.
- Use the CSS variables in `src/styles.css` for Helux chrome colors:
  - `--bg`
  - `--surface`
  - `--text`
  - `--muted`
  - `--line`
  - `--hover`
- Provider accent colors belong in `electron/providers.cjs`.
- The default dark theme is currently very black: `BG_DARK` in `electron/main.cjs` and `--bg` / `--surface` in `src/styles.css`.

## ChatGPT Color Boost Direction

If the goal is "Arc Boosts for ChatGPT" or any provider because the default UI is too harsh, do not try to solve it only in `src/styles.css`; that cannot reach the loaded provider page.

Current approach:

1. Defaults live in `DEFAULT_PROVIDER_BOOSTS` in `electron/main.cjs`.
2. User edits happen in Boost Studio in `src/App.jsx`.
3. `buildProviderBoostScript()` injects or updates one provider-page style tag and a small observer that recolors hardcoded dark containers.
4. `applyProviderBoost(view, provider)` runs after provider load and whenever a saved palette changes.
5. Keep the palette fields stable unless the renderer is updated too: `main`, `sidebar`, `surface`, `surfaceRaised`, `text`, `muted`, `accent`.
6. `resetProviderBoost()` intentionally disables the boost and reloads the provider view if it is already loaded so inline color overrides disappear.
7. Expect provider DOM class names to change. Use broad CSS variables and stable semantic selectors when available, and keep overrides minimal.

## Caution

- Provider pages are external apps. CSS overrides may need occasional maintenance.
- Avoid injecting JavaScript into provider pages unless CSS is genuinely insufficient.
- Keep boosts reversible and provider-scoped, especially if a future settings UI lets the user toggle them.
- Do not clear the shared provider session while testing visual changes unless the user asks; it signs them out.
