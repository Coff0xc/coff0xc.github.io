document.addEventListener('DOMContentLoaded', () => {
    // ==================== 常量配置 ====================
    const VALID_LANGS = ['zh', 'en'];
    const VALID_THEMES = ['light', 'dark'];
    const TERMINAL_LINE_DELAY = 150;
    const TERMINAL_RESET_DELAY = 300;

    // ==================== 状态管理 ====================
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const browserLang = navigator.language.startsWith('zh') ? 'zh' : 'en';

    // 安全的 localStorage 读取（带验证）
    let currentLang = localStorage.getItem('lang');
    if (!VALID_LANGS.includes(currentLang)) currentLang = browserLang;

    let currentTheme = localStorage.getItem('theme');
    if (!VALID_THEMES.includes(currentTheme)) currentTheme = prefersDark ? 'dark' : 'light';

    let i18nData = {};
    let okrData = null;

    // ==================== 初始化主题 ====================
    if (currentTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    }

    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('theme')) {
            currentTheme = e.matches ? 'dark' : 'light';
            applyTheme();
        }
    });

    // ==================== 数据加载（单次请求） ====================
    Promise.all([
        fetch('i18n.json').then(res => res.json()),
        fetch('okr-2026.json').then(res => res.json()),
        fetch('projects.json').then(res => res.json()).catch(() => null)
    ]).then(([i18n, okr, projects]) => {
        i18nData = i18n;
        okrData = okr;

        // 使用缓存的 okrData 更新 GitHub Stats（移除重复请求）
        updateGitHubStats(okrData);

        loadOKR(okrData);
        if (projects) loadProjects(projects.projects);
        updateLanguage(currentLang);
        updateThemeButton();
        typeTerminal();
        updateSEO();
    }).catch(err => {
        console.error('Failed to load data:', err);
    });

    // ==================== 事件绑定 ====================
    document.getElementById('lang-toggle').addEventListener('click', toggleLanguage);
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // 键盘快捷键
    document.addEventListener('keydown', e => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key.toLowerCase() === 'l') toggleLanguage();
        if (e.key.toLowerCase() === 't') toggleTheme();
    });

    // ==================== 语言切换 ====================
    function toggleLanguage() {
        currentLang = currentLang === 'en' ? 'zh' : 'en';
        localStorage.setItem('lang', currentLang);
        updateLanguage(currentLang);
        if (okrData) loadOKR(okrData);
        resetTerminal();
        updateSEO();
    }

    // ==================== 主题切换 ====================
    function toggleTheme() {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', currentTheme);
        applyTheme();
    }

    function applyTheme() {
        if (currentTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        updateThemeButton();
    }

    function updateThemeButton() {
        const btn = document.getElementById('theme-toggle');
        const themeText = currentTheme === 'dark'
            ? i18nData[currentLang]?.theme?.light
            : i18nData[currentLang]?.theme?.dark;
        btn.textContent = themeText || (currentTheme === 'dark' ? '☀ Light' : '☾ Dark');
    }

    // ==================== SEO 更新 ====================
    function updateSEO() {
        const seo = i18nData[currentLang]?.seo;
        if (seo) {
            document.title = seo.title;
            document.querySelector('meta[name="description"]')?.setAttribute('content', seo.description);
            document.querySelector('meta[property="og:title"]')?.setAttribute('content', seo.title);
            document.querySelector('meta[property="og:description"]')?.setAttribute('content', seo.description);
        }
    }

    // ==================== GitHub Stats（使用缓存数据） ====================
    function updateGitHubStats(data) {
        const statRepos = document.getElementById('stat-repos');
        const statFollowers = document.getElementById('stat-followers');
        const statStars = document.getElementById('stat-stars');

        if (data?.stats) {
            statRepos.textContent = data.stats.repos || 0;
            statFollowers.textContent = data.stats.followers || 0;
            statStars.textContent = data.stats.stars || 0;
        } else {
            statRepos.textContent = '?';
            statFollowers.textContent = '?';
            statStars.textContent = '?';
        }
    }

    // ==================== OKR 加载（安全 DOM 构建） ====================
    function loadOKR(data) {
        const container = document.getElementById('okr-container');
        if (!container) return;

        container.innerHTML = '';
        Object.entries(data.goals).forEach(([key, goal]) => {
            const goalTitle = i18nData[currentLang]?.okr?.[key] || key;
            const goalHeader = document.createElement('h3');
            goalHeader.style.cssText = 'font-size:12px;margin-top:40px;margin-bottom:20px;color:var(--text)';
            goalHeader.textContent = goalTitle.toUpperCase();
            container.appendChild(goalHeader);

            Object.entries(goal.metrics).forEach(([metricKey, metric]) => {
                // 安全检查：避免除以零
                const progress = metric.target > 0
                    ? Math.min((metric.current / metric.target) * 100, 100)
                    : 0;
                const metricLabel = i18nData[currentLang]?.okr?.metrics?.[metricKey] || metricKey.toUpperCase();

                // 使用安全的 DOM 方法构建（避免 innerHTML XSS）
                const row = document.createElement('div');
                row.className = 'okr-row';

                const info = document.createElement('div');
                info.className = 'okr-info';

                const labelSpan = document.createElement('span');
                labelSpan.textContent = metricLabel;

                const valueSpan = document.createElement('span');
                valueSpan.textContent = `${metric.current.toLocaleString()} / ${metric.target.toLocaleString()} `;
                const percentSpan = document.createElement('span');
                percentSpan.className = 'okr-percent';
                percentSpan.textContent = `(${Math.round(progress)}%)`;
                valueSpan.appendChild(percentSpan);

                info.appendChild(labelSpan);
                info.appendChild(valueSpan);

                const barBg = document.createElement('div');
                barBg.className = 'okr-bar-bg';
                const barFill = document.createElement('div');
                barFill.className = 'okr-bar-fill';
                barFill.style.width = `${progress}%`;
                barBg.appendChild(barFill);

                row.appendChild(info);
                row.appendChild(barBg);
                container.appendChild(row);
            });
        });
    }

    // ==================== 项目加载（安全 DOM 构建） ====================
    function loadProjects(projects) {
        const container = document.getElementById('projects-container');
        if (!container || !projects) return;

        container.innerHTML = '';
        let displayIndex = 0;

        projects.forEach((project) => {
            // 跳过测试仓库
            if (project.name.toLowerCase().includes('test') || (project.stars === 0 && !project.description)) {
                return;
            }

            displayIndex++;
            const card = document.createElement('div');
            card.className = 'item-card';

            const metaNum = String(displayIndex).padStart(2, '0');
            const metaText = project.language !== 'Unknown' ? project.language : 'Project';

            // 使用安全的 DOM 方法构建
            const meta = document.createElement('div');
            meta.className = 'item-meta';
            meta.textContent = `${metaNum} / ${metaText}`;

            const h3 = document.createElement('h3');
            const link = document.createElement('a');
            link.href = project.url;
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = project.name;
            h3.appendChild(link);

            const desc = document.createElement('p');
            desc.textContent = project.description || 'No description available.';

            card.appendChild(meta);
            card.appendChild(h3);
            card.appendChild(desc);

            if (project.stars > 0) {
                const stars = document.createElement('span');
                stars.className = 'project-stars';
                stars.textContent = `★ ${project.stars}`;
                card.appendChild(stars);
            }

            container.appendChild(card);
        });
    }

    // ==================== 国际化更新 ====================
    // 允许 HTML 的 i18n 键（白名单）
    const HTML_ALLOWED_KEYS = ['about.roles_list', 'about.intro'];

    function updateLanguage(lang) {
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const keys = key.split('.');
            let value = i18nData[lang];
            keys.forEach(k => value = value?.[k]);

            if (value) {
                // 安全处理：仅白名单键允许 HTML
                if (HTML_ALLOWED_KEYS.includes(key)) {
                    el.innerHTML = value;
                } else {
                    el.textContent = value;
                }
            }
        });

        updateThemeButton();
        updateActiveNav();
    }

    // ==================== 滚动导航高亮 ====================
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('nav a');

    const observerOptions = { rootMargin: '-20% 0px -70% 0px' };
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                navLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));

    function updateActiveNav() {
        const hash = window.location.hash || '#home';
        navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === hash));
    }

    // ==================== 终端效果 ====================
    const terminalOutput = document.getElementById('terminal-output');
    let lineIdx = 0;
    let terminalTimeout = null;

    function getBootLines() {
        const t = i18nData[currentLang]?.terminal;
        return t ? [t.line1, t.line2, t.line3, t.line4] : [
            "> INITIALIZING_SYSTEM_CORE...",
            "> LOADING_ENCLAVE_MODULES...",
            "> NETWORK_CONNECTION_STABLE",
            "> COFF0XC_SHELL_READY"
        ];
    }

    function typeTerminal() {
        const bootLines = getBootLines();
        if (lineIdx < bootLines.length) {
            const p = document.createElement('div');
            p.className = 'terminal-line';
            p.textContent = bootLines[lineIdx];
            terminalOutput.appendChild(p);
            lineIdx++;
            terminalTimeout = setTimeout(typeTerminal, TERMINAL_LINE_DELAY);
        } else {
            const prompt = i18nData[currentLang]?.terminal?.prompt || 'root@coff0xc:~$';
            const p = document.createElement('div');
            p.className = 'terminal-line cmd';
            // 安全构建 prompt
            const promptText = document.createTextNode(prompt + ' ');
            const cursor = document.createElement('span');
            cursor.className = 'cursor';
            p.appendChild(promptText);
            p.appendChild(cursor);
            terminalOutput.appendChild(p);
        }
    }

    function resetTerminal() {
        clearTimeout(terminalTimeout);
        terminalOutput.innerHTML = '';
        lineIdx = 0;
        setTimeout(typeTerminal, TERMINAL_RESET_DELAY);
    }

    // ==================== 返回顶部 ====================
    const backToTop = document.getElementById('back-to-top');
    window.addEventListener('scroll', () => {
        backToTop.classList.toggle('visible', window.scrollY > 300);
    });
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Nav switch
    window.addEventListener('hashchange', updateActiveNav);
});
