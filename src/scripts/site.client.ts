import { i18n, VALID_LANGS, type Lang } from '../data/i18n';

type Theme = 'light' | 'dark';

function detectBrowserLang(): Lang {
  return navigator.language.startsWith('zh') ? 'zh' : 'en';
}

function readStoredLang(): Lang {
  const stored = localStorage.getItem('lang');
  return (VALID_LANGS as string[]).includes(stored ?? '') ? (stored as Lang) : detectBrowserLang();
}

function readCurrentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

let currentLang: Lang = readStoredLang();

function applyTheme(theme: Theme) {
  if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  updateThemeButton();
}

function updateThemeButton() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const theme = readCurrentTheme();
  btn.textContent = theme === 'dark' ? i18n[currentLang].theme.light : i18n[currentLang].theme.dark;
}

function toggleTheme() {
  const next: Theme = readCurrentTheme() === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', next);
  applyTheme(next);
}

function updateSEO() {
  const seo = i18n[currentLang].seo;
  document.title = seo.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', seo.description);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', seo.title);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', seo.description);
}

function updateLanguage(lang: Lang) {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.documentElement.setAttribute('data-lang', lang);

  // Fade out elements
  const i18nElements = document.querySelectorAll<HTMLElement>('[data-i18n]');
  i18nElements.forEach(el => el.style.opacity = '0');

  // Wait for fade out, then update text and fade in
  setTimeout(() => {
    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const value = key.split('.').reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], i18n[lang]);
      if (typeof value !== 'string') return;
      el.textContent = value;
    });

    // Bilingual content baked in at build time for dynamic, non-keyed data
    // (heatmap month labels, day tooltips) — swapped by attribute pair
    // instead of an i18n key lookup.
    document.querySelectorAll<HTMLElement>('[data-zh][data-en]').forEach((el) => {
      el.textContent = lang === 'zh' ? (el.dataset.zh as string) : (el.dataset.en as string);
    });
    document.querySelectorAll<HTMLElement>('[data-tooltip-zh][data-tooltip-en]').forEach((el) => {
      const value = lang === 'zh' ? (el.dataset.tooltipZh as string) : (el.dataset.tooltipEn as string);
      el.setAttribute('data-tooltip', value);
      if (el.hasAttribute('aria-label')) el.setAttribute('aria-label', value);
    });

    updateThemeButton();
    updateActiveNav();
    updateSEO();

    // Fade in elements
    requestAnimationFrame(() => {
      i18nElements.forEach(el => el.style.opacity = '1');
    });
  }, 150);
}

function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'zh' : 'en';
  localStorage.setItem('lang', currentLang);
  updateLanguage(currentLang);
}

// ==================== Nav highlight (hash sections on the homepage, path match elsewhere) ====================
function updateActiveNav() {
  const isHomePage = !!document.getElementById('home');
  const hash = window.location.hash || '#home';
  const path = window.location.pathname.replace(/\/$/, '');

  document.querySelectorAll<HTMLAnchorElement>('nav a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (href.startsWith('#')) {
      a.classList.toggle('active', isHomePage && href === hash);
    } else {
      const hrefPath = href.replace(/\/$/, '');
      a.classList.toggle('active', hrefPath !== '' && path.endsWith(hrefPath));
    }
  });
}

function initScrollSpy() {
  // Only the homepage has hash-anchored sections that nav links point at
  // (#home/#projects/#okr/#about) — other pages (Skills, Blog) also render
  // <section id="..."> elements, but for their own layout purposes, and
  // toggling nav active-state by bare hash there would fight with the
  // path-based matching in updateActiveNav().
  if (!document.getElementById('home')) return;

  const sections = document.querySelectorAll('section[id]');
  if (!sections.length) return;
  const navLinks = document.querySelectorAll('nav a');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    },
    { rootMargin: '-20% 0px -70% 0px' }
  );
  sections.forEach((section) => observer.observe(section));
  window.addEventListener('hashchange', updateActiveNav);
}

// ==================== Heatmap tooltip (floating, escapes .heatmap-wrap's scroll clipping) ====================
function initHeatmapTooltip() {
  const tooltip = document.getElementById('heatmap-tooltip');
  const grid = document.querySelector<HTMLElement>('.heatmap-grid');
  if (!tooltip || !grid) return;

  function show(cell: HTMLElement) {
    const text = cell.getAttribute('data-tooltip');
    if (!text || !tooltip) return;
    tooltip.textContent = text;
    tooltip.style.display = 'block';

    const cellRect = cell.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();

    let top = cellRect.top - tipRect.height - 8;
    if (top < 4) top = cellRect.bottom + 8; // flip below if it would clip off the top of the viewport

    let left = cellRect.left + cellRect.width / 2 - tipRect.width / 2;
    left = Math.max(4, Math.min(left, window.innerWidth - tipRect.width - 4));

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  function hide() {
    if (tooltip) tooltip.style.display = 'none';
  }

  grid.addEventListener('mouseover', (e) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.heatmap-day');
    if (cell) show(cell);
  });
  grid.addEventListener('mouseout', (e) => {
    const cell = (e.target as HTMLElement).closest('.heatmap-day');
    if (cell) hide();
  });
  window.addEventListener('scroll', hide, { passive: true });
}

// ==================== Back to top ====================
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 300);
  });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function init() {
  applyTheme(readCurrentTheme());

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) applyTheme(e.matches ? 'dark' : 'light');
  });

  document.getElementById('lang-toggle')?.addEventListener('click', toggleLanguage);
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

  document.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    if (e.key.toLowerCase() === 'l') toggleLanguage();
    if (e.key.toLowerCase() === 't') toggleTheme();
  });

  updateLanguage(currentLang);
  initScrollSpy();
  initBackToTop();
  initHeatmapTooltip();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
