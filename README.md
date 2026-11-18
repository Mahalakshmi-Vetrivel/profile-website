# Mahalakshmi Vetrivel — Profile Website + CI/CD Pipeline

A single-page personal profile website built with **HTML5, CSS3 and vanilla JavaScript only** (no frameworks, no libraries, no npm packages in the site), deployed to **GitHub Pages** by **GitHub Actions**.

**Live site:** https://mahalakshmi-vetrivel.github.io/profile-website/

## Sections

| # | Section | id | What it shows |
|---|---|---|---|
| 1 | Hero | `#hero` | Name, typing tagline, illustrated avatar, "Explore My Journey →" button |
| 2 | Professional Journey | `#journey` | "By the numbers" count-up strip, CSS timeline (school → B.E. ECE → internships → Psiog), project spotlight with "how it works" flows |
| 3 | Personal Likings | `#interests` | Card grid (3 / 2 / 1 columns, short last row centred): music, movies, food, travel, data |
| 4 | Family | `#family` | Group banner + flip cards with a warm sub-palette |
| 5 | Hobbies & Passions | `#hobbies` | 6-tile masonry gallery with a vanilla-JS lightbox |
| 6 | Footer | `#footer` | "How this site is built" CI/CD pipeline, LinkedIn, GitHub, email, build credit, auto year, back-to-top |

**Extra touches:** scroll progress bar, section dots (desktop), soft cursor glow in the hero and 3D tilt on the interest cards (mouse only), and an animated circle reveal when switching theme. Every animation respects `prefers-reduced-motion`.

## One-file theming

Every colour, font, size, spacing value, radius, shadow and animation speed lives in **`css/theme.css`** as a CSS variable. `css/style.css` only uses `var(--...)`. Changing `theme.css` re-themes the whole site — no HTML or `style.css` edits. The site ships with a light theme (default) and a dark theme (toggle button, remembered with `localStorage`).

## Project structure

```
index.html            single page (all sections)
css/theme.css         ALL design variables (light, dark, family sub-palette)
css/style.css         layout + components (var() only)
js/main.js            navigation, theme, timeline, reveal, flip cards, lightbox, year,
                      progress bar, section dots, glow, tilt, typing tagline, count-up
images/               hero/ journey/ interests/ family/ hobbies/  (SVG illustrations)
.github/workflows/    validate, deploy, pr-checks, lighthouse, notify
.htmlhintrc           HTMLHint rules       .csslintrc   CSSLint rules
```

## GitHub Actions

| Workflow | File | Runs when | Does |
|---|---|---|---|
| Validate HTML & CSS | `validate.yml` | every push, PRs to main/develop | HTMLHint, CSSLint, csstree-validator |
| Deploy to GitHub Pages | `deploy.yml` | push to `main` | uploads the site and deploys it |
| PR Quality Checks | `pr-checks.yml` | PRs to main/develop | `<title>`, `alt` and `console.log` checks → `all-checks-passed` |
| Lighthouse Audit | `lighthouse.yml` | after a successful deploy, Mondays 09:00 UTC | audits the live URL, uploads report (30 days) |
| Deployment Notification | `notify.yml` | after every deploy | success/failure summary, optional Slack via `SLACK_WEBHOOK_URL` |

## Run locally

Double-click `index.html`, or for a local server (recommended): `python -m http.server 8000` and open http://localhost:8000.

## Branching

`main` (production, protected) ← `develop` (integration) ← `feature/*`, `theme/*`, `ci/*`. Every change goes through a pull request with a review.

Full beginner instructions: see [PROJECT_GUIDE.md](PROJECT_GUIDE.md).

---
Built with HTML, CSS & JS | Deployed via GitHub Actions
