#!/usr/bin/env node
// Fetches the Agent Skill manifest from the coffee-skill repo at build time
// so the /skills/ page always reflects the real, current roster instead of
// a hand-copied, drifting list.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const OWNER = 'Coff0xc';
const REPO = 'coffee-skill';
const OUT_PATH = fileURLToPath(new URL('../src/data/skills-data.json', import.meta.url));

// See fetch-github-data.mjs for why GITHUB_TOKEN/GH_TOKEN are cleared
// before shelling out — `gh auth token` itself echoes them back if set,
// which defeats the point when the one in the environment is stale.
function resolveToken() {
  try {
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

function restHeaders() {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'coff0xcblog-data-fetch' };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  return headers;
}

async function fetchJSON(url) {
  const res = await fetch(url, { headers: restHeaders() });
  if (res.status === 401 && TOKEN) {
    // Stale/invalid token in the environment — retry as a public, anonymous
    // request rather than failing the whole build over it.
    const anonRes = await fetch(url, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'coff0xcblog-data-fetch' },
    });
    if (!anonRes.ok) throw new Error(`${url} -> HTTP ${anonRes.status} (also failed unauthenticated)`);
    return anonRes.json();
  }
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const warnings = [];
  let skills = [];

  try {
    const file = await fetchJSON(`https://api.github.com/repos/${OWNER}/${REPO}/contents/manifest.json`);
    const manifest = JSON.parse(Buffer.from(file.content, 'base64').toString('utf-8'));
    skills = manifest.map((s) => ({
      name: s.name,
      description: s.description || '',
      capabilityDomains: Array.isArray(s.capability_domains) ? s.capability_domains : [],
      securityBoundary: !!s.security_boundary,
    }));
  } catch (err) {
    warnings.push(`manifest fetch failed: ${err.message}`);
  }

  const data = {
    generatedAt: new Date().toISOString(),
    warnings,
    repoUrl: `https://github.com/${OWNER}/${REPO}`,
    skills,
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(data, null, 2));

  if (warnings.length) {
    console.warn('[fetch-skills-data] completed with warnings:');
    for (const w of warnings) console.warn(`  - ${w}`);
  } else {
    console.log('[fetch-skills-data] done ->', OUT_PATH, `(${skills.length} skills)`);
  }
}

main().catch((err) => {
  console.error('[fetch-skills-data] fatal error:', err);
  process.exitCode = 1;
});
