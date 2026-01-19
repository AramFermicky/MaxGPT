// ============================================
// MobileMaxGPT для GigaChat API
// Версия 2.0 с мониторингом и диагностикой
// ============================================

class MobileMaxGPT {
    constructor() {
        this.config = window.MAXGPT_CONFIG;
        this.chatHistory = [];
        this.isSending = false;
        this.networkMonitor = {
            lastPing: 0,
            isOnline: navigator.onLine,
            apiStatus: 'unknown',
            tokenStatus: 'unknown',
            lastCheck: 0
        };
        
        this.errorDatabase = {
            // Ошибки GigaChat API
            '401': { 
                title: 'Ошибка авторизации (401)', 
                solution: '1. Проверьте API ключ в config.js\n2. Убедитесь, что ключ не просрочен\n3. Для OAuth проверьте RqUID и scope',
                immediate: true 
            },
            '403': { 
                title: 'Доступ запрещен (403)', 
                solution: '1. У вас нет прав на использование этого ресурса\n2. Ключ может быть заблокирован\n3. Проверьте корректность эндпоинта API',
                immediate: true 
            },
            '429': { 
                title: 'Слишком много запросов (429)', 
                solution: '1. Превышен лимит запросов в минуту\n2. Подождите 60 секунд\n3. Проверьте лимиты вашего тарифа',
                immediate: false 
            },
            '400': { 
                title: 'Некорректный запрос (400)', 
                solution: '1. Проверьте формат JSON запроса\n2. Убедитесь в корректности модели\n3. Проверьте кодировку сообщений',
                immediate: true 
            },
            '500': { 
                title: 'Ошибка сервера (500)', 
                solution: '1. Проблема на стороне GigaChat\n2. Попробуйте через 5 минут\n3. Проверьте статус сервиса на status.sberbank.ru',
                immediate: false 
            },
            'timeout': { 
                title: 'Таймаут соединения', 
                solution: '1. Проверьте интернет-соединение\n2. Увеличьте timeout в config.js\n3. Возможно, проблема с DNS',
                immediate: true 
            },
            'network': { 
                title: 'Проблема сети', 
                solution: '1. Проверьте подключение к интернету\n2. Отключите VPN\n3. Попробуйте другой Wi-Fi/мобильную сеть',
                immediate: true 
            }
        };
        
        this.init();
    }

    async init() {
        console.log('🚀 MobileMaxGPT инициализация...');
        
        this.elements = {
            chatHistory: document.getElementById('chat-history'),
            userInput: document.getElementById('user-input'),
            sendBtn: document.getElementById('send-btn'),
            clearBtn: document.getElementById('clear-chat'),
            statusBar: document.getElementById('connection-status'),
            tokenCount: document.getElementById('token-count'),
            messageCount: document.getElementById('message-count'),
            pingDisplay: document.getElementById('ping-display'),
            apiStatus: document.getElementById('api-status'),
            tokenStatus: document.getElementById('token-status')
        };

        this.bindEvents();
        this.setupNetworkMonitoring();
        this.loadFromStorage();
        
        // Автофокус и первоначальная проверка
        setTimeout(() => {
            this.elements.userInput.focus();
            this.checkAllSystems();
        }, 1000);
    }

    bindEvents() {
        // Основные события
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        
        this.elements.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
            
            // Диагностика по вводу "er:XXX"
            if (e.key === ':' && this.elements.userInput.value.endsWith('er')) {
                setTimeout(() => this.checkErrorInput(), 100);
            }
        });
        
        this.elements.clearBtn?.addEventListener('click', () => this.clearChat());
        
        // События сети
        window.addEventListener('online', () => this.handleNetworkChange(true));
        window.addEventListener('offline', () => this.handleNetworkChange(false));
        
        // Кнопки диагностики
        document.getElementById('diagnose-btn')?.addEventListener('click', () => this.runFullDiagnostic());
        document.getElementById('refresh-api')?.addEventListener('click', () => this.checkAPIStatus());
        
        // Быстрые команды
        document.querySelectorAll('.quick-command').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cmd = e.target.dataset.cmd;
                this.handleQuickCommand(cmd);
            });
        });
    }

    // ================= СЕТЬ И МОНИТОРИНГ =================
    setupNetworkMonitoring() {
        // Проверка сети каждые 30 секунд
        setInterval(() => {
            this.checkNetworkStatus();
            this.updateStatusDisplay();
        }, 30000);
        
        // Пинг каждую минуту
        setInterval(() => {
            this.performPingTest();
        }, 60000);
        
        // Первоначальная проверка
        this.checkNetworkStatus();
        this.performPingTest();
    }

    async checkNetworkStatus() {
        const previousStatus = this.networkMonitor.isOnline;
        
        try {
            // Проверка через несколько методов
            const isOnline = navigator.onLine;
            const canReachAPI = await this.testAPIConnection(2000);
            
            this.networkMonitor.isOnline = isOnline && canReachAPI;
            this.networkMonitor.lastCheck = Date.now();
            
            if (previousStatus !== this.networkMonitor.isOnline) {
                this.showNetworkNotification(this.networkMonitor.isOnline);
            }
            
            return this.networkMonitor.isOnline;
        } catch (error) {
            this.networkMonitor.isOnline = false;
            return false;
        }
    }

    async testAPIConnection(timeout = 5000) {
        return new Promise((resolve) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                resolve(false);
            }, timeout);

            fetch(this.config.API_URL, {
                method: 'HEAD',
                mode: 'no-cors',
                signal: controller.signal
            })
            .then(() => {
                clearTimeout(timeoutId);
                resolve(true);
            })
            .catch(() => {
                clearTimeout(timeoutId);
                resolve(false);
            });
        });
    }

    async performPingTest() {
        const startTime = Date.now();
        
        try {
            const response = await fetch(this.config.API_URL, {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-store'
            });
            
            const ping = Date.now() - startTime;
            this.networkMonitor.lastPing = ping;
            
            // Определяем качество соединения
            let quality = '🔴';
            if (ping < 100) quality = '🟢';
            else if (ping < 300) quality = '🟡';
            else if (ping < 1000) quality = '🟠';
            
            if (this.elements.pingDisplay) {
                this.elements.pingDisplay.innerHTML = `${quality} ${ping}мс`;
                this.elements.pingDisplay.title = `Последний пинг: ${ping}мс`;
            }
            
            return ping;
        } catch (error) {
            this.networkMonitor.lastPing = -1;
            if (this.elements.pingDisplay) {
                this.elements.pingDisplay.innerHTML = '🔴 Нет';
                this.elements.pingDisplay.title = 'Нет соединения с API';
            }
            return -1;
        }
    }

    async checkAPIStatus() {
        if (!this.networkMonitor.isOnline) {
            this.networkMonitor.apiStatus = 'offline';
            return false;
        }

        try {
            const testResponse = await this.makeApiRequest([
                { role: 'user', content: 'Тест' }
            ], true);
            
            this.networkMonitor.apiStatus = testResponse ? 'active' : 'error';
            
            // Проверка токена (если есть данные о лимитах)
            if (testResponse && testResponse.usage) {
                this.networkMonitor.tokenStatus = 'valid';
                this.updateTokenStats(testResponse.usage);
            } else {
                this.networkMonitor.tokenStatus = 'unknown';
            }
            
            return true;
        } catch (error) {
            this.networkMonitor.apiStatus = 'error';
            this.networkMonitor.tokenStatus = 'invalid';
            return false;
        }
    }

    async checkAllSystems() {
        const results = {
            network: await this.checkNetworkStatus(),
            api: await this.checkAPIStatus(),
            ping: await this.performPingTest()
        };
        
        this.updateStatusDisplay();
        return results;
    }

    updateStatusDisplay() {
        if (!this.elements.statusBar) return;
        
        const statusParts = [];
        
        // Сеть
        if (this.networkMonitor.isOnline) {
            statusParts.push('🌐 Онлайн');
        } else {
            statusParts.push('🔴 Офлайн');
        }
        
        // Пинг
        if (this.networkMonitor.lastPing > 0) {
            statusParts.push(`📶 ${this.networkMonitor.lastPing}мс`);
        }
        
        // Статус API
        switch(this.networkMonitor.apiStatus) {
            case 'active':
                statusParts.push('🤖 API OK');
                break;
            case 'error':
                statusParts.push('⚠️ API Error');
                break;
            case 'offline':
                statusParts.push('🔌 API Offline');
                break;
            default:
                statusParts.push('❓ API Unknown');
        }
        
        // Статус токена
        if (this.elements.tokenStatus) {
            switch(this.networkMonitor.tokenStatus) {
                case 'valid':
                    this.elements.tokenStatus.innerHTML = '🔑 Токен активен';
                    this.elements.tokenStatus.style.color = '#4CAF50';
                    break;
                case 'invalid':
                    this.elements.tokenStatus.innerHTML = '🔑 Проблема с токеном';
                    this.elements.tokenStatus.style.color = '#FF5252';
                    break;
                default:
                    this.elements.tokenStatus.innerHTML = '🔑 Статус неизвестен';
                    this.elements.tokenStatus.style.color = '#FF9800';
            }
        }
        
        // Статус API
        if (this.elements.apiStatus) {
            this.elements.apiStatus.innerHTML = `API: ${this.networkMonitor.apiStatus}`;
            this.elements.apiStatus.style.color = 
                this.networkMonitor.apiStatus === 'active' ? '#4CAF50' : 
                this.networkMonitor.apiStatus === 'error' ? '#FF5252' : '#FF9800';
        }
        
        this.elements.statusBar.textContent = statusParts.join(' | ');
    }

    // ================= ОБРАБОТКА СООБЩЕНИЙ =================
    async sendMessage() {
        if (this.isSending) return;
        
        const message = this.elements.userInput.value.trim();
        if (!message) return;
        
        // Проверяем, не запрос ли это диагностики
        if (this.handleSpecialCommand(message)) {
            this.elements.userInput.value = '';
            return;
        }
        
        // Проверка сети перед отправкой
        if (!this.networkMonitor.isOnline) {
            this.showError('Нет интернет-соединения. Проверьте сеть.');
            return;
        }
        
        this.isSending = true;
        this.setLoading(true);
        
        try {
            // Показываем сообщение пользователя
            this.addMessage('user', message);
            this.elements.userInput.value = '';
            
            // Получаем ответ
            let response;
            if (this.config.USE_MOCK_DATA) {
                response = await this.getMockResponse(message);
            } else {
                response = await this.getAIResponse(message);
            }
            
            // Показываем ответ
            this.addMessage('assistant', response);
            
            // Обновляем статистику
            this.updateStats();
            this.saveToStorage();
            
        } catch (error) {
            console.error('❌ Ошибка отправки:', error);
            
            // Интеллектуальная обработка ошибок
            const errorInfo = this.analyzeError(error);
            this.addMessage('error', errorInfo.formatted);
            
            // Если критическая ошибка - предлагаем решение
            if (errorInfo.critical) {
                this.suggestErrorSolution(errorInfo.code);
            }
            
        } finally {
            this.isSending = false;
            this.setLoading(false);
            this.scrollToBottom();
            
            // Обновляем статус после операции
            setTimeout(() => this.checkAPIStatus(), 2000);
        }
    }

    handleSpecialCommand(message) {
        const lowerMsg = message.toLowerCase();
        
        // Диагностические команды
        if (lowerMsg.startsWith('cmd:')) {
            const cmd = lowerMsg.substring(4).trim();
            
            switch(cmd) {
                case 'status':
                    this.showSystemStatus();
                    return true;
                case 'diagnose':
                    this.runFullDiagnostic();
                    return true;
                case 'ping':
                    this.performPingTest();
                    this.addMessage('system', `Пинг: ${this.networkMonitor.lastPing}мс`);
                    return true;
                case 'clear':
                    this.clearChat();
                    return true;
                case 'help':
                    this.showHelp();
                    return true;
            }
        }
        
        // Запрос информации об ошибке (er:400)
        if (lowerMsg.startsWith('er:')) {
            const errorCode = message.substring(3).trim();
            this.showErrorInfo(errorCode);
            return true;
        }
        
        return false;
    }

    checkErrorInput() {
        const input = this.elements.userInput.value;
        const errorMatch = input.match(/er:(\d{3})/i);
        
        if (errorMatch) {
            const errorCode = errorMatch[1];
            setTimeout(() => {
                if (this.elements.userInput.value === input) {
                    this.showErrorInfo(errorCode);
                    this.elements.userInput.value = '';
                }
            }, 500);
        }
    }

    showErrorInfo(errorCode) {
        const errorInfo = this.errorDatabase[errorCode];
        
        if (errorInfo) {
            this.addMessage('assistant', 
                `🔍 **${errorInfo.title}**\n\n` +
                `**Решение:**\n${errorInfo.solution}\n\n` +
                `**Рекомендации:**\n` +
                `1. Проверьте config.js\n` +
                `2. Убедитесь в корректности ключа\n` +
                `3. Попробуйте команду \`cmd:diagnose\``
            );
        } else {
            this.addMessage('assistant', 
                `⚠️ Неизвестный код ошибки: ${errorCode}\n\n` +
                `Попробуйте:\n` +
                `• \`er:400\` - Некорректный запрос\n` +
                `• \`er:401\` - Ошибка авторизации\n` +
                `• \`er:429\` - Слишком много запросов\n` +
                `• \`er:500\` - Ошибка сервера\n\n` +
                `Или используйте \`cmd:diagnose\` для полной диагностики.`
            );
        }
    }

    analyzeError(error) {
        let errorCode = 'unknown';
        let message = error.message;
        
        // Извлекаем код ошибки из сообщения
        const codeMatch = error.message.match(/(\d{3})/);
        if (codeMatch) {
            errorCode = codeMatch[1];
        }
        
        // Определяем тип ошибки
        if (error.name === 'AbortError') {
            errorCode = 'timeout';
            message = 'Таймаут соединения (30 секунд)';
        } else if (error.message.includes('Failed to fetch')) {
            errorCode = 'network';
            message = 'Проблема с сетевым соединением';
        }
        
        const errorInfo = this.errorDatabase[errorCode] || {
            title: `Неизвестная ошибка (${errorCode})`,
            solution: 'Проверьте консоль браузера для деталей',
            immediate: false
        };
        
        return {
            code: errorCode,
            message: message,
            formatted: `**${errorInfo.title}**\n${message}`,
            critical: errorInfo.immediate,
            info: errorInfo
        };
    }

    suggestErrorSolution(errorCode) {
        const errorInfo = this.errorDatabase[errorCode];
        if (!errorInfo) return;
        
        // Показываем подсказку под полем ввода
        this.showHint(`💡 ${errorInfo.title}: ${errorInfo.solution.split('\n')[0]}`);
    }

    // ================= GIGACHAT API =================
    async getAIResponse(userMessage) {
        console.log('🤖 Запрос к GigaChat API...');
        
        const messages = [
            { role: 'system', content: this.config.SYSTEM_PROMPT },
            ...this.chatHistory.slice(-4).map(msg => ({
                role: msg.type === 'user' ? 'user' : 'assistant',
                content: msg.content
            })),
            { role: 'user', content: userMessage }
        ];

        if (this.config.DEBUG_MODE) {
            console.log('📤 Запрос:', {
                model: this.config.MODEL,
                messages: messages.length,
                max_tokens: this.config.MAX_TOKENS
            });
        }

        try {
            const response = await this.makeApiRequest(messages);
            
            if (this.config.DEBUG_MODE) {
                console.log('📥 Ответ:', response);
            }
            
            if (!response.choices || !response.choices[0]) {
                throw new Error('Некорректный ответ от GigaChat API');
            }
            
            return response.choices[0].message.content.trim();
            
        } catch (error) {
            console.error('❌ GigaChat API Error:', error);
            throw error;
        }
    }

    async makeApiRequest(messages, isTest = false) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        try {
            // Для GigaChat используем ключ как Bearer токен
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };

            // Проверяем, нужно ли использовать OAuth или прямой ключ
            if (this.config.USE_DIRECT_API) {
                headers['Authorization'] = `Bearer ${this.config.API_KEY}`;
            } else {
                // Получаем OAuth токен
                const token = await this.getGigaChatToken();
                headers['Authorization'] = `Bearer ${token}`;
            }

            const requestBody = {
                model: this.config.MODEL,
                messages: messages,
                max_tokens: this.config.MAX_TOKENS,
                temperature: this.config.TEMPERATURE,
                stream: this.config.STREAM
            };

            // Для теста упрощаем запрос
            if (isTest) {
                requestBody.messages = [{ role: 'user', content: 'Тест связи' }];
                requestBody.max_tokens = 10;
            }

            const response = await fetch(this.config.API_URL, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { error: { message: errorText } };
                }
                
                throw new Error(`HTTP ${response.status}: ${errorData.error?.message || errorData.details || 'Unknown error'}`);
            }

            return await response.json();
            
        } catch (error) {
            clearTimeout(timeout);
            
            if (error.name === 'AbortError') {
                throw new Error('Таймаут запроса (30 секунд)');
            }
            
            throw error;
        }
    }

    async getGigaChatToken() {
        // Простая реализация - используем ключ как токен
        // Для полной OAuth реализации потребуется RqUID и scope
        return this.config.API_KEY;
    }

    // ================= ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =================
    addMessage(type, content) {
        const message = {
            type,
            content,
            timestamp: new Date().toISOString(),
            id: Date.now() + Math.random()
        };
        
        this.chatHistory.push(message);
        this.renderMessage(message);
        
        // Ограничиваем историю
        if (this.chatHistory.length > 100) {
            this.chatHistory = this.chatHistory.slice(-50);
        }
    }

    renderMessage(message) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.type}-message`;
        messageEl.dataset.id = message.id;
        
        const time = new Date(message.timestamp).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const avatar = message.type === 'user' ? '👤' : 
                      message.type === 'assistant' ? '🤖' : 
                      message.type === 'error' ? '⚠️' : '💬';
        
        // Форматируем текст (поддержка markdown-like)
        let formattedContent = this.formatMessage(message.content);
        
        messageEl.innerHTML = `
            <div class="avatar">${avatar}</div>
            <div class="bubble">
                <div class="text">${formattedContent}</div>
                <div class="meta">
                    <span class="time">${time}</span>
                    ${message.type === 'error' ? '<span class="error-badge">Ошибка</span>' : ''}
                </div>
            </div>
        `;
        
        this.elements.chatHistory.appendChild(messageEl);
    }

    formatMessage(text) {
        // Простое форматирование
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
    }

    setLoading(loading) {
        if (loading) {
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

    updateStats() {
        const messages = this.chatHistory.filter(m => m.type !== 'error').length;
        const tokens = this.chatHistory.reduce((sum, msg) => sum + msg.content.length, 0);
        
        if (this.elements.messageCount) {
            this.elements.messageCount.textContent = messages;
        }
        if (this.elements.tokenCount) {
            this.elements.tokenCount.textContent = Math.round(tokens / 4);
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            this.elements.chatHistory.scrollTop = this.elements.chatHistory.scrollHeight;
        }, 100);
    }

    clearChat() {
        if (confirm('Очистить всю историю чата?')) {
            this.chatHistory = [];
            this.elements.chatHistory.innerHTML = '';
            this.updateStats();
            localStorage.removeItem('maxgpt_chat');
            this.addMessage('system', 'Чат очищен. Готов к работе!');
        }
    }

    saveToStorage() {
        try {
            const data = {
                chatHistory: this.chatHistory.slice(-50),
                timestamp: Date.now(),
                stats: {
                    messages: this.chatHistory.length,
                    tokens: this.chatHistory.reduce((sum, msg) => sum + msg.content.length, 0)
                }
            };
            localStorage.setItem('maxgpt_chat', JSON.stringify(data));
        } catch (e) {
            console.warn('Не удалось сохранить историю:', e);
        }
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('maxgpt_chat');
            if (saved) {
                const data = JSON.parse(saved);
                this.chatHistory = data.chatHistory || [];
                
                this.elements.chatHistory.innerHTML = '';
                this.chatHistory.forEach(msg => this.renderMessage(msg));
                this.updateStats();
                this.scrollToBottom();
                
                console.log(`📂 Загружено ${this.chatHistory.length} сообщений`);
            }
        } catch (e) {
            console.warn('Ошибка загрузки истории:', e);
        }
    }

    // ================= ДИАГНОСТИКА И УТИЛИТЫ =================
    showSystemStatus() {
        const status = `
🌐 **Статус системы MaxGPT**

**Сеть:** ${this.networkMonitor.isOnline ? '🟢 Онлайн' : '🔴 Офлайн'}
**Пинг:** ${this.networkMonitor.lastPing > 0 ? `${this.networkMonitor.lastPing}мс` : 'Нет данных'}
**API:** ${this.networkMonitor.apiStatus}
**Токен:** ${this.networkMonitor.tokenStatus}
**Сообщений:** ${this.chatHistory.length}
**Режим:** ${this.config.USE_MOCK_DATA ? '🎭 Демо' : '🚀 Режим API'}

**Команды:**
• \`cmd:diagnose\` - полная диагностика
• \`cmd:ping\` - проверить пинг
• \`er:400\` - справка по ошибке
• \`status\` - этот статус
        `;
        
        this.addMessage('system', status);
    }

    async runFullDiagnostic() {
        this.addMessage('system', '🔍 **Запуск полной диагностики...**');
        
        const steps = [
            { name: 'Проверка сети', func: () => this.checkNetworkStatus() },
            { name: 'Пинг API', func: () => this.performPingTest() },
            { name: 'Статус API', func: () => this.checkAPIStatus() },
            { name: 'Проверка ключа', func: () => this.testAPIKey() }
        ];
        
        let results = [];
        
        for (const step of steps) {
            try {
                const result = await step.func();
                results.push(`✅ ${step.name}: ${result}`);
            } catch (error) {
                results.push(`❌ ${step.name}: ${error.message}`);
            }
        }
        
        const report = `
📊 **Отчёт диагностики**

${results.join('\n')}

**Рекомендации:**
${this.getDiagnosticRecommendations(results)}
        `;
        
        this.addMessage('system', report);
    }

    testAPIKey() {
        return new Promise((resolve) => {
            if (!this.config.API_KEY || this.config.API_KEY === 'ваш_ключ_gigachat') {
                resolve('Ключ не установлен');
            } else if (this.config.API_KEY.length < 20) {
                resolve('Ключ слишком короткий');
            } else {
                resolve('Ключ установлен');
            }
        });
    }

    getDiagnosticRecommendations(results) {
        const issues = results.filter(r => r.includes('❌'));
        
        if (issues.length === 0) return '✅ Все системы работают нормально';
        
        let recommendations = '';
        
        if (results.some(r => r.includes('нет интернет'))) {
            recommendations += '1. Проверьте подключение к интернету\n';
        }
        
        if (results.some(r => r.includes('Ключ не установлен'))) {
            recommendations += '2. Установите API ключ в config.js\n';
        }
        
        if (results.some(r => r.includes('API Error'))) {
            recommendations += '3. Проверьте эндпоинт API в config.js\n';
        }
        
        return recommendations || 'Проверьте консоль браузера для деталей';
    }

    showNetworkNotification(isOnline) {
        const notification = document.createElement('div');
        notification.className = 'network-notification';
        notification.innerHTML = `
            <div class="notification-content">
                ${isOnline ? '🌐 Соединение восстановлено' : '🔴 Потеряно соединение с интернетом'}
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showHint(message) {
        const hint = document.createElement('div');
        hint.className = 'hint-message';
        hint.textContent = message;
        
        const inputContainer = document.querySelector('.input-container');
        inputContainer.parentNode.insertBefore(hint, inputContainer);
        
        setTimeout(() => {
            hint.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            hint.classList.remove('show');
            setTimeout(() => hint.remove(), 300);
        }, 5000);
    }

    showError(message) {
        this.showHint(`⚠️ ${message}`);
    }

    getMockResponse(message) {
        const mockResponses = [
            "Это демо-режим MaxGPT. В реальной версии здесь был бы ответ от GigaChat API.",
            "Для работы с реальным AI установите API ключ GigaChat в config.js",
            `Вы сказали: "${message}". В реальном режиме GigaChat дал бы развернутый ответ.`,
            "Проверьте соединение и API ключ. Используйте `cmd:diagnose` для диагностики."
        ];
        
        return new Promise(resolve => {
            setTimeout(() => {
                const response = mockResponses[Math.floor(Math.random() * mockResponses.length)];
                resolve(response);
            }, 800);
        });
    }

    handleNetworkChange(isOnline) {
        this.networkMonitor.isOnline = isOnline;
        this.updateStatusDisplay();
        this.showNetworkNotification(isOnline);
    }

    handleQuickCommand(cmd) {
        switch(cmd) {
            case 'diagnose':
                this.runFullDiagnostic();
                break;
            case 'clear':
                this.clearChat();
                break;
            case 'status':
                this.showSystemStatus();
                break;
            case 'ping':
                this.performPingTest();
                break;
        }
    }

    showHelp() {
        const help = `
📖 **Справка по MaxGPT**

**Основные команды:**
• Напишите сообщение - обычный запрос к AI
• \`er:400\` - информация об ошибке 400
• \`er:401\` - информация об ошибке 401
• \`cmd:status\` - статус системы
• \`cmd:diagnose\` - полная диагностика
• \`cmd:ping\` - проверить пинг

**Быстрые кнопки:**
• 🗑️ - очистить чат
• ⚙️ - настройки (в разработке)
• 🔄 - обновить статус

**Диагностика:**
Статус API и сети отображается в верхней панели.
Красный цвет - проблемы, зелёный - всё работает.
        `;
        
        this.addMessage('system', help);
    }

    updateTokenStats(usage) {
        // Сохраняем статистику использования токенов
        if (usage && usage.total_tokens) {
            localStorage.setItem('maxgpt_token_stats', JSON.stringify({
                totalTokens: usage.total_tokens,
                lastUpdate: Date.now()
            }));
        }
    }
}

// ================= ИНИЦИАЛИЗАЦИЯ =================
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем мобильное устройство
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        document.body.classList.add('mobile');
        console.log('📱 Мобильное устройство обнаружено');
    }
    
    // Инициализируем приложение
    try {
        window.app = new MobileMaxGPT();
        console.log('✅ MaxGPT успешно инициализирован');
    } catch (error) {
        console.error('❌ Ошибка инициализации MaxGPT:', error);
        
        // Показываем ошибку пользователю
        const errorDiv = document.createElement('div');
        errorDiv.className = 'init-error';
        errorDiv.innerHTML = `
            <h3>⚠️ Ошибка запуска MaxGPT</h3>
            <p>${error.message}</p>
            <button onclick="location.reload()">Перезагрузить</button>
        `;
        document.body.appendChild(errorDiv);
    }
});

// Глобальные утилиты
window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Скопировано в буфер обмена');
    });
};

window.testAPI = function() {
    if (window.app) {
        window.app.checkAllSystems();
    }
};