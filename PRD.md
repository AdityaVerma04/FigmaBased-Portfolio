# Product Requirements Document
**Project:** Aditya Verma — UI/UX Designer Portfolio
**Version:** 1.0 (Static MVP)
**Owner:** Aditya Verma
**Last updated:** June 2026

---

## 1. Overview

A personal portfolio website for Aditya Verma, a UI/UX designer, used to showcase case studies, skills, and experience to recruiters, hiring managers, and potential freelance clients. The site is a static, framework-free build (HTML/CSS/JS) so it can be hosted for free and maintained without a developer.

The visual concept skins the site as a Figma workspace — a properties inspector, a layers-style navigation panel, and frame labels — since Figma is the primary tool used in the work being shown.

## 2. Goals

| Goal | Success looks like |
|---|---|
| Get recruiters to understand design ability in under 30 seconds | Hero + case study grid communicate role and quality at a glance |
| Make case studies easy to read and easy to add to | New case study can be added without touching code |
| Reinforce the personal brand established in the resume | Consistent dark/violet visual language across resume and site |
| Be cheap and simple to host | Deployable on GitHub Pages / Netlify free tier, zero backend cost |

## 3. Target users

1. **Recruiters / hiring managers** — skim in seconds, need to quickly see role, tools, and 1–2 strong case studies.
2. **Design leads / interviewers** — go deeper into 1–2 case studies, want to see process and reasoning, not just final screens.
3. **Aditya (the site owner / admin)** — needs to add or edit a case study without writing code.

## 4. Scope — v1 (this build)

### 4.1 Public site
- **Home** — hero, about, toolkit/skills, experience timeline, education & certifications, contact.
- **Case studies grid** — pulled from `data/case-studies.json`, filterable by status (published/draft/hidden — draft/hidden excluded from public grid... see 4.3).
- **Case study detail page** — single template (`case-study.html`) rendering any case study via a `?slug=` URL parameter. No duplicated HTML per case study.
- **Responsive layout** — usable on mobile; the layers/inspector side panels collapse below 1100px width.

### 4.2 Signature design element
- A right-hand "properties inspector" panel that updates (frame name, size, fill color, layout) as the visitor scrolls past each section, mimicking Figma's real inspector — the one deliberate, memorable visual idea the rest of the site stays disciplined around.

### 4.3 Admin panel (`admin.html`)
- Add / edit / delete case study entries through a form (no JSON hand-editing required).
- Fields: title, client, role, year, status, display order, cover image, tags, tools, summary, problem, process, outcome, live URL, Figma URL.
- Live JSON preview of the current working data.
- **Download case-studies.json** button to export the edited dataset.
- Work-in-progress auto-saves to the browser's `localStorage` so a refresh doesn't lose edits.

**Important constraint or this is the single most-likely point of confusion:** this is a static site with no backend, so the admin panel cannot publish changes live by itself. Saving in the admin panel updates the *local browser draft* only. Publishing requires downloading the JSON file and replacing `data/case-studies.json` in the project, then redeploying. This is explained in-product (banner on `admin.html`) and in `README.md`.

## 5. Out of scope for v1 (future enhancements)

These would require a backend or third-party service and are intentionally excluded from the static MVP:

| Feature | What it would need |
|---|---|
| One-click publish (no manual redeploy) | A small backend (e.g. serverless function) or a Git-based headless CMS (e.g. Decap CMS) that commits the JSON file via the GitHub API on save |
| Real login/auth on admin panel | Backend + session/auth (currently anyone with the URL can open `admin.html` — acceptable only because it edits a local draft, not live data) |
| Contact form that emails/stores submissions | Backend or a form service (e.g. Formspree) — `CONTACT_MESSAGE` entity in the ERD is reserved for this |
| Image upload/storage | Object storage (e.g. S3/Cloudinary) — v1 expects image URLs or local `assets/` paths |
| Analytics on case study views | Lightweight analytics script (e.g. Plausible) |
| Multi-author support | Real `ADMIN_USER` table with auth — reserved in the ERD, unused in v1 |

## 6. Data model

See `erd.mermaid` for the full diagram. Summary:

- **CaseStudy** is the core entity — everything else hangs off it.
- **Tag** and **Tool** are many-to-many with CaseStudy (a case study can have several tags/tools; a tag/tool can apply to several case studies).
- **MediaAsset** is one-to-many — a case study can have several supporting images beyond the cover.
- **AdminUser** and **ContactMessage** are modeled for future use (real backend) but not implemented in v1 — v1 has a single owner/admin and no backend-stored contact submissions.

In the v1 static implementation, Tag/Tool are simplified to string arrays directly on the case study object (`tags: []`, `tools: []`) rather than separate joined tables, since there's no real database yet. The ERD models the "proper" relational version for when/if this moves to a backend.

## 7. Tech stack (v1)

- HTML5, CSS3 (custom properties, CSS Grid/Flexbox, no framework)
- Vanilla JavaScript (`fetch`, `IntersectionObserver`, `localStorage`)
- Google Fonts (Space Grotesk, Inter, IBM Plex Mono) loaded via CDN
- No build tools, no package manager required to run it

## 8. Non-functional requirements

- **Performance:** no external JS frameworks; should load fast on 3G/4G.
- **Accessibility:** semantic headings, alt text fields on case study images, sufficient color contrast on text against the dark canvas (verify any custom color tweaks against WCAG AA).
- **Browser support:** modern evergreen browsers (Chrome, Edge, Safari, Firefox — current and one version back).
- **Hosting cost:** $0 (static hosting on GitHub Pages or Netlify free tier).

## 9. Content requirements (action items for Aditya)

- [ ] Replace the two seed/sample entries in `data/case-studies.json` with real case studies.
- [ ] Add real cover images and screenshots to `assets/`.
- [ ] Fill in real `problem` / `process` / `outcome` text for the Namisite case study (currently placeholder language).
- [ ] Decide whether to name the specific 2–3 client apps referenced in the Namisite case study.

## 10. Risks & assumptions

- **Assumption:** Aditya is comfortable doing one manual "download → replace file → redeploy" step per content update. If this becomes too frequent/annoying, revisit the CMS/backend option in Section 5.
- **Risk:** `admin.html` is publicly reachable if deployed at a guessable URL. Since it only edits a local draft (not live data), worst case is someone else's draft confusion in their own browser — it cannot vandalize the live site. Still, consider not linking to `/admin.html` from public navigation, or password-gating it later if a real backend is added.
- **Assumption:** content (case study text) is written/owned by Aditya; this PRD does not cover copywriting.
