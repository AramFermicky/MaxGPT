// script.js
class MaxGPT {
    constructor() {
        this.config = window.MAXGPT_CONFIG;
        this.chatHistory = [];
        this.messageCount = 0;
        this.tokenCount = 0;
        
        this.init();
    }

    init() {
        // Убираем поле ввода API ключа из интерфейса
        document.querySelector('.api-section').innerHTML = `
            <div class="api-status">
                <h3>🔐 Статус API</h3>
                <div class="status-indicator">
                    <span class="status-dot active"></span>
                    <span>DeepSeek API подключён</span>
                </div>
                <p class="status-note">Используется защищённый ключ доступа</p>
            </div>
        `;

        this.bindEvents();
        this.updateStats();
    }

    bindEvents() {
        document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('user-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        document.querySelectorAll('.example-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prompt = e.target.dataset.prompt;
                document.getElementById('user-input').value = prompt;
                this.sendMessage();
            });
        });

        document.getElementById('clear-chat').addEventListener('click', () => this.clearChat());
    }

    async sendMessage() {
        const input = document.getElementById('user-input');
        const message = input.value.trim();
        
        if (!message) return;

        // Добавляем сообщение пользователя
        this.addMessage('user', message);
        input.value = '';
        
        // Показываем индикатор загрузки
        this.showLoading(true);

        try {
            const response = await this.callDeepSeekAPI(message);
            this.addMessage('assistant', response);
            this.messageCount += 2;
            this.tokenCount += message.length + response.length;
            this.updateStats();
        } catch (error) {
            console.error('Ошибка:', error);
            this.addMessage('error', `Произошла ошибка: ${error.message || 'Проверьте API ключ'}`);
        } finally {
            this.showLoading(false);
        }
    }

    async callDeepSeekAPI(userMessage) {
        const messages = [
            { role: 'system', content: this.config.SYSTEM_PROMPT },
            ...this.chatHistory.slice(-6).map(msg => ({
                role: msg.type,
                content: msg.content
            })),
            { role: 'user', content: userMessage }
        ];

        const response = await fetch(this.config.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.API_KEY}`
            },
            body: JSON.stringify({
                model: this.config.MODEL,
                messages: messages,
                max_tokens: this.config.MAX_TOKENS,
                temperature: this.config.TEMPERATURE,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`API ошибка: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    addMessage(type, content) {
        const chatHistory = document.getElementById('chat-history');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        const avatar = type === 'user' ? '👤' : 
                       type === 'assistant' ? '🇷🇺' : '⚠️';
        
        messageDiv.innerHTML = `
            <div class="avatar">${avatar}</div>
            <div class="content">
                <strong>${type === 'user' ? 'Вы' : type === 'assistant' ? 'MaxGPT' : 'Ошибка'}:</strong>
                <div class="message-text">${this.formatMessage(content)}</div>
                <div class="message-time">${new Date().toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
        `;
        
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        
        // Сохраняем в историю (ограниченный размер)
        this.chatHistory.push({ type, content, timestamp: Date.now() });
        if (this.chatHistory.length > 20) this.chatHistory.shift();
    }

    formatMessage(text) {
        // Простой форматирование текста
        return text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    showLoading(show) {
        const sendBtn = document.getElementById('send-btn');
        if (show) {
            sendBtn.innerHTML = '⏳';
            sendBtn.disabled = true;
        } else {
            sendBtn.innerHTML = '➤';
            sendBtn.disabled = false;
        }
    }

    updateStats() {
        document.getElementById('message-count').textContent = this.messageCount;
        document.getElementById('token-count').textContent = this.tokenCount;
    }

    clearChat() {
        const chatHistory = document.getElementById('chat-history');
        chatHistory.innerHTML = `
            <div class="message system-message">
                <div class="avatar">🇷🇺</div>
                <div class="content">
                    <strong>MaxGPT:</strong> Диалог очищен. Я готов помочь с информацией о России. О чём хотите узнать?
                </div>
            </div>
        `;
        this.chatHistory = [];
        this.messageCount = 0;
        this.tokenCount = 0;
        this.updateStats();
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    window.maxGPT = new MaxGPT();
});