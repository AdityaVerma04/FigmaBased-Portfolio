# Aditya Verma — UI/UX Designer Portfolio

A personal portfolio website skinned as a Figma workspace — left layers panel, right properties inspector, frame labels, and dot-grid canvas — built with zero dependencies: pure HTML, CSS, and JavaScript.

**Live:** https://adifolio.com/ (replace with your actual URL)

---

## Project structure

```
Portfolio/
├── index.html          # Home page (hero, about, work, toolkit, experience, education, contact)
├── case-study.html     # Single case study template — renders any case study via ?slug=
├── admin.html          # Local-draft CMS for managing case study content
├── css/
│   └── style.css       # Complete design system (tokens, layout, components, animations)
├── js/
│   ├── main.js         # Home page logic (case study grid, filter bar, inspector, layer nav)
│   ├── case-study.js   # Case study detail renderer (content, inspector, scroll progress)
│   └── admin.js        # Admin panel logic (localStorage draft, download, reset)
├── data/
│   └── case-studies.json   # Source of truth for case study content
├── assets/
│   └── cover-namisite.svg  # Placeholder cover image (replace with real images)
├── erd.mermaid         # Entity-relationship diagram (future backend reference)
└── README.md           # This file
```

---

## Local development

No build tools required. Open `index.html` directly in a browser, **or** serve with any static server to avoid `fetch()` cross-origin issues:

```bash
# Option 1 — Python (built-in, most systems)
python -m http.server 3000

# Option 2 — Node (if installed)
npx serve .

# Option 3 — VS Code Live Server extension
# Right-click index.html → "Open with Live Server"
```

Then open `http://localhost:3000` in your browser.

---

## Adding / editing case studies — Admin workflow

The portfolio has no backend. Case study content lives in `data/case-studies.json`. Here's how to update it:

### Step-by-step

1. Open `admin.html` in your browser (served locally — not over `file://`).
2. Select a case study from the left panel, or click **+ New case study**.
3. Fill in the form. Changes auto-save to your browser's `localStorage` — a refresh won't lose them.
4. When you're happy, click **Download case-studies.json**.
5. Replace `data/case-studies.json` in the project folder with the downloaded file.
6. Push the change to GitHub (or re-upload to Netlify) to publish.

### Status values

| Status | Behaviour |
|---|---|
| `published` | Visible on the public site grid |
| `draft` | Hidden from the public grid; editable in admin |
| `hidden` | Excluded everywhere (archived / suppressed) |

### Adding cover images

Place image files in `assets/` (e.g., `assets/cover-myproject.png`) and enter the path `assets/cover-myproject.png` in the **Cover Image URL** field in admin.

### Resetting the draft

If you want to discard your local draft and start fresh from the deployed file, click **Reset to saved file** in the admin panel.

---

## Hosting

Deploy the entire folder as-is to any static host:

- **GitHub Pages** — push to a `gh-pages` branch or set root as publish directory in repo settings.
- **Netlify** — drag-and-drop the folder into the Netlify dashboard, or connect the GitHub repo for continuous deployment.
- **Vercel** — connect the repo; Vercel will detect a static site automatically.

No build step, no environment variables, no server required.

---

## Design concept

The site mimics a Figma workspace:

- **Top toolbar** — file tab, "available for work" status pill, "Get in touch" share button.
- **Left layers panel** — scrollable section navigation; the active section highlights as you scroll.
- **Right properties inspector** — updates its values (frame name, size, fill color, layout, opacity) as each section scrolls into view. This is the signature interaction.
- **Frame labels** — each section has a `◇ Frame · SectionName` label in the top-left corner.
- **Dot-grid canvas** — the page background is a subtle dot grid matching Figma's canvas.
- **Case study card corners** — Figma-style selection handles appear on hover.

Panels collapse on screens narrower than 1100 px so the site remains fully usable on mobile.

---

## Content checklist (for Aditya)

- [ ] Replace seed entries in `data/case-studies.json` with real case studies (use admin.html).
- [ ] Add real cover images to `assets/` and update the `coverImage` field for each case study.
- [ ] Fill in real `problem` / `process` / `outcome` text for the Namisite case study.
- [ ] Update contact links in `index.html` if any details change.
- [ ] Replace the canonical URL and OG URL in `index.html` `<head>` with your actual domain.

---

## Tech stack

| Layer | Choice |
|---|---|
| Structure | HTML5, semantic elements |
| Styling | Vanilla CSS3 (custom properties, Grid, Flexbox) |
| Behaviour | Vanilla JavaScript (ES2020+, `fetch`, `IntersectionObserver`, `localStorage`) |
| Fonts | Google Fonts — Space Grotesk, Inter, IBM Plex Mono (CDN) |
| Build tools | None |
| Hosting | GitHub Pages / Netlify free tier |
