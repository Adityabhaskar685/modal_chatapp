
document.addEventListener('DOMContentLoaded', async () => {
    await waitForMarked();

    marked.setOptions({
        highlight: function(code, lang) {
            return highlightCode(code, lang);
        },
        breaks: true,
        gfm: true,
        pedantic: false,
        sanitize: false,
        smartLists: true,
        smartypants: true
    });
});

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

function highlightCode(code, language) {
    const patterns = {
        keywords: /(import|from|def|class|if|else|try|except|return|async|await|function|const|let|var|for|while|break|continue)\b/g,
        strings: /(['"`])(.*?)\1/g,
        comments: /(#.*|\/\/.*|\/\*[\s\S]*?\*\/)/g,
        numbers: /\b\d+(\.\d+)?\b/g,
        functions: /\b\w+(?=\()/g,
        operators: /([+\-*/%=<>!&|^~]|==|!=|>=|<=|=>|\+=|-=|\*=|\/=|&&|\|\|)/g
    };
    code = code
        .replace(patterns.comments, '<span class="comment">$1</span>')
        .replace(patterns.strings, '<span class="string">$1$2$1</span>')
        .replace(patterns.keywords, '<span class="keyword">$1</span>')
        .replace(patterns.numbers, '<span class="number">$&</span>')
        .replace(patterns.functions, '<span class="function">$&</span>')
        .replace(patterns.operators, '<span class="operator">$1</span>');

    return `<pre><code class="language-${language || ''}">${code}</code></pre>`;
}

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
}

const userInput = document.getElementById('user-input');
userInput.addEventListener('input', () => autoResizeTextarea(userInput));

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
    const message = userInput.value.trim();
    if (!message) return;

    const chatbox = document.getElementById('chatbox');

    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'message user-message';
    userMessageDiv.innerHTML = await renderMarkdown(message);
    chatbox.appendChild(userMessageDiv);
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

document.getElementById('send-button').addEventListener('click', sendMessage);

document.getElementById('user-input').addEventListener('keypress', (e) => {
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