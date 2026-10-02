# Research workbench: assets and maintenance

The desk models, signal animation, page layout, and interaction code are original implementations for this project. The workbench takes visual inspiration from [Zhuoyuan Li's studio](https://zhuoyuan.li/studio); no code, models, or artwork from that website are included.

## Third-party components

- **Three.js 0.180.0**: `js/vendor/three/three.module.js` and `three.core.js`. MIT license, copyright Three.js Authors. The complete license is retained in `js/vendor/three/LICENSE`. Upstream: <https://github.com/mrdoob/three.js/tree/r180>. Files obtained from the versioned npm distribution through jsDelivr. Both modules are served locally, with no runtime CDN dependency.
- **Natural Earth, 1:110m Admin 0 – Countries**: `assets/studio/countries.geojson`. Public-domain geographic data under the [Natural Earth terms of use](https://www.naturalearthdata.com/about/terms-of-use/). Source: <https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson>. The local copy retains country names and geometry, removes unused attributes, and rounds coordinates to three decimal places for this small decorative globe. It is not a navigation or boundary reference.
- The ECG waveform is synthesized from Gaussian P/QRS/T components; it contains no patient data and does not perform medical measurements.

## Updating the studio

- Entry page: `studio/index.html`; styling: `css/studio.css`.
- Project links and descriptions are accessible HTML in the project dialog. Keep them consistent with the publications on `index.html`.
- Education location text and coordinates are in `places` in `js/studio.js`. Singapore / NUS is the current PhD location, confirmed by the author; Shenyang and Dundee represent previous undergraduate joint training. These markers do not imply visits or conference attendance. Reset / Home returns to Singapore.
- Desk geometry, globe rendering, and synthetic signal drawing are in `js/studio-scene.js`. The globe uses a locally generated CanvasTexture from the GeoJSON; no external images or model downloads are required.
- Serve the repository over HTTP and visit `/studio/`. `/studio/#atlas` opens the globe directly. This page requires no package installation or build step.
- Controls below the scene provide keyboard-accessible alternatives to raycasting. The globe supports drag, pinch, wheel, arrow keys, `+` / `-`, and `Home`.
- Picking uses mesh surfaces only; decorative outlines cannot steal clicks from adjacent objects. The computer, globe, notebook, and keyboard have separate scene groups and actions. Noninteractive surfaces block selection of hidden objects.
- The keyboard opens a small client-side terminal with `help`, `projects`, `globe`, `notes`, `email`, and `clear` commands. These only navigate the workbench; they do not execute shell commands.
- The envelope opens a letter composer addressed to `xidong03@163.com`. Subject and body are URL-encoded into a `mailto:` link after folding the letter. The visitor reviews and sends in their own email application. There is no mail backend or automatic delivery. Drafts remain in the page when closing/reopening the dialog and are discarded on reload. The Copy letter option includes a manual-copy fallback.
- The studio shares `js/preferences-init.js`, `js/preferences.js`, and `css/preferences.css` with the academic homepage. Preferences use `xw.theme` and `xw.language` in localStorage; blocked storage still permits changes within the current page. A default theme follows the system until the visitor makes an explicit choice. Palette changes also adjust the desk and globe lighting. UI translations are in the shared bilingual catalog; typed letters and terminal history retain their original text.
- The clock uses `Intl.DateTimeFormat` with the fixed `Asia/Singapore` timezone and updates every second, independently of the visitor's timezone. Background tabs stop the clock timer as well as the 3D loop.
- System reduced-motion preferences pause the desk on first load; explicit Resume motion re-enables it. Background tabs stop the rendering loop. Lack of WebGL falls back to an SVG illustration and HTML research/location controls; lack of JavaScript preserves the illustration and research links.

## Verification

The site checker covers the studio HTML, locally loaded CSS, JavaScript module paths, library license, and map structure. GitHub Actions also checks syntax of the two studio modules. Browser verification should include desktop and narrow screens, clicks on the visible centers of each object (checking the specific destination), ECG controls, globe drag/zoom/reset, terminal commands, letter folding/editing/copying and Unicode URL encoding, deep links, Escape/focus restoration, reduced motion, and unavailable WebGL/map data. Verify the mailto destination without opening the mail client or sending a message.
