# 🎵 Radio Player HTML5 — Free Web Radio Player for Your Website

[![Live Demo](https://img.shields.io/badge/▶_Live_Demo-online-brightgreen)](https://jailsonsb2.github.io/RadioPlayer/)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![No API Key](https://img.shields.io/badge/API_key-not_required-orange)](#data-sources)
[![PWA Ready](https://img.shields.io/badge/PWA-installable-5A0FC8)](#progressive-web-app-pwa)

**[▶ Try the live demo](https://jailsonsb2.github.io/RadioPlayer/)** — a modern, dependency-free **HTML5 radio player** for any stream (**Icecast, Shoutcast, Zeno.FM, RadioJar, Azuracast** and more): the album art of the current song becomes a blurred full-page backdrop, with glass-style circular controls on top. Now playing metadata, album art, song lyrics, recently played history, **YouTube clip mode** and installable **PWA** — no Bootstrap, no jQuery, no API key. Just HTML, CSS and vanilla JavaScript.

> 🇧🇷 **Player de rádio online para o seu site — grátis e sem chave de API.** Mostra a música tocando agora com capa do álbum, letra da música, histórico das últimas tocadas e até o **clipe do YouTube sincronizado com a rádio**. Compatível com Icecast, Shoutcast, Zeno.FM e Azuracast. É só editar duas linhas e hospedar em qualquer servidor (ou de graça na Vercel/Netlify/GitHub Pages).

## Demo Screenshots

![Demo Screenshot](https://i.imgur.com/BZiHqO2.jpg)

## Features

**Now playing**
* Live song metadata via the [twj.es](https://twj.es) API, with automatic fallback to an alternative endpoint in case of error
* Smart metadata parsing — ICY streams that send `"Artist - Title"` as one string are split correctly, so the artist name is never duplicated on screen
* Album art delivered straight by the API (`albumArt`), with search.php + iTunes as fallbacks — no wrong covers from fuzzy matches
* Blurred full-page backdrop generated from the current cover (1500x1500)
* Lyrics via [lyrics.ovh](https://lyrics.ovh) with [LRCLIB](https://lrclib.net) fallback — no API key required, with request caching

**Recently played**
* The 4 most recent songs, with covers from the search API (iTunes as fallback, filtered to music only)
* The song currently playing is filtered out of the list (no duplicates)
* 🎬 **Clickable history**: songs with a known music video show a play badge — click the card to **watch the clip of a song that already played** (one-off playback: the radio pauses while it plays and resumes when it ends or you pause it; it does not turn clip mode on)
* With clip mode ON, a history clip plays to the end and then the player returns to the video programming (the current song's clip) by itself

**🎬 Clip mode (music video of the current song)**
* When the metadata API returns a `youtubeId` in the now-playing payload, a clip button automatically appears (feature-detected)
* Turned on, the music video takes the place of the album art, synchronized with the radio position (`start = elapsed`)
* Every song change swaps the embed; songs without a clip fall back to the radio automatically
* Pausing the video resumes the radio, playing it again pauses the radio — no external library (YouTube IFrame postMessage)

**Player**
* Smooth volume fade in/out on play/pause (no audio "pop")
* Loading spinner while the stream buffers
* Automatic reconnection with backoff when the network drops
* Volume as a circular button with a slider popover (desktop; on mobile the hardware buttons rule)
* Media Session integration (lock screen / notification controls with artwork)
* Keyboard shortcuts (see below)

**App**
* Responsive design — mobile-first single column, side-by-side layout on desktop
* Progressive Web App (PWA) with an "Install app" button when the browser allows it
* Accent color and surfaces themeable via CSS variables

## How do I add this radio player to my website?

Open [js/script.js](js/script.js) and edit the lines below:

```javascript
// RADIO NAME
const RADIO_NAME = 'Your Radio Name';

// Change Stream URL Here. Supports ICECAST, ZENO, SHOUTCAST, RADIOJAR and any other stream service.
const URL_STREAMING = 'https://stream.zeno.fm/yn65fsaurfhvv';
```

The metadata API URLs are derived from `URL_STREAMING` automatically.

### Change Logo

Open the `img` folder and add your logo named `cover.png` (it is used as the fallback cover, favicon and PWA icon).

### Customizing the Look

All the design tokens live at the top of [css/style.css](css/style.css) as CSS variables — change the accent color, surfaces and radius in one place:

```css
:root {
    --accent: #00e1e7;   /* accent color (slider, live dot glow, focus rings) */
    --bg: #0b0e13;       /* page background */
    --surface: rgba(255, 255, 255, 0.06);  /* glass surfaces */
    --border: rgba(255, 255, 255, 0.12);   /* glass borders */
    --radius: 20px;      /* card corner radius */
}
```

## Installation

Just put the files in your server or use Free Hosting:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jailsonsb2/RadioPlayer)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/jailsonsb2/RadioPlayer)

### Progressive Web App (PWA)

When the browser signals that installation is available, an "Install app" button appears (top-right on desktop, bottom of the screen on mobile).

**Note:** after deploying an update, bump the service worker cache version in `service-worker.js` (`CACHE_NAME`) so returning visitors get the new files.

### Configuring Radio Name and Colors (PWA)

Edit the `manifest.json` file:

1. Locate the `"name"` field and replace it with the name of your radio.
2. If desired, customize `"background_color"` and `"theme_color"` to match your branding.

```json
{
  "name": "Your Radio Name",
  "short_name": "Radio Player",
  "start_url": "/index.html",
  "display": "standalone",
  "background_color": "#0b0e13",
  "theme_color": "#0b0e13",
  "icons": [
    {
      "src": "img/cover.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

## Supported Hosting Types
* Icecast / Shoutcast
* Zeno Radio
* RadioJar
* Azuracast
* Centova Cast
* Everest Cast
* MediaCP
* Sonic Panel

## Data Sources
* [twj.es](https://twj.es) — now playing metadata, song history and album art
* Apple Music / iTunes — cover art fallback
* lyrics.ovh + LRCLIB — lyrics

## Keyboard Controls
* `M` - mute/unmute
* `P` and `space` - play/pause
* `arrow up` and `arrow down` - increase/decrease volume
* `0 to 9` - volume percent

## Related Projects

More free radio players from the same author — pick the style that fits your station:

| Project | Style |
|---|---|
| [**Radioplayer_api**](https://github.com/jailsonsb2/Radioplayer_api) | Multi-station player with **3 switchable layouts** (Retrô Glass, Clássico, Aurora Deck) |
| [**bottom_radioplayer**](https://github.com/jailsonsb2/bottom_radioplayer) | **Bottom-bar component** for websites — the audio never stops while visitors navigate |
| [**Radioplayer_html5**](https://github.com/jailsonsb2/Radioplayer_html5) | Multi-station HTML5 player with API now playing |
| [**RadioPlayer-ZenoRadio**](https://github.com/jailsonsb2/RadioPlayer-ZenoRadio) | Full-page player for **Zeno.FM** streams (SSE metadata) |
| [**metadados**](https://github.com/jailsonsb2/metadados) | The free **now playing API** used by these players (ICY metadata + iTunes + YouTube clips) |

## Feedback

If you have any feedback, please reach out to me at contato@jailson.es


---

## ⚖️ License

This project is licensed under the **GNU AGPL-3.0** (see [LICENSE](LICENSE)): you are free to use, modify and redistribute it — including commercially — provided derivative works remain open source and keep the original copyright notices, **even when offered only as a hosted/network service**.

**Closed-source / commercial licensing:** to embed this code in a proprietary product without AGPL obligations, a separate commercial license is available — contact [contato@jailson.es](mailto:contato@jailson.es).

Copyright (C) 2024-2026 Jailson Bezerra ([@jailsonsb2](https://github.com/jailsonsb2))
