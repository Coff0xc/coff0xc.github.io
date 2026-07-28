export const SITE_URL = 'https://coff0xc.github.io/coff0xcblog/';
export const BASE = '/coff0xcblog/';

/** Prefix an internal path with the GitHub Pages project-page base. */
export function withBase(path: string): string {
  return BASE + path.replace(/^\/+/, '');
}

/** Build an absolute canonical URL for an internal path. */
export function canonicalUrl(path: string): string {
  return SITE_URL + path.replace(/^\/+/, '');
}
