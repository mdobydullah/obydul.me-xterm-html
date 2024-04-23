function callWithDelay(func, delay) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

function startApp() {
    const delay = 50;
    const scrollBackLimit = 5000; // current limit is 5000, change it in future if required
    const fitAddon = new FitAddon.FitAddon();
    const terminal = new Terminal({
        rows: 30,
        screenKeys: true,
        cursorBlink: true,
        macOptionIsMeta: true,
        scrollback: true,
        fontSize: 14,
        fontFamily: 'Ubuntu Mono, courier-new, courier, monospace'
    });
    const terminalDivId = "terminal";

    terminal.loadAddon(fitAddon);

    function fitToScreen() {
        fitAddon.fit();
        console.log(terminal.cols, terminal.rows);
    }

    window.onresize = callWithDelay(fitToScreen, delay);

    terminal.open(document.getElementById(terminalDivId));
    terminal.options.scrollback = scrollBackLimit;
    fitToScreen();

    let shellprompt = "$ ";

    terminal.prompt = function () {
        terminal.write("\r\n" + shellprompt);
    };


    startServer(terminal);

    // terminal.onKey((event) => {
    //     if (event.key === '\r') {
    //         runCommand(terminal, event)
    //     } else {
    //         terminal.write(event.key)
    //     }
    // });

    let command = '';

    terminal.onData(e => {
        switch (e) {
            case '\u0003': // Ctrl+C
                terminal.write('^C');
                terminal.prompt()
                break;
            case '\r': // Enter
                runCommand(terminal, command);
                command = '';
                break;
            case '\u007F': // Backspace (DEL)
                // Do not delete the prompt
                if (terminal._core.buffer.x > 2) {
                    terminal.write('\b \b');
                    if (command.length > 0) {
                        command = command.substr(0, command.length - 1);
                    }
                }
                break;
            default: // Print all other characters for demo
                if (e >= String.fromCharCode(0x20) && e <= String.fromCharCode(0x7E) || e >= '\u00a0') {
                    command += e;
                    terminal.write(e);
                }
        }
    });

    terminal.attachCustomKeyEventHandler((event) => {
        if (
            (event.ctrlKey || event.metaKey) &&
            event.code === "KeyV" &&
            event.type === "keydown"
        ) {
            navigator.clipboard.readText().then((clipText) => {
                terminal.write(clipText)
                //wsPty.send(JSON.stringify({ action: "input", data: { key: clipText } }));
            });
            event.preventDefault();
        }
    });
}

window.onload = startApp;

async function startServer(terminal) {
    await writeWithDelay(terminal, 'Welcome\r\n', 0);
    await writeWithDelay(terminal, 'Starting the server...\r\n', 200);
    await writeWithDelay(terminal, 'Try running `help` command\r\n\r\n', 700);
    await writeWithDelay(terminal, userInfo(), 100);

    terminal.prompt();
    terminal.focus();
}

function userInfo() {
    return '# \x1B[1;32mUser\x1B[0m in \x1B[1;33m~/obydul.me\x1B[0m \r\n';
}

async function writeWithDelay(terminal, message, delay) {
    return new Promise(resolve => {
        setTimeout(() => {
            terminal.write(message);
            resolve();
        }, delay);
    });
}

function runCommand(terminal, text) {
    const command = text.trim().split(' ')[0];

    if (command.length > 0) {
        terminal.writeln('');
        if (command in commands) {
            commands[command].f(terminal);
            return;
        }
        terminal.writeln(`${command}: command not found`);
        terminal.prompt()
    } else {
        terminal.prompt()
    }
}
