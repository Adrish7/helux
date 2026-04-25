# Helux

A minimal Electron Mac app for switching between AI chat services in one window.

## Included services

- ChatGPT
- Claude
- Gemini
- Perplexity
- Kimi K2.6

## Development

```bash
npm install
npm run dev
```

To run the already-built app UI directly:

```bash
npm run build
npm start
```

## Package for macOS

```bash
npm run package:mac
```

The packaged `.app` is created under `dist/mac`.

In this workspace, packaging writes to `/tmp/helux-dist` to avoid macOS
file-provider extended attributes in the Documents folder interfering with code
signing.

## Notes

The app uses Electron `WebContentsView` instances rather than iframes. That gives each service a real browser surface with persistent login storage while avoiding the iframe restrictions used by the AI websites.
