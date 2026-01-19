// ui-manager.js - Менеджер пользовательского интерфейса
class UIManager {
    constructor() {
        this.elements = {};
        this.initializeElements();
        this.setupEventListeners();
    }
    
    // 🏗️ Инициализация DOM элементов
    initializeElements() {
        this.elements = {
            // Основные элементы
            chatHistory: document.getElementById('chat-history'),
            userInput: document.getElementById('user-input'),
            sendBtn: document.getElementById('send-btn'),
            clearBtn: document.getElementById('clear-chat'),
            
            // Панель статусов
            statusBar: document.getElementById('connection-status'),
            pingDisplay: document.getElementById('ping-display'),
            apiStatus: document.getElementById('api-status'),
            tokenStatus: document.getElementById('token-status'),
            messageCount: document.getElementById('message-count'),
            tokenCount: document.getElementById('token-count'),
            
            // Быстрые команды
            quickCommands: document.querySelector('.quick-commands'),
            
            // Кнопки действий
            diagnoseBtn: document.getElementById('diagnose-btn'),
            settingsBtn: document.getElementById('settings-btn')
        };
        
        console.log('🎨 UI Manager инициализирован');
    }
    
    // 🎯 Настройка обработчиков событий
    setupEventListeners() {
        // Обработка ввода сообщения
        this.elements.userInput.addEventListener('input', () => this.adjustTextareaHeight());
        this.elements.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.triggerSendMessage();
            }
            
            // Автоподсказка по ошибкам
            if (e.key === ':' && this.elements.userInput.value.endsWith('er')) {
                setTimeout(() => this.checkForErrorCode(), 100);
            }
        });
        
        // Кнопки
        if (this.elements.clearBtn) {
            this.elements.clearBtn.addEventListener('click', () => this.triggerClearChat());
        }
        
        if (this.elements.diagnoseBtn) {
            this.elements.diagnoseBtn.addEventListener('click', () => this.triggerDiagnose());
        }
        
        // Быстрые команды
        if (this.elements.quickCommands) {
            this.elements.quickCommands.addEventListener('click', (e) => {
                if (e.target.classList.contains('quick-command')) {
                    const command = e.target.dataset.cmd;
                    this.triggerQuickCommand(command);
                }
            });
        }
        
        // События сети
        window.addEventListener('online', () => this.handleNetworkChange(true));
        window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
    
    // 💬 Добавление сообщения в чат
    addMessage(type, content, timestamp = new Date()) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}-message`;
        
        const avatar = this.getAvatarForType(type);
        const timeStr = timestamp.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const formattedContent = this.formatMessageContent(content);
        
        messageElement.innerHTML = `
            <div class="avatar">${avatar}</div>
            <div class="bubble">
                <div class="text">${formattedContent}</div>
                <div class="meta">
                    <span class="time">${timeStr}</span>
                    ${type === 'error' ? '<span class="error-badge">Ошибка</span>' : ''}
                </div>
            </div>
        `;
        
        this.elements.chatHistory.appendChild(messageElement);
        this.scrollToBottom();
        
        // Анимация появления
        setTimeout(() => {
            messageElement.classList.add('visible');
        }, 10);
        
        return messageElement;
    }
    
    // 🎭 Форматирование содержимого сообщения
    formatMessageContent(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    }
    
    // 👤 Получение аватара по типу сообщения
    getAvatarForType(type) {
        const avatars = {
            'user': '👤',
            'assistant': '🤖',
            'system': '⚙️',
            'error': '⚠️',
            'diagnostic': '🔍'
        };
        return avatars[type] || '💬';
    }
    
    // 📊 Обновление панели статусов
    updateStatusDisplay(status) {
        if (!this.elements.statusBar) return;
        
        const parts = [];
        
        // Сеть
        parts.push(status.isOnline ? '🌐 Онлайн' : '🔴 Офлайн');
        
        // Пинг
        if (status.ping && status.ping > 0) {
            let pingColor = '🟢';
            if (status.ping > 300) pingColor = '🟡';
            if (status.ping > 1000) pingColor = '🟠';
            if (status.ping > 3000) pingColor = '🔴';
            
            parts.push(`${pingColor} ${status.ping}мс`);
        }
        
        // API статус
        if (this.elements.apiStatus) {
            let apiText = '❓';
            let apiColor = '#FF9800';
            
            switch(status.api) {
                case 'active': apiText = '🤖 Активен'; apiColor = '#4CAF50'; break;
                case 'error': apiText = '⚠️ Ошибка'; apiColor = '#FF5252'; break;
                case 'checking': apiText = '🔄 Проверка'; break;
            }
            
            this.elements.apiStatus.textContent = apiText;
            this.elements.apiStatus.style.color = apiColor;
        }
        
        // Токен статус
        if (this.elements.tokenStatus) {
            let tokenText = '❓';
            let tokenColor = '#FF9800';
            
            switch(status.token) {
                case 'valid': tokenText = '🔑 Активен'; tokenColor = '#4CAF50'; break;
                case 'invalid': tokenText = '🔑 Ошибка'; tokenColor = '#FF5252'; break;
                case 'expired': tokenText = '🔑 Истёк'; tokenColor = '#FF9800'; break;
            }
            
            this.elements.tokenStatus.textContent = tokenText;
            this.elements.tokenStatus.style.color = tokenColor;
        }
        
        // Пинг дисплей
        if (this.elements.pingDisplay && status.ping) {
            this.elements.pingDisplay.textContent = `${status.ping}мс`;
            this.elements.pingDisplay.style.color = status.ping < 300 ? '#4CAF50' : 
                                                  status.ping < 1000 ? '#FF9800' : '#FF5252';
        }
        
        this.elements.statusBar.textContent = parts.join(' | ');
    }
    
    // 📈 Обновление счётчиков
    updateCounters(messages = 0, tokens = 0) {
        if (this.elements.messageCount) {
            this.elements.messageCount.textContent = messages;
        }
        if (this.elements.tokenCount) {
            this.elements.tokenCount.textContent = tokens;
        }
    }
    
    // ⏳ Установка состояния загрузки
    setLoading(isLoading) {
        if (isLoading) {
            this.elements.sendBtn.innerHTML = '<div class="spinner"></div>';
            this.elements.sendBtn.disabled = true;
            this.elements.userInput.disabled = true;
            this.elements.userInput.placeholder = 'Отправка...';
        } else {
            this.elements.sendBtn.innerHTML = '↑';
            this.elements.sendBtn.disabled = false;
            this.elements.userInput.disabled = false;
            this.elements.userInput.placeholder = 'Введите сообщение или er:код_ошибки';
            this.elements.userInput.focus();
        }
    }
    
    // 🧹 Очистка чата
    clearChat() {
        this.elements.chatHistory.innerHTML = '';
        this.updateCounters(0, 0);
    }
    
    // 📜 Прокрутка к нижней части чата
    scrollToBottom() {
        setTimeout(() => {
            this.elements.chatHistory.scrollTop = this.elements.chatHistory.scrollHeight;
        }, 100);
    }
    
    // 📝 Автоматическая регулировка высоты textarea
    adjustTextareaHeight() {
        const textarea = this.elements.userInput;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
    
    // 🔍 Проверка ввода кода ошибки
    checkForErrorCode() {
        const input = this.elements.userInput.value;
        const errorMatch = input.match(/er:(\d{3})/i);
        
        if (errorMatch) {
            this.showErrorHint(`Нажмите Enter для получения справки по ошибке ${errorMatch[1]}`);
        }
    }
    
    // 💡 Показ подсказки
    showHint(message, type = 'info') {
        const hint = document.createElement('div');
        hint.className = `hint-message hint-${type}`;
        hint.textContent = message;
        
        const inputContainer = document.querySelector('.input-container');
        if (inputContainer) {
            inputContainer.parentNode.insertBefore(hint, inputContainer);
            
            setTimeout(() => hint.classList.add('show'), 10);
            setTimeout(() => {
                hint.classList.remove('show');
                setTimeout(() => hint.remove(), 300);
            }, 5000);
        }
    }
    
    // ⚠️ Показ подсказки об ошибке
    showErrorHint(message) {
        this.showHint(`⚠️ ${message}`, 'error');
    }
    
    // ✅ Показ успешного уведомления
    showSuccessHint(message) {
        this.showHint(`✅ ${message}`, 'success');
    }
    
    // 🌐 Обработчик изменения состояния сети
    handleNetworkChange(isOnline) {
        this.showHint(
            isOnline ? '🌐 Соединение восстановлено' : '🔴 Потеряно соединение',
            isOnline ? 'success' : 'error'
        );
    }
    
    // 🎯 Триггеры событий (будут переопределены в app-core)
    triggerSendMessage() {
        if (window.app && window.app.sendMessage) {
            window.app.sendMessage();
        }
    }
    
    triggerClearChat() {
        if (window.app && window.app.clearChat) {
            window.app.clearChat();
        }
    }
    
    triggerDiagnose() {
        if (window.app && window.app.runDiagnostic) {
            window.app.runDiagnostic();
        }
    }
    
    triggerQuickCommand(command) {
        if (window.app && window.app.handleQuickCommand) {
            window.app.handleQuickCommand(command);
        }
    }
}