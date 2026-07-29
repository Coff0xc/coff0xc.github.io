// Lightweight, zero-infrastructure publishing UI: no OAuth app, no serverless
// auth proxy. You paste a GitHub fine-grained PAT (repo-scoped, Contents:
// read/write) that lives only in this page's memory and is sent
// directly to api.github.com — never through any third-party server.
// Publishing commits straight to `main`, which the existing deploy workflow
// picks up automatically.

const OWNER = 'Coff0xc';
const REPO = 'coff0xcblog';
const BRANCH = 'main';
const BLOG_PATH = 'src/content/blog';
const REPORTS_PATH = 'public/reports';
const AUDIT_LOG_KEY = 'coff0xcblog_admin_audit';
const API = 'https://api.github.com';
let token = '';

type PostType = 'article' | 'report';

interface AuditEntry {
  timestamp: string;
  action: 'login' | 'publish' | 'update' | 'token_clear';
  details: string;
  username?: string;
}

interface PostForm {
  title: string;
  titleEn: string;
  date: string;
  tags: string[];
  summary: string;
  summaryEn: string;
  type: PostType;
  pdfUrl: string;
  body: string;
}

interface CommitFile {
  path: string;
  content: string;
}

function getToken(): string {
  return token;
}

function setToken(value: string) {
  token = value;
}

function addAuditLog(entry: Omit<AuditEntry, 'timestamp'>) {
  const logs = getAuditLogs();
  logs.unshift({
    ...entry,
    timestamp: new Date().toISOString(),
  });
  // 保留最近 100 条记录
  localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs.slice(0, 100)));
}

function getAuditLogs(): AuditEntry[] {
  try {
    return JSON.parse(localStorage.getItem(AUDIT_LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

function clearAuditLogs() {
  localStorage.removeItem(AUDIT_LOG_KEY);
}

async function gh(path: string, init: RequestInit = {}, allowNotFound = false): Promise<any> {
  const token = getToken();
  if (!token) throw new Error('No GitHub token set — paste one above first.');
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  if (res.status === 404 && allowNotFound) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 300)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function utf8ToBase64(str: string): string {
  return arrayBufferToBase64(new TextEncoder().encode(str).buffer);
}

function base64ToUtf8(b64: string): string {
  const binary = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || `post-${Date.now()}`;
}

function yamlEscape(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function buildMarkdown(form: PostForm): string {
  const lines = [
    '---',
    `title: ${yamlEscape(form.title)}`,
    `titleEn: ${yamlEscape(form.titleEn)}`,
    `date: ${form.date}`,
    `tags: [${form.tags.map((t) => yamlEscape(t)).join(', ')}]`,
    `summary: ${yamlEscape(form.summary)}`,
    `summaryEn: ${yamlEscape(form.summaryEn)}`,
    `type: ${form.type}`,
  ];
  if (form.pdfUrl) lines.push(`pdfUrl: ${yamlEscape(form.pdfUrl)}`);
  lines.push('---', '', form.body.trim(), '');
  return lines.join('\n');
}

function parseFrontmatter(raw: string): { data: Record<string, any>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const [, fm, body] = match;
  const data: Record<string, any> = {};
  fm.split('\n').forEach((line) => {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) return;
    const [, key, rawValue] = m;
    if (rawValue.startsWith('[')) {
      data[key] = rawValue
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^"(.*)"$/, '$1'))
        .filter(Boolean);
    } else {
      data[key] = rawValue.replace(/^"(.*)"$/, '$1');
    }
  });
  return { data, body: body.trim() };
}

async function commitFiles(
  files: CommitFile[],
  message: string,
  postPath: string,
  expectedPostSha: string | null
): Promise<string> {
  const ref = await gh(`/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
  const baseCommit = await gh(`/repos/${OWNER}/${REPO}/git/commits/${ref.object.sha}`);
  const currentPost = await gh(
    `/repos/${OWNER}/${REPO}/contents/${postPath}?ref=${baseCommit.sha}`,
    {},
    true
  );
  if ((currentPost?.sha ?? null) !== expectedPostSha) {
    throw new Error('This post changed on GitHub — reload it before publishing.');
  }
  const blobs = await Promise.all(files.map((file) => gh(`/repos/${OWNER}/${REPO}/git/blobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: file.content,
      encoding: 'base64',
    }),
  })));
  const tree = await gh(`/repos/${OWNER}/${REPO}/git/trees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base_tree: baseCommit.tree.sha,
      tree: files.map((file, index) => ({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blobs[index].sha,
      })),
    }),
  });
  const commit = await gh(`/repos/${OWNER}/${REPO}/git/commits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      tree: tree.sha,
      parents: [baseCommit.sha],
    }),
  });
  await gh(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
  return blobs[files.findIndex((file) => file.path === postPath)].sha;
}

async function listPosts(): Promise<Array<{ name: string; path: string }>> {
  const data = await gh(`/repos/${OWNER}/${REPO}/contents/${BLOG_PATH}?ref=${BRANCH}`);
  return (data as any[])
    .filter((f) => f.name.endsWith('.md'))
    .map((f) => ({ name: f.name, path: f.path }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function loadPost(path: string): Promise<{ raw: string; sha: string }> {
  const data = await gh(`/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`);
  return { raw: base64ToUtf8(data.content), sha: data.sha };
}

// ==================== DOM wiring ====================
function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
}

function setStatus(el: HTMLElement, text: string, kind?: 'error' | 'success') {
  el.textContent = text;
  el.classList.remove('error', 'success');
  if (kind) el.classList.add(kind);
}

function initAdminPage() {
  const patInput = $<HTMLInputElement>('pat-input');
  const patSave = $<HTMLButtonElement>('pat-save');
  const patClear = $<HTMLButtonElement>('pat-clear');
  const patStatus = $<HTMLElement>('pat-status');
  const postSelect = $<HTMLSelectElement>('post-select');
  const fTitle = $<HTMLInputElement>('f-title');
  const fTitleEn = $<HTMLInputElement>('f-titleEn');
  const fDate = $<HTMLInputElement>('f-date');
  const fTags = $<HTMLInputElement>('f-tags');
  const fType = $<HTMLSelectElement>('f-type');
  const fSummary = $<HTMLInputElement>('f-summary');
  const fSummaryEn = $<HTMLInputElement>('f-summaryEn');
  const pdfField = $<HTMLElement>('pdf-field');
  const fPdf = $<HTMLInputElement>('f-pdf');
  const fBody = $<HTMLTextAreaElement>('f-body');
  const publishBtn = $<HTMLButtonElement>('publish-btn');
  const publishStatus = $<HTMLElement>('publish-status');

  let currentSlug = '';
  let currentPdfUrl = '';
  let currentPostSha: string | null = null;
  let loadedPostPath = '';

  function resetForm() {
    currentSlug = '';
    currentPdfUrl = '';
    currentPostSha = null;
    loadedPostPath = '';
    fTitle.value = '';
    fTitleEn.value = '';
    fDate.value = new Date().toISOString().slice(0, 10);
    fTags.value = '';
    fType.value = 'article';
    fSummary.value = '';
    fSummaryEn.value = '';
    fBody.value = '';
    fPdf.value = '';
    pdfField.style.display = 'none';
  }

  function updatePdfFieldVisibility() {
    pdfField.style.display = fType.value === 'report' ? 'block' : 'none';
  }

  async function refreshPostList() {
    if (!getToken()) return;
    try {
      const posts = await listPosts();
      const prev = postSelect.value;
      postSelect.innerHTML = '<option value="">— New post —</option>';
      for (const p of posts) {
        const opt = document.createElement('option');
        opt.value = p.path;
        opt.textContent = p.name.replace(/\.md$/, '');
        postSelect.appendChild(opt);
      }
      postSelect.value = prev;
    } catch (err: any) {
      setStatus(patStatus, `Could not list posts: ${err.message}`, 'error');
    }
  }

  patInput.value = getToken() ? '••••••••••••••••' : '';

  patSave.addEventListener('click', async () => {
    const value = patInput.value.trim();
    if (!value || value.startsWith('•')) return;
    setToken(value);
    patInput.value = '••••••••••••••••';
    setStatus(patStatus, 'Token saved to this page.', 'success');

    // 验证 token 并记录审计日志
    try {
      const user = await gh('/user');
      addAuditLog({ action: 'login', details: `Token saved`, username: user.login });
    } catch {
      addAuditLog({ action: 'login', details: `Token saved (validation failed)` });
    }

    refreshPostList();
    renderAuditLogs();
  });

  patClear.addEventListener('click', () => {
    setToken('');
    patInput.value = '';
    setStatus(patStatus, 'Token cleared.');
    postSelect.innerHTML = '<option value="">— New post —</option>';
    addAuditLog({ action: 'token_clear', details: 'Token removed from page memory' });
    renderAuditLogs();
  });

  fType.addEventListener('change', updatePdfFieldVisibility);

  postSelect.addEventListener('change', async () => {
    if (!postSelect.value) {
      resetForm();
      publishBtn.disabled = false;
      return;
    }
    const selectedPath = postSelect.value;
    loadedPostPath = '';
    publishBtn.disabled = true;
    try {
      const { raw, sha } = await loadPost(selectedPath);
      if (postSelect.value !== selectedPath) return;
      const { data, body } = parseFrontmatter(raw);
      currentSlug = selectedPath.split('/').pop()!.replace(/\.md$/, '');
      currentPdfUrl = data.pdfUrl || '';
      currentPostSha = sha;
      loadedPostPath = selectedPath;
      fTitle.value = data.title || '';
      fTitleEn.value = data.titleEn || '';
      fDate.value = (data.date || '').slice(0, 10);
      fTags.value = Array.isArray(data.tags) ? data.tags.join(', ') : '';
      fType.value = data.type === 'report' ? 'report' : 'article';
      fSummary.value = data.summary || '';
      fSummaryEn.value = data.summaryEn || '';
      fBody.value = body;
      updatePdfFieldVisibility();
      setStatus(publishStatus, `Editing ${selectedPath}`);
      publishBtn.disabled = false;
    } catch (err: any) {
      if (postSelect.value !== selectedPath) return;
      setStatus(publishStatus, `Could not load post: ${err.message}`, 'error');
    }
  });

  publishBtn.addEventListener('click', async () => {
    publishBtn.disabled = true;
    postSelect.disabled = true;
    setStatus(publishStatus, 'Publishing…');
    try {
      if (postSelect.value !== loadedPostPath) {
        throw new Error('Wait for the selected post to finish loading.');
      }
      if (!fTitle.value.trim() || !fTitleEn.value.trim() || !fBody.value.trim()) {
        throw new Error('Title (both languages) and body are required.');
      }

      const slug = currentSlug || slugify(fTitleEn.value || fTitle.value);
      const form: PostForm = {
        title: fTitle.value.trim(),
        titleEn: fTitleEn.value.trim(),
        date: fDate.value || new Date().toISOString().slice(0, 10),
        tags: fTags.value.split(',').map((t) => t.trim()).filter(Boolean),
        summary: fSummary.value.trim(),
        summaryEn: fSummaryEn.value.trim(),
        type: fType.value as PostType,
        pdfUrl: fType.value === 'report' ? currentPdfUrl : '',
        body: fBody.value,
      };

      const files: CommitFile[] = [];

      if (form.type === 'report' && fPdf.files && fPdf.files[0]) {
        const file = fPdf.files[0];
        setStatus(publishStatus, 'Preparing PDF…');
        const buffer = await file.arrayBuffer();
        const pdfPath = `${REPORTS_PATH}/${slug}.pdf`;
        form.pdfUrl = `/reports/${slug}.pdf`;
        files.push({ path: pdfPath, content: arrayBufferToBase64(buffer) });
      }

      setStatus(publishStatus, 'Committing post…');
      const markdown = buildMarkdown(form);
      const postPath = `${BLOG_PATH}/${slug}.md`;
      files.push({ path: postPath, content: utf8ToBase64(markdown) });
      const publishedPostSha = await commitFiles(
        files,
        `content(blog): ${currentSlug ? 'update' : 'publish'} ${slug}`,
        postPath,
        currentPostSha
      );

      const action = currentSlug ? 'update' : 'publish';
      addAuditLog({
        action,
        details: `${action === 'update' ? 'Updated' : 'Published'} post: ${slug}.md (${form.type})`
      });

      currentSlug = slug;
      currentPdfUrl = form.pdfUrl;
      currentPostSha = publishedPostSha;
      setStatus(publishStatus, `Published ${slug}.md — the site will redeploy automatically in a minute or two.`, 'success');
      await refreshPostList();
      renderAuditLogs();
    } catch (err: any) {
      setStatus(publishStatus, err.message || String(err), 'error');
    } finally {
      publishBtn.disabled = false;
      postSelect.disabled = false;
    }
  });

  function renderAuditLogs() {
    const auditContainer = $<HTMLElement>('audit-logs');
    const logs = getAuditLogs();

    auditContainer.replaceChildren();

    if (logs.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'audit-empty';
      empty.textContent = 'No activity yet.';
      auditContainer.appendChild(empty);
      return;
    }

    for (const log of logs) {
      const time = new Date(log.timestamp).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      const actionLabel = {
        login: '🔑 登录',
        publish: '📝 发布',
        update: '✏️ 更新',
        token_clear: '🗑️ 清除令牌'
      }[log.action] || log.action;

      const entry = document.createElement('div');
      entry.className = 'audit-entry';
      const fields = [
        ['audit-time', time],
        ['audit-action', actionLabel],
        ['audit-details', log.details],
        ...(log.username ? [['audit-user', `@${log.username}`]] : []),
      ];
      for (const [className, text] of fields) {
        const field = document.createElement('span');
        field.className = className;
        field.textContent = text;
        entry.appendChild(field);
      }
      auditContainer.appendChild(entry);
    }
  }

  const clearAuditBtn = $<HTMLButtonElement>('clear-audit');
  clearAuditBtn.addEventListener('click', () => {
    if (confirm('确定要清除所有审计日志吗？')) {
      clearAuditLogs();
      renderAuditLogs();
    }
  });

  resetForm();
  refreshPostList();
  renderAuditLogs();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminPage);
} else {
  initAdminPage();
}
