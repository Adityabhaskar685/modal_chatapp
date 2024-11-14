function waitForMarked() {
    return new Promise((resolve) => {
        if (typeof marked !== 'undefined') {
            resolve();
            return;
        }

        const checkMarked = setInterval(() => {
            if (typeof marked !== 'undefined') {
                clearInterval(checkMarked);
                resolve();
            }
        }, 100);

        setTimeout(() => {
            clearInterval(checkMarked);
            console.error('Marked.js failed to load within timeout');
            resolve();
        }, 5000);
    });
}


document.addEventListener('DOMContentLoaded', async () => {
    hljs.highlightAll();
    await waitForMarked();
    marked.setOptions({
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, { language: lang }).value;
            }
            return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true,
        pedantic: false,
        sanitize: false,
        smartLists: true,
        smartypants: true
    });

    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    const sunIcon = '<i class="fas fa-sun"></i>';
    const moonIcon = '<i class="fas fa-moon"></i>';

    function updateThemeToggleButton() {
        const currentTheme = htmlElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            themeToggleBtn.innerHTML = `${sunIcon}<span>Light Mode</span>`;
        } else {
            themeToggleBtn.innerHTML = `${moonIcon}<span>Dark Mode</span>`;
        }
    }
    updateThemeToggleButton();

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        htmlElement.setAttribute('data-theme', savedTheme);
        updateThemeToggleButton();
    }
    themeToggleBtn.addEventListener('click', function() {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        htmlElement.setAttribute('data-theme', newTheme);
        updateThemeToggleButton();
        
        localStorage.setItem('theme', newTheme);
    });
    const userInput = document.getElementById('user-input');
    userInput.addEventListener('input', () => autoResizeTextarea(userInput));

    document.getElementById('send-button').addEventListener('click', sendMessage);

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    document.getElementById('conversation-context').addEventListener('input', (e) => {
        document.getElementById('conversation-context-value').textContent = e.target.value;
    });

    document.getElementById('clear-conversation').addEventListener('click', () => {
        const chatbox = document.getElementById('chatbox');
        chatbox.innerHTML = '';
    });
});


function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
}

function scrollToBottom() {
    const chatbox = document.getElementById('chatbox');
    chatbox.scrollTop = chatbox.scrollHeight;
}

async function renderMarkdown(content) {
    try {
        if (typeof content === 'object') {
            content = content.content;
        }
        
        content = content.replace('▌', '');
        
        content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return `\n\`\`\`${lang || ''}\n${code.trim()}\n\`\`\`\n`;
        });

        if (typeof marked.parse === 'function') {
            const rendered = marked.parse(content, {
                breaks: true,
                gfm: true
            });

            return `<div class="markdown-content">${rendered}</div>`;
        } else {
            console.warn('Marked.js not available, falling back to plain text');
            return `<div class="markdown-content">${content}</div>`;
        }
    } catch (error) {
        console.error('Error rendering content:', error);
        return `<div class="markdown-content">${content}</div>`;
    }
}

async function sendMessage() {
    const userInput = document.getElementById('user-input');
    const message = userInput.value.trim();
    if (!message) return;

    const chatbox = document.getElementById('chatbox');

    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'message user-message';
    userMessageDiv.innerHTML = await renderMarkdown(message);
    chatbox.appendChild(userMessageDiv);
    highlightNewCodeBlocks(userMessageDiv);
    scrollToBottom();

    userInput.value = '';
    userInput.style.height = 'auto';

    const socket = new WebSocket('ws://' + window.location.host + '/ws');

    socket.onopen = () => {
        socket.send(JSON.stringify({ message: message, role: 'user' }));
    };

    let assistantMessageDiv;

    socket.onmessage = async (event) => {
        try {
            const response = JSON.parse(event.data);
            if (response.role === 'assistant') {
                if (!assistantMessageDiv) {
                    assistantMessageDiv = document.createElement('div');
                    assistantMessageDiv.className = 'message assistant-message';
                    chatbox.appendChild(assistantMessageDiv);
                }
                assistantMessageDiv.innerHTML = await renderMarkdown(response);
                highlightNewCodeBlocks(assistantMessageDiv);
                scrollToBottom();
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

}

function highlightNewCodeBlocks(container) {
    container.querySelectorAll('pre code').forEach((block) => {
        if (!block.dataset.highlighted) {
            hljs.highlightElement(block);
            block.dataset.highlighted = 'yes';
        }
    });
}
