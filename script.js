document.addEventListener('DOMContentLoaded', () => {
    // Load OKR Data
    fetch('okr-2026.json')
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('okr-container');
            Object.entries(data.goals).forEach(([key, goal]) => {
                const card = document.createElement('div');
                card.className = 'okr-card';
                let metricsHTML = '';
                Object.entries(goal.metrics).forEach(([metricKey, metric]) => {
                    const progress = typeof metric.target === 'number' ?
                        Math.min((metric.current / metric.target) * 100, 100) : 0;
                    const displayTarget = typeof metric.target === 'number' ?
                        metric.target.toLocaleString() : metric.target;
                    const displayCurrent = typeof metric.current === 'number' ?
                        metric.current.toLocaleString() : metric.current;
                    metricsHTML += `
                        <div class="okr-metric">
                            <div class="okr-metric-label">${metricKey.toUpperCase()}</div>
                            <div class="okr-progress-bar">
                                <div class="okr-progress-fill" style="width: ${progress}%"></div>
                                <div class="okr-progress-text">${displayCurrent} / ${displayTarget}</div>
                            </div>
                        </div>`;
                });
                card.innerHTML = `<h3>${goal.title}</h3>${metricsHTML}`;
                container.appendChild(card);
            });
        });

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Intersection Observer for Fade-in Animations
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in').forEach(section => {
        observer.observe(section);
    });

    // Terminal Logic
    const terminalOutput = document.getElementById('terminal-output');
    const commandInput = document.getElementById('command-input');
    const terminalWindow = document.getElementById('terminal');
    const inputLine = document.getElementById('input-line');

    let commandHistory = [];
    let historyIndex = -1;

    // File System Mock
    const fileSystem = {
        'projects.txt': `[1] AI-Based HTTP Traffic Analysis Agent (Work in Progress)
    -------------------------------------------------------
    > Architecture: Dual-layer judgment system (L1: Traffic Analysis, L2: Security Verdict).
    > Model: Self-trained proprietary model (Non-opensource).
    > Goal: Automated detection of malicious HTTP requests/responses without relying on public signatures.

[2] STM32 Abnormal Vibration Monitoring System (Graduation Thesis)
    -------------------------------------------------------
    > Core: STM32 Microcontroller + Isolation Forest Algorithm.
    > Function: Real-time equipment anomaly detection on edge devices.`,
        'contact.info': `Email: Q29mZjB4Y0Bwcm90b25tYWlsLmNvbQ== (Try 'base64 -d' if you can)
PGP Public Key Block:
-----BEGIN PGP PUBLIC KEY BLOCK-----
mQINBGI... (Truncated for brevity)
-----END PGP PUBLIC KEY BLOCK-----`,
        'about.txt': 'I am a student graduating in 2026, and also a Security Analysis Engineer.\nInterests: Red/Blue Team Tool Dev, AI Tool Dev, LLM, Web Security.',
        'blog_posts.md': '2024-11-25: How to build a terminal portfolio\n2024-10-10: Understanding STM32 Security',
        'resume.pdf': '[Binary file]'
    };

    // Boot Sequence
    const bootLines = [
        "Initializing kernel...",
        "Loading modules...",
        "Mounting file system...",
        "Starting network services...",
        "Connected to 127.0.0.1",
        "Welcome to Coff0xc OS v1.0.2",
        "Type 'help' to start."
    ];

    let bootIndex = 0;

    function runBootSequence() {
        if (bootIndex < bootLines.length) {
            const line = document.createElement('div');
            line.className = 'output-line';
            line.textContent = `[ OK ] ${bootLines[bootIndex]}`;
            terminalOutput.appendChild(line);
            bootIndex++;
            scrollToBottom();
            setTimeout(runBootSequence, 300); // Delay between lines
        } else {
            // Show input line after boot
            inputLine.classList.remove('hidden');
            commandInput.focus();
        }
    }

    // Start boot sequence
    setTimeout(runBootSequence, 500);

    if (terminalWindow && commandInput && terminalOutput) {
        // Focus input when clicking anywhere in the terminal
        terminalWindow.addEventListener('click', () => {
            if (!inputLine.classList.contains('hidden')) {
                commandInput.focus();
            }
        });

        commandInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                const command = this.value.trim();
                if (command) {
                    // Save to history
                    commandHistory.push(command);
                    historyIndex = commandHistory.length;

                    // Echo command
                    addToOutput(`<span class="prompt"><span class="user">root@coff0xc</span>:<span class="path">~</span>#</span> ${command}`);
                    // Process command
                    processCommand(command);
                } else {
                    addToOutput(`<span class="prompt"><span class="user">root@coff0xc</span>:<span class="path">~</span>#</span>`);
                }
                this.value = '';
                scrollToBottom();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (historyIndex > 0) {
                    historyIndex--;
                    this.value = commandHistory[historyIndex];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (historyIndex < commandHistory.length - 1) {
                    historyIndex++;
                    this.value = commandHistory[historyIndex];
                } else {
                    historyIndex = commandHistory.length;
                    this.value = '';
                }
            }
        });
    }

    function addToOutput(html) {
        const div = document.createElement('div');
        div.className = 'output-line';
        div.innerHTML = html;
        terminalOutput.appendChild(div);
    }

    function scrollToBottom() {
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    function processCommand(cmd) {
        const args = cmd.split(' ');
        const mainCmd = args[0].toLowerCase();

        switch (mainCmd) {
            case 'help':
                addToOutput('Available commands:');
                addToOutput('  <span style="color:var(--accent-color)">help</span>     - Show this help message');
                addToOutput('  <span style="color:var(--accent-color)">whoami</span>   - Display user information');
                addToOutput('  <span style="color:var(--accent-color)">ls</span>       - List files');
                addToOutput('  <span style="color:var(--accent-color)">cat</span>      - Read file content (e.g., cat projects.txt)');
                addToOutput('  <span style="color:var(--accent-color)">clear</span>    - Clear terminal output');
                addToOutput('  <span style="color:var(--accent-color)">date</span>     - Show current date and time');
                addToOutput('  <span style="color:var(--accent-color)">reboot</span>   - Reload the page');
                break;
            case 'whoami':
                addToOutput(`User: coff0xc (uid=1000)
Role: Web Security Researcher / CTF Player
State: <span style="color:var(--accent-color)">ACTIVE</span>
Location: CN (China)
Focus: 
  - Automated Penetration Testing
  - AI-Driven Traffic Analysis (L1/L2 Judgement)
  - Embedded Security (STM32)`);
                break;
            case 'ls':
                if (args.includes('-la') || args.includes('-al') || args.includes('-l')) {
                    addToOutput(`drwx------  2 coff0xc  sec   4096  Nov 21  .
drwxr-xr-x  4 root     root  4096  Nov 21  ..
-rw-r--r--  1 coff0xc  sec   2048  Nov 25  projects.txt
-rw-r--r--  1 coff0xc  sec   1024  Nov 25  blog_posts.md
-rw-r--r--  1 coff0xc  sec    512  Nov 25  contact.info
-rw-r--r--  1 coff0xc  sec    300  Nov 25  about.txt
-rwxr-xr-x  1 coff0xc  sec   8192  Nov 25  resume.pdf`);
                } else {
                    addToOutput(Object.keys(fileSystem).join('  '));
                }
                break;
            case 'cat':
                if (args[1]) {
                    const fileName = args[1];
                    if (fileSystem[fileName]) {
                        // Handle special formatting for projects.txt to preserve whitespace
                        if (fileName === 'projects.txt' || fileName === 'contact.info') {
                            addToOutput(`<pre style="margin:0; font-family:inherit;">${fileSystem[fileName]}</pre>`);
                        } else {
                            addToOutput(fileSystem[fileName]);
                        }
                    } else {
                        addToOutput(`cat: ${fileName}: No such file or directory`);
                    }
                } else {
                    addToOutput('Usage: cat [filename]');
                }
                break;
            case 'clear':
                terminalOutput.innerHTML = '';
                break;
            case 'date':
                addToOutput(new Date().toString());
                break;
            case 'reboot':
                addToOutput('Rebooting system...');
                setTimeout(() => {
                    location.reload();
                }, 1000);
                break;
            case 'sudo':
                addToOutput('User is not in the sudoers file. This incident will be reported.');
                break;
            default:
                addToOutput(`bash: ${mainCmd}: command not found`);
        }
    }
});
