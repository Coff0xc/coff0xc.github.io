document.addEventListener('DOMContentLoaded', () => {
    let currentLang = localStorage.getItem('lang') || 'en';
    let i18nData = {};
    let okrData = null;

    // Load data
    Promise.all([
        fetch('i18n.json').then(res => res.json()),
        fetch('okr-2026.json').then(res => res.json())
    ]).then(([i18n, okr]) => {
        i18nData = i18n;
        okrData = okr;
        loadOKR(okrData);
        updateLanguage(currentLang);
    });

    document.getElementById('lang-toggle').addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'zh' : 'en';
        localStorage.setItem('lang', currentLang);
        updateLanguage(currentLang);
        if (okrData) loadOKR(okrData);
    });

    function loadOKR(data) {
        const container = document.getElementById('okr-container');
        if (!container) return;

        container.innerHTML = '';
        Object.entries(data.goals).forEach(([key, goal]) => {
            const goalTitle = i18nData[currentLang]?.okr?.[key] || key;
            const goalHeader = document.createElement('h3');
            goalHeader.style.fontSize = '12px';
            goalHeader.style.marginTop = '40px';
            goalHeader.style.marginBottom = '20px';
            goalHeader.style.color = 'var(--text)';
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
                        <span>${metric.current.toLocaleString()} / ${metric.target.toLocaleString()}</span>
                    </div>
                    <div class="okr-bar-bg">
                        <div class="okr-bar-fill" style="width: ${progress}%"></div>
                    </div>
                `;
                container.appendChild(row);
            });
        });
    }

    function updateLanguage(lang) {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const keys = key.split('.');
            let value = i18nData[lang];
            keys.forEach(k => value = value?.[k]);
            if (value) el.innerHTML = value;
        });

        // Active Nav State
        document.querySelectorAll('nav a').forEach(a => {
            if (a.getAttribute('href') === window.location.hash) {
                a.classList.add('active');
            } else {
                a.classList.remove('active');
            }
        });
    }

    // Terminal - Pure Minimalism
    const terminalOutput = document.getElementById('terminal-output');
    const bootLines = [
        "> INITIALIZING_SYSTEM_CORE...",
        "> LOADING_ENCLAVE_MODULES...",
        "> NETWORK_CONNECTION_STABLE",
        "> COFF0XC_SHELL_READY"
    ];

    let lineIdx = 0;
    function typeTerminal() {
        if (lineIdx < bootLines.length) {
            const p = document.createElement('div');
            p.className = 'terminal-line';
            p.textContent = bootLines[lineIdx];
            terminalOutput.appendChild(p);
            lineIdx++;
            setTimeout(typeTerminal, 150);
        } else {
            const p = document.createElement('div');
            p.className = 'terminal-line cmd';
            p.innerHTML = 'root@coff0xc:~$ <span class="cursor"></span>';
            terminalOutput.appendChild(p);
        }
    }
    setTimeout(typeTerminal, 500);

    // Nav switch
    window.addEventListener('hashchange', () => updateLanguage(currentLang));
});
