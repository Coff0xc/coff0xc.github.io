document.addEventListener('DOMContentLoaded', () => {
    // 系统主题检测
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const browserLang = navigator.language.startsWith('zh') ? 'zh' : 'en';

    let currentLang = localStorage.getItem('lang') || browserLang;
    let currentTheme = localStorage.getItem('theme') || (prefersDark ? 'dark' : 'light');
    let i18nData = {};
    let okrData = null;

    // Apply saved theme
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

    // Load data
    Promise.all([
        fetch('i18n.json').then(res => res.json()),
        fetch('okr-2026.json').then(res => res.json()),
        fetch('projects.json').then(res => res.json()).catch(() => null)
    ]).then(([i18n, okr, projects]) => {
        i18nData = i18n;
        okrData = okr;
        loadOKR(okrData);
        if (projects) loadProjects(projects.projects);
        updateLanguage(currentLang);
        updateThemeButton();
        typeTerminal();
        updateSEO();
    });

    // Language toggle
    document.getElementById('lang-toggle').addEventListener('click', toggleLanguage);

    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // 键盘快捷键
    document.addEventListener('keydown', e => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key.toLowerCase() === 'l') toggleLanguage();
        if (e.key.toLowerCase() === 't') toggleTheme();
    });

    function toggleLanguage() {
        currentLang = currentLang === 'en' ? 'zh' : 'en';
        localStorage.setItem('lang', currentLang);
        updateLanguage(currentLang);
        if (okrData) loadOKR(okrData);
        resetTerminal();
        updateSEO();
    }

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

    function updateSEO() {
        const seo = i18nData[currentLang]?.seo;
        if (seo) {
            document.title = seo.title;
            document.querySelector('meta[name="description"]')?.setAttribute('content', seo.description);
            document.querySelector('meta[property="og:title"]')?.setAttribute('content', seo.title);
            document.querySelector('meta[property="og:description"]')?.setAttribute('content', seo.description);
        }
    }

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
                const progress = Math.min((metric.current / metric.target) * 100, 100);
                const metricLabel = i18nData[currentLang]?.okr?.metrics?.[metricKey] || metricKey.toUpperCase();

                const row = document.createElement('div');
                row.className = 'okr-row';
                row.innerHTML = `
                    <div class="okr-info">
                        <span>${metricLabel}</span>
                        <span>${metric.current.toLocaleString()} / ${metric.target.toLocaleString()} <span class="okr-percent">(${Math.round(progress)}%)</span></span>
                    </div>
                    <div class="okr-bar-bg">
                        <div class="okr-bar-fill" style="width: ${progress}%"></div>
                    </div>
                `;
                container.appendChild(row);
            });
        });
    }

    function loadProjects(projects) {
        const container = document.getElementById('projects-container');
        if (!container || !projects) return;

        container.innerHTML = '';
        projects.forEach((project, index) => {
            // 跳过测试仓库
            if (project.name.toLowerCase().includes('test') || project.stars === 0 && !project.description) {
                return;
            }

            const card = document.createElement('div');
            card.className = 'item-card';

            const metaNum = String(index + 1).padStart(2, '0');
            const metaText = project.language !== 'Unknown' ? project.language : 'Project';

            card.innerHTML = `
                <div class="item-meta">${metaNum} / ${metaText}</div>
                <h3><a href="${project.url}" target="_blank" rel="noopener">${project.name}</a></h3>
                <p>${project.description || 'No description available.'}</p>
                ${project.stars > 0 ? `<span class="project-stars">★ ${project.stars}</span>` : ''}
            `;
            container.appendChild(card);
        });
    }

    function updateLanguage(lang) {
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const keys = key.split('.');
            let value = i18nData[lang];
            keys.forEach(k => value = value?.[k]);
            if (value) el.innerHTML = value;
        });

        updateThemeButton();
        updateActiveNav();
    }

    // 滚动导航高亮 (Intersection Observer)
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

    // Terminal
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
            terminalTimeout = setTimeout(typeTerminal, 150);
        } else {
            const prompt = i18nData[currentLang]?.terminal?.prompt || 'root@coff0xc:~$';
            const p = document.createElement('div');
            p.className = 'terminal-line cmd';
            p.innerHTML = `${prompt} <span class="cursor"></span>`;
            terminalOutput.appendChild(p);
        }
    }

    function resetTerminal() {
        clearTimeout(terminalTimeout);
        terminalOutput.innerHTML = '';
        lineIdx = 0;
        setTimeout(typeTerminal, 300);
    }

    // 返回顶部按钮
    const backToTop = document.getElementById('back-to-top');
    window.addEventListener('scroll', () => {
        backToTop.classList.toggle('visible', window.scrollY > 300);
    });
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Nav switch
    window.addEventListener('hashchange', updateActiveNav);

    // GitHub Stats - 从 OKR JSON 读取，避免 API 限流
    const statRepos = document.getElementById('stat-repos');
    const statFollowers = document.getElementById('stat-followers');
    const statStars = document.getElementById('stat-stars');

    fetch('okr-2026.json')
        .then(res => res.json())
        .then(data => {
            if (data.stats) {
                statRepos.textContent = data.stats.repos || 0;
                statFollowers.textContent = data.stats.followers || 0;
                statStars.textContent = data.stats.stars || 0;
            }
        })
        .catch(() => {
            statRepos.textContent = '?';
            statFollowers.textContent = '?';
            statStars.textContent = '?';
        });
});
