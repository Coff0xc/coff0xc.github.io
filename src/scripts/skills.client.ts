// Skills page - drawer for viewing skill details

interface Skill {
  name: string;
  description: string;
  capabilityDomains: string[];
  securityBoundary: boolean;
}

interface ParsedSkillInfo {
  useCases: string[];
  technologies: string[];
  manualTrigger: string;
  whenToUse: string;
}

function renderTextItems(
  container: Element,
  values: string[],
  tagName: 'li' | 'span',
  className?: string
) {
  const items = values.map((value) => {
    const item = document.createElement(tagName);
    if (className) item.className = className;
    item.textContent = value;
    return item;
  });
  container.replaceChildren(...items);
}

function parseDescription(desc: string): ParsedSkillInfo {
  const info: ParsedSkillInfo = {
    useCases: [],
    technologies: [],
    manualTrigger: '',
    whenToUse: ''
  };

  // 提取 "Use when" 和 "当用户请求" 之间的内容作为使用场景
  const useWhenMatch = desc.match(/Use when[^：]*[:：]\s*(.+?)[:：]/);
  if (useWhenMatch) {
    info.whenToUse = useWhenMatch[1].trim();
  }

  // 提取中文描述部分的关键场景（冒号后、句号前）
  const chineseMatch = desc.match(/当用户请求[^：]*[:：]\s*(.+?)。/);
  if (chineseMatch) {
    const text = chineseMatch[1];
    // 按标点符号分割成使用场景
    const scenarios = text.split(/[或、,，]/).map(s => s.trim()).filter(s => s.length > 0);
    info.useCases = scenarios.slice(0, 8); // 最多显示8个主要场景
  }

  // 提取技术栈（英文大写词、技术缩写、常见技术名）
  const techPattern = /\b([A-Z]{2,}[A-Z0-9]*|[A-Z][a-z]+(?:\/[A-Z][a-z]+)*|Docker|Kubernetes|K8s|GitHub|GraphQL|OpenAPI|Postgres|Redis|MongoDB)\b/g;
  const techMatches = desc.match(techPattern);
  if (techMatches) {
    info.technologies = [...new Set(techMatches)].slice(0, 12);
  }

  // 提取手动触发命令
  const triggerMatch = desc.match(/手动触发[:：]\s*(.+?)。/);
  if (triggerMatch) {
    info.manualTrigger = triggerMatch[1].trim();
  }

  return info;
}

function openSkillDrawer(skill: Skill) {
  const overlay = document.getElementById('skill-drawer-overlay');
  if (!overlay) return;

  const parsed = parseDescription(skill.description);

  // 填充基本信息
  const titleEl = overlay.querySelector('.skill-drawer-title');
  const descEl = overlay.querySelector('.skill-drawer-desc');
  const domainsEl = overlay.querySelector('.skill-drawer-domains');
  const badgeEl = overlay.querySelector('.skill-drawer-badge');

  if (titleEl) titleEl.textContent = skill.name;
  if (descEl) descEl.textContent = skill.description;

  if (badgeEl) {
    badgeEl.textContent = skill.securityBoundary ? 'Security Boundary' : 'General';
    badgeEl.className = skill.securityBoundary ? 'skill-drawer-badge security' : 'skill-drawer-badge general';
  }

  if (domainsEl) {
    renderTextItems(domainsEl, skill.capabilityDomains, 'span', 'skill-drawer-domain-tag');
  }

  // 填充使用场景（什么时候用）
  const whenEl = overlay.querySelector('.skill-drawer-when');
  if (whenEl) {
    whenEl.textContent = parsed.whenToUse || '当用户明确指定该技能时';
  }

  // 填充适用场景列表
  const usageEl = overlay.querySelector('.skill-drawer-usage');
  if (usageEl) {
    if (parsed.useCases.length > 0) {
      renderTextItems(usageEl, parsed.useCases, 'li');
      (usageEl as HTMLElement).style.display = 'grid';
    } else {
      usageEl.replaceChildren();
      (usageEl as HTMLElement).style.display = 'none';
    }
  }

  // 填充技术栈
  const techEl = overlay.querySelector('.skill-drawer-keywords');
  if (techEl) {
    const techSection = techEl.parentElement as HTMLElement | null;
    if (parsed.technologies.length > 0) {
      renderTextItems(techEl, parsed.technologies, 'span', 'skill-keyword-tag');
      if (techSection) techSection.style.display = 'block';
    } else {
      techEl.replaceChildren();
      if (techSection) techSection.style.display = 'none';
    }
  }

  // 填充触发命令
  const triggerEl = overlay.querySelector('.skill-drawer-trigger');
  if (triggerEl) {
    triggerEl.textContent = parsed.manualTrigger || `使用 ${skill.name}`;
  }

  // 显示抽屉
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSkillDrawer() {
  const overlay = document.getElementById('skill-drawer-overlay');
  if (!overlay) return;

  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function initSkillsPage() {
  // 为每个技能行添加点击事件
  const skillRows = document.querySelectorAll('.skill-row');
  skillRows.forEach((row) => {
    const skillData = (row as HTMLElement).dataset.skill;
    if (!skillData) return;

    try {
      const skill: Skill = JSON.parse(skillData);
      row.addEventListener('click', () => openSkillDrawer(skill));
    } catch (err) {
      console.error('Failed to parse skill data:', err);
    }
  });

  // 关闭按钮
  const closeBtn = document.getElementById('skill-drawer-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeSkillDrawer);
  }

  // 点击遮罩层关闭
  const overlay = document.getElementById('skill-drawer-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeSkillDrawer();
      }
    });
  }

  // ESC 键关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSkillDrawer();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSkillsPage);
} else {
  initSkillsPage();
}
