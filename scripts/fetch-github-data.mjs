#!/usr/bin/env node
// Fetches GitHub profile stats, pinned projects, and the contribution calendar
// for the site, using first-party GitHub endpoints only (REST + the same
// public HTML fragment GitHub itself uses to render the profile contribution
// graph). Deliberately avoids third-party stats-card services.
//
// Output: src/data/github-data.json (gitignored — regenerated on every
// `npm run dev` / `npm run build`, see package.json).

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const USERNAME = 'Coff0xc';
const OUT_PATH = fileURLToPath(new URL('../src/data/github-data.json', import.meta.url));

// Prefer a locally authenticated `gh` CLI over env vars: `gh auth token`
// is actively validated/refreshed by gh's own auth store, so it sidesteps
// a stale or wrong-scope GITHUB_TOKEN sitting in the shell environment
// (common on dev machines that also use gh for other tools). Falls back to
// env vars for CI, where gh isn't set up but secrets.GITHUB_TOKEN is.
function resolveToken() {
  try {
    // `gh auth token` itself prioritizes GITHUB_TOKEN/GH_TOKEN env vars over
    // its keyring-stored credential when they're set — so a stale one in the
    // environment would just get echoed straight back. Clear them for this
    // one child process so gh falls back to its actual stored auth.
    const token = execFileSync('gh', ['auth', 'token'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      env: { ...process.env, GITHUB_TOKEN: '', GH_TOKEN: '' },
    }).trim();
    if (token) return token;
  } catch {
    // gh not installed, or not authenticated — fall through.
  }
  return process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
}

const TOKEN = resolveToken();

// Used only if the GraphQL pinned-items query is unavailable (no token, or
// insufficient scope) — snapshot of the real pinned repos as of 2026-07-28.
const PINNED_FALLBACK = [
  'AutoRedTeam-Orchestrator',
  'Github-API-scan',
  'catchclaw',
  'LLM-Security-Assessment-Framework',
  'coffee-skill',
  'vero',
];

function restHeaders() {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'coff0xcblog-data-fetch' };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  return headers;
}

async function fetchJSON(url) {
  const res = await fetch(url, { headers: restHeaders() });
  if (res.status === 401 && TOKEN) {
    // A token is set but GitHub rejected it (stale/invalid env var, wrong
    // scope, etc). These are public read endpoints — retry fully
    // unauthenticated rather than failing the whole build over a bad token.
    const anonRes = await fetch(url, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'coff0xcblog-data-fetch' },
    });
    if (!anonRes.ok) throw new Error(`${url} -> HTTP ${anonRes.status} (also failed unauthenticated)`);
    return anonRes.json();
  }
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

async function fetchProfile() {
  return fetchJSON(`https://api.github.com/users/${USERNAME}`);
}

async function fetchAllRepos() {
  const repos = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await fetchJSON(
      `https://api.github.com/users/${USERNAME}/repos?per_page=100&page=${page}&sort=updated`
    );
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return repos;
}

async function graphql(query, variables) {
  if (!TOKEN) return null;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (json.errors) return null;
  return json.data;
}

async function fetchPinnedNames() {
  const data = await graphql(
    `query($login: String!) {
      user(login: $login) {
        pinnedItems(first: 6, types: [REPOSITORY]) {
          nodes { ... on Repository { name } }
        }
      }
    }`,
    { login: USERNAME }
  );
  const nodes = data?.user?.pinnedItems?.nodes;
  if (!Array.isArray(nodes) || nodes.length === 0) return null;
  return nodes.map((n) => n.name);
}

async function fetchContributionTotals() {
  const data = await graphql(
    `query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar { totalContributions }
          totalCommitContributions
          totalPullRequestContributions
          totalIssueContributions
          totalRepositoryContributions
        }
      }
    }`,
    { login: USERNAME }
  );
  return data?.user?.contributionsCollection ?? null;
}

// Fetch contribution calendar for a specific year
async function fetchContributionCalendarForYear(year) {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const url = `https://github.com/users/${USERNAME}/contributions?from=${from}&to=${to}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (coff0xcblog data fetch script)' },
  });
  if (!response.ok) {
    throw new Error(`contributions endpoint -> HTTP ${response.status}`);
  }

  const html = await response.text();
  const totalMatch = html.match(/([\d,]+)\s+contributions?\s+in\s+(\d{4}|the last year)/);
  const total = totalMatch ? Number(totalMatch[1].replace(/,/g, '')) : 0;

  const dayCells = [];
  const tdRe = /<td\b([^>]*)>\s*<\/td>/g;
  let tdMatch;
  while ((tdMatch = tdRe.exec(html))) {
    const attrs = tdMatch[1];
    if (!attrs.includes('ContributionCalendar-day')) continue;
    const date = attrs.match(/data-date="([\d-]+)"/)?.[1];
    const idMatch = attrs.match(/\bid="(contribution-day-component-(\d+)-(\d+))"/);
    const level = attrs.match(/data-level="(\d)"/)?.[1];
    if (!date || !idMatch || level === undefined) continue;
    dayCells.push({ date, id: idMatch[1], weekday: Number(idMatch[2]), week: Number(idMatch[3]), level: Number(level) });
  }

  const counts = new Map();
  const tooltipRe = /<tool-tip\b([^>]*)>([^<]*)<\/tool-tip>/g;
  let tooltipMatch;
  while ((tooltipMatch = tooltipRe.exec(html))) {
    const forId = tooltipMatch[1].match(/\bfor="([^"]+)"/)?.[1];
    if (!forId) continue;
    const countMatch = tooltipMatch[2].match(/^([\d,]+)/);
    counts.set(forId, countMatch ? Number(countMatch[1].replace(/,/g, '')) : 0);
  }

  const days = dayCells.map((day) => ({
    date: day.date,
    week: day.week,
    weekday: day.weekday,
    level: day.level,
    count: counts.get(day.id) ?? 0,
  }));

  return { year, total, days };
}

// Fetch contribution calendars for multiple years
async function fetchContributionCalendars() {
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2]; // Get last 3 years

  console.log(`[fetch-github-data] Fetching calendars for years: ${years.join(', ')}`);

  const results = await Promise.allSettled(
    years.map(year => fetchContributionCalendarForYear(year))
  );

  const calendars = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const year = years[i];
    if (result.status === 'fulfilled') {
      console.log(`[fetch-github-data] ✓ Year ${year}: ${result.value.total} contributions`);
      calendars.push(result.value);
    } else {
      console.warn(`[fetch-github-data] ✗ Year ${year} failed: ${result.reason.message}`);
    }
  }

  console.log(`[fetch-github-data] Successfully fetched ${calendars.length}/${years.length} calendars`);
  return calendars;
}

// Label the first week-column of each month, skipping labels that would sit
// within 3 columns of the previous one (mirrors GitHub's own spacing rule).
// Emits a 0-11 month index rather than a pre-localized string so the
// component can format it in whichever language is active.
function monthLabels(days) {
  const firstRowOfWeek = new Map();
  for (const d of days) {
    const current = firstRowOfWeek.get(d.week);
    if (!current || d.weekday < current.weekday) firstRowOfWeek.set(d.week, d);
  }
  const weeks = [...firstRowOfWeek.keys()].sort((a, b) => a - b);

  const labels = [];
  let lastMonth = -1;
  let lastLabelWeek = -Infinity;
  for (const w of weeks) {
    const date = new Date(`${firstRowOfWeek.get(w).date}T00:00:00Z`);
    const month = date.getUTCMonth();
    if (month !== lastMonth && w - lastLabelWeek >= 3) {
      labels.push({ week: w, month });
      lastMonth = month;
      lastLabelWeek = w;
    }
  }
  return labels;
}

async function main() {
  const warnings = [];
  const safe = (promise, label, fallback) =>
    promise.catch((err) => {
      warnings.push(`${label}: ${err.message}`);
      return fallback;
    });

  const [profile, repos] = await Promise.all([
    safe(fetchProfile(), 'profile fetch failed', null),
    safe(fetchAllRepos(), 'repos fetch failed', []),
  ]);

  const [pinnedNames, contributionTotals, calendars] = await Promise.all([
    safe(fetchPinnedNames(), 'pinned items fetch failed', null),
    safe(fetchContributionTotals(), 'contribution totals fetch failed', null),
    safe(fetchContributionCalendars(), 'contribution calendars fetch failed', []),
  ]);

  const repoByName = new Map(repos.map((r) => [r.name, r]));
  const usedFallbackPinned = !pinnedNames;
  const pinnedOrder = pinnedNames ?? PINNED_FALLBACK;

  const projects = pinnedOrder
    .map((name) => repoByName.get(name))
    .filter(Boolean)
    .map((r) => ({
      name: r.name,
      description: r.description || '',
      url: r.html_url,
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language || 'Unknown',
      updatedAt: r.updated_at,
    }));

  const nonForkRepos = repos.filter((r) => !r.fork);
  const totalStars = nonForkRepos.reduce((sum, r) => sum + r.stargazers_count, 0);

  // Use current year's data for activity metrics, fallback to most recent available
  const currentYearCalendar = calendars.find(c => c.year === new Date().getFullYear()) || calendars[0];

  const data = {
    generatedAt: new Date().toISOString(),
    warnings,
    stats: {
      repos: profile?.public_repos ?? repos.length,
      followers: profile?.followers ?? null,
      stars: totalStars,
    },
    activity: {
      // Use current year's total for activity metrics
      totalContributions: currentYearCalendar?.total ?? contributionTotals?.contributionCalendar?.totalContributions ?? null,
      commits: contributionTotals?.totalCommitContributions ?? null,
      pullRequests: contributionTotals?.totalPullRequestContributions ?? null,
      issues: contributionTotals?.totalIssueContributions ?? null,
      repositoriesContributedTo: contributionTotals?.totalRepositoryContributions ?? null,
    },
    projects,
    projectsMeta: { usedFallbackPinnedList: usedFallbackPinned },
    contributionCalendars: calendars.map(cal => ({
      year: cal.year,
      total: cal.total,
      days: cal.days,
      monthLabels: monthLabels(cal.days),
    })),
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(data, null, 2));

  if (warnings.length) {
    console.warn('[fetch-github-data] completed with warnings:');
    for (const w of warnings) console.warn(`  - ${w}`);
  } else {
    console.log('[fetch-github-data] done ->', OUT_PATH);
  }
}

main().catch((err) => {
  console.error('[fetch-github-data] fatal error:', err);
  process.exitCode = 1;
});
