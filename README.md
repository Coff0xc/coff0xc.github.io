# coff0xcblog

Source for [coff0xc.github.io/coff0xcblog](https://coff0xc.github.io/coff0xcblog/) — personal site and blog. Built with [Astro](https://astro.build).

## Stack

- Astro (static output, no UI framework — plain components + a small vanilla client script)
- Content collections (Markdown + frontmatter) for blog posts, articles, and reports
- `scripts/fetch-github-data.mjs` pulls live profile stats, pinned projects, and the contribution calendar straight from GitHub's REST/GraphQL APIs and its public `contributions` endpoint (no third-party stats-card service)
- `scripts/fetch-skills-data.mjs` pulls the Agent Skill manifest from [coffee-skill](https://github.com/Coff0xc/coffee-skill) so the `/skills/` page never drifts from the real roster

## Develop

```bash
npm install
npm run dev
```

`npm run dev` / `npm run build` both run `npm run fetch-data` first to regenerate `src/data/github-data.json` and `src/data/skills-data.json` (both gitignored — always fetched fresh, never committed).

Both fetch scripts try a locally authenticated `gh` CLI first (`gh auth token`, with `GITHUB_TOKEN`/`GH_TOKEN` cleared for that call so a stale env var can't shadow it), then fall back to `GH_TOKEN`/`GITHUB_TOKEN` env vars. Without any token at all, they still work — pinned projects fall back to a hardcoded snapshot list, and contribution totals come from the public contributions page instead of GraphQL.

## Content

- Blog posts: `src/content/blog/*.md` — frontmatter: `title`, `titleEn`, `date`, `tags`, `summary`, `summaryEn`, `type` (`article` | `report`), optional `pdfUrl` (e.g. `/reports/foo.pdf`, file goes in `public/reports/`)
- Skills: nothing to maintain here — `/skills/` is generated entirely from the coffee-skill repo's `manifest.json` at build time
- UI copy / translations: `src/data/i18n.ts`
- The "2026 Activity" section on the homepage shows real GitHub activity numbers only — there are no fabricated goal targets. Edit `src/components/ActivitySection.astro` if you want to add real target values later.

## Publishing without touching code

`/admin/` is a zero-infrastructure publishing UI — no OAuth app, no serverless auth proxy. Paste a GitHub fine-grained PAT scoped to just this repo (**Contents: Read and write**); it's stored only in that browser's `localStorage` and talks directly to `api.github.com`. Publishing commits straight to `main`, which `deploy.yml` picks up automatically.

Trade-off: GitHub Pages can't do server-side auth, so `/admin/` itself is reachable by anyone (it's `noindex`'d and left out of the sitemap, but not access-controlled) — without a valid PAT pasted in, though, nobody can actually publish anything. Rotate the PAT if it ever leaks.

## Deploy

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages (project page, `base: /coff0xcblog`) on push to `main`, on a daily schedule (keeps stats/heatmap fresh even without new commits), and on manual dispatch. Uses the repo's default `GITHUB_TOKEN` — no extra secrets required. In the repo settings, set **Pages → Source → GitHub Actions**.
