document.addEventListener('DOMContentLoaded', () => {
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
        'about.txt': 'I am a student graduating in 2026, and also a Security Analysis Engineer.\nInterests: Red/Blue Team Tool Dev, AI Tool Dev, LLM, Web Security.',
        'projects.txt': 'Hexstrike-ai-6.2: AI-powered tool for Hexstrike.',
        'contact.txt': 'Email: Coff0xc@protonmail.com',
        'skills.txt': 'Languages: Python, Go, C/C++, Verilog\nRoles: Security Analysis, IC Design',
        'secret.txt': 'Flag{Y0u_F0und_M3!}'
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
                addToOutput('  <span style="color:var(--accent-color)">cat</span>      - Read file content (e.g., cat about.txt)');
                addToOutput('  <span style="color:var(--accent-color)">clear</span>    - Clear terminal output');
                addToOutput('  <span style="color:var(--accent-color)">date</span>     - Show current date and time');
                addToOutput('  <span style="color:var(--accent-color)">reboot</span>   - Reload the page');
                break;
            case 'whoami':
                addToOutput('root (Coff0xc)');
                addToOutput('Role: Security Analysis Engineer & IC Design Student');
                break;
            case 'ls':
                addToOutput(Object.keys(fileSystem).join('  '));
                break;
            case 'cat':
                if (args[1]) {
                    const fileName = args[1];
                    if (fileSystem[fileName]) {
                        addToOutput(fileSystem[fileName]);
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
