// Dark-mode palettes adapted from the tweakcn Theme Picker registry.
// Source: https://tweakcn-picker.vercel.app/r/vite/theme-system.json
// Token mapping: background, sidebar, card, popover, foreground,
// muted-foreground, and primary -> Helux's seven Boost fields.

const palette = ([main, sidebar, surface, surfaceRaised, text, muted, accent]) => ({
  main,
  sidebar,
  surface,
  surfaceRaised,
  text,
  muted,
  accent
});

const theme = (id, name, colors) => ({ id, name, palette: palette(colors) });

export const boostThemes = [
  theme("amber-minimal", "Amber Minimal", ["#161616", "#0f0f0f", "#262626", "#262626", "#e4e4e4", "#a4a4a4", "#f49f1e"]),
  theme("bold-tech", "Bold Tech", ["#0f182b", "#0f182b", "#1f1b4e", "#1f1b4e", "#e1e7fd", "#c4b5fc", "#8c5df8"]),
  theme("bubblegum", "Bubblegum", ["#12242e", "#0e1f29", "#1c2e38", "#1c2e38", "#f3e3ea", "#e4a2b1", "#fbe2a7"]),
  theme("caffeine", "Caffeine", ["#121212", "#18181d", "#181818", "#181818", "#eeeeee", "#b4b4b4", "#fcdfc2"]),
  theme("candyland", "Candyland", ["#1b1d22", "#1b1d22", "#2e3437", "#2e3437", "#e4e4e4", "#a4a4a4", "#ff97cc"]),
  theme("catppuccin", "Catppuccin", ["#191928", "#10101a", "#1d1d2d", "#444658", "#ced7f3", "#a6adc8", "#cca7f9"]),
  theme("claude", "Claude", ["#262626", "#1f1f1f", "#262626", "#303030", "#c3c1ba", "#b7b5a6", "#d87757"]),
  theme("claymorphism", "Claymorphism", ["#1e1a16", "#3c3733", "#2d2824", "#2d2824", "#e4e8ef", "#9ba2ae", "#818cf9"]),
  theme("clean-slate", "Clean Slate", ["#0f182b", "#1d293d", "#1d293d", "#1d293d", "#e4e8ef", "#9ba2ae", "#818cf9"]),
  theme("cosmic-night", "Cosmic Night", ["#0e0e18", "#1a1a2f", "#1a1a2f", "#1a1a2f", "#e2e2f8", "#a1a1c3", "#a590ff"]),
  theme("cyberpunk", "Cyberpunk", ["#0b0a1e", "#0b0a1e", "#1d1d3d", "#1d1d3d", "#ebeff5", "#7f84a5", "#fe00c7"]),
  theme("doom-64", "Doom 64", ["#1b1b1b", "#141414", "#2b2b2b", "#2b2b2b", "#e1e1e1", "#a1a1a1", "#e63935"]),
  theme("elegant-luxury", "Elegant Luxury", ["#1e1916", "#1e1916", "#2b2523", "#2b2523", "#f5f5f5", "#d4d4d4", "#ba1f1e"]),
  theme("graphite", "Graphite", ["#1b1b1b", "#1f1f1f", "#1f1f1f", "#1f1f1f", "#dbdbdb", "#808080", "#a1a1a1"]),
  theme("kodama-grove", "Kodama Grove", ["#3a352a", "#3a352a", "#423c31", "#423c31", "#ebe4d6", "#a9a094", "#8aa17a"]),
  theme("midnight-bloom", "Midnight Bloom", ["#1b1d22", "#1b1d22", "#2e3437", "#2e3437", "#e4e4e4", "#a4a4a4", "#6d5de7"]),
  theme("mocha-mousse", "Mocha Mousse", ["#2b2522", "#1e1916", "#3e332c", "#3e332c", "#efefe7", "#c7aa9b", "#c2a08b"]),
  theme("modern-minimal", "Modern Minimal", ["#161616", "#161616", "#262626", "#262626", "#e4e4e4", "#a4a4a4", "#3981f6"]),
  theme("mono", "Mono", ["#090909", "#161616", "#181818", "#262626", "#fcfcfc", "#a1a1a1", "#747474"]),
  theme("nature", "Nature", ["#1c2b1f", "#1c2b1f", "#2b3a2c", "#2b3a2c", "#efeae4", "#d9d0c3", "#4dae50"]),
  theme("neo-brutalism", "Neo Brutalism", ["#000000", "#000000", "#333333", "#333333", "#ffffff", "#cecece", "#ff6364"]),
  theme("northern-lights", "Northern Lights", ["#1b1d22", "#1b1d22", "#2e3437", "#2e3437", "#e4e4e4", "#a4a4a4", "#39a85c"]),
  theme("ocean-breeze", "Ocean Breeze", ["#0f182b", "#1d293d", "#1d293d", "#1d293d", "#d0d4db", "#6c727e", "#39d199"]),
  theme("pastel-dreams", "Pastel Dreams", ["#1e1916", "#3e3248", "#2d2535", "#2d2535", "#e1e7fd", "#9ba2ae", "#c1aaff"]),
  theme("perpetuity", "Perpetuity", ["#0e1a1f", "#0e1a1f", "#0a2026", "#0a2026", "#45e8e8", "#31a5a5", "#45e8e8"]),
  theme("quantum-rose", "Quantum Rose", ["#190a21", "#1b0c24", "#2b1336", "#2b1336", "#feb2fe", "#d57ad5", "#fd6aed"]),
  theme("retro-arcade", "Retro Arcade", ["#002c37", "#002c37", "#0a3642", "#0a3642", "#91a3a3", "#91a3a3", "#d13781"]),
  theme("solar-dusk", "Solar Dusk", ["#1e1916", "#2b2523", "#2b2523", "#2b2523", "#f5f5f5", "#aaa39f", "#f97007"]),
  theme("starry-night", "Starry Night", ["#181a24", "#23243a", "#23243a", "#23243a", "#e8ebf2", "#79879f", "#395aa1"]),
  theme("sunset-horizon", "Sunset Horizon", ["#2c2025", "#2c2025", "#3a2f36", "#3a2f36", "#f1e9e5", "#d6c7bf", "#ff8163"]),
  theme("supabase", "Supabase", ["#121212", "#121212", "#161616", "#242424", "#e4e8ef", "#a1a1a1", "#0d623b"]),
  theme("t3-chat", "T3 Chat", ["#221d27", "#191118", "#2b2631", "#0e0a0d", "#d2c4df", "#c1b4cf", "#a4004c"]),
  theme("tangerine", "Tangerine", ["#1c2433", "#2a3040", "#2a3040", "#272b36", "#e4e4e4", "#a4a4a4", "#df5e3a"]),
  theme("twitter", "Twitter", ["#000000", "#17181d", "#17181d", "#000000", "#e8e8e8", "#70757a", "#1e9cf0"]),
  theme("vercel", "Vercel", ["#000000", "#121212", "#090909", "#121212", "#ffffff", "#a4a4a4", "#ffffff"]),
  theme("vintage-paper", "Vintage Paper", ["#2a2522", "#2a2522", "#3b3129", "#3b3129", "#ebe4d6", "#c4bdb0", "#c2a180"]),
  theme("twitch", "Twitch", ["#09090b", "#060607", "#111115", "#16161a", "#f0eeee", "#8e8e95", "#782ffb"]),
  theme("kick", "Kick", ["#060606", "#030303", "#0a0b0c", "#0e1012", "#ffffff", "#808080", "#93ed00"]),
  theme("spotify", "Spotify", ["#0a0a0a", "#060606", "#121212", "#161616", "#ffffff", "#8f8f8f", "#00a951"]),
  theme("stripe", "Stripe", ["#061c31", "#001226", "#0f253b", "#142a41", "#ebeff2", "#85919a", "#795dff"]),
  theme("github", "GitHub", ["#080c10", "#05080b", "#0e1217", "#12171b", "#c9ced4", "#757b81", "#278733"]),
  theme("windows98", "Windows 98", ["#008080", "#c0c0c0", "#c0c0c0", "#c0c0c0", "#000000", "#ffffff", "#000080"])
];
