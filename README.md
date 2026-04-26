# Helux

Helux is a simple macOS desktop app for keeping different LLM chats in one
window. It gives you a small native shell around the major AI services, so you
can stay signed in and jump between them without opening a pile of browser tabs.

Each service runs in its own Electron `WebContentsView`, which gives it a real
browser surface with persistent login storage while avoiding the iframe
restrictions used by many AI websites.

## Included services

- Claude
- ChatGPT
- Gemini
- Perplexity
- Kimi K2.6

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Cmd+1` | Open Claude |
| `Cmd+2` | Open ChatGPT |
| `Cmd+3` | Open Gemini |
| `Cmd+4` | Open Perplexity |
| `Cmd+5` | Open Kimi K2.6 |
| `Cmd+H` or `Cmd+0` | Return to the Helux home screen |
| `Cmd+B` | Toggle the sidebar |
| `Cmd+R` | Reload the active service |
| `Cmd+[` | Go back in the active service |
| `Cmd+]` | Go forward in the active service |

The sidebar can be hidden for a cleaner full-window chat view. Use `Cmd+B` to
bring it back.

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
npm run make:mac
```

The downloadable `.dmg` and `.zip` files are created under `release/`.

## Download for macOS

Download the latest macOS release from
[github.com/Adrish7/helux/releases](https://github.com/Adrish7/helux/releases).
Click `Helux-...-mac-universal.dmg`, open the DMG, drag Helux into
Applications, then open Helux from Applications.

Release files are built automatically by GitHub Actions whenever a version tag
is pushed:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The macOS build is universal, so the same download works on both Apple Silicon
Macs and Intel Macs.

### Gatekeeper note

The public workflow can build a working app without Apple credentials, but macOS
may warn that the app is from an unidentified developer. To make the first-open
experience fully smooth for everyone, run a signed release with an Apple
Developer ID certificate:

```bash
npm run make:mac:signed
```

## Notes

Helux shares one persistent browser session across the included services, so
sign-ins survive app restarts and provider switches.
