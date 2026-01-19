// app-core.js - Основной класс приложения
class AppCore {
    constructor(config) {
        this.config = config;
        this.chatHistory = [];
        this.isProcessing = false;
        
        // Инициализация модулей
        this.ui = new UIManager();
        this.aiService = new AIService(config);
        this.diagnoseSystem = new DiagnoseSystem(config);
        
        // Привязка контекста
        this.sendMessage = this.sendMessage.bind(this);
        this.runDiagnostic = this.runDiagnostic.bind(this);
        this.clearChat = this.clearChat.bind(this);
        
        console.log('🚀 App Core инициализирован');
    }
    
    // 🏁 Инициализация приложения
    async init() {
        console.log('🚀 Инициализация MaxGPT...');
        
        // Загрузка истории
        this.loadHistory();
        
        // Первоначальная диагностика
        await this.diagnoseSystem.checkNetworkStatus();
        this.updateStatusDisplay();
        
        // Запуск периодических проверок
        this.startPeriodicChecks();
        
        // Приветственное сообщение
        this.showWelcomeMessage();
        
        console.log('✅ MaxGPT готов к работе');
    }
    
    // 📤 Отправка сообщения
    async sendMessage() {
        if (this.isProcessing) return;
        
        const input = this.ui.elements.userInput;
        const message = input.value.trim();
        if (!message) return;
        
        // Проверка специальных команд
        if (this.handleSpecialCommand(message)) {
            input.value = '';
            return;
        }
        
        // Проверка сети
        if (!this.diagnoseSystem.status.isOnline) {
            this.ui.showErrorHint('Нет интернет-соединения');
            return;
        }
        
        this.isProcessing = true;
        this.ui.setLoading(true);
        
        try {
            // Добавление сообщения пользователя
            this.ui.addMessage('user', message);
            this.chatHistory.push({ role: 'user', content: message });
            input.value = '';
            
            // Получение ответа от AI
            const messages = this.prepareMessages();
            const response = await this.aiService.sendRequest(messages);
            
            // Добавление ответа
            const aiResponse = response.choices[0].message.content;
            this.ui.addMessage('assistant', aiResponse);
            this.chatHistory.push({ role: 'assistant', content: aiResponse });
            
            // Сохранение и обновление
            this.saveHistory();
            this.updateStats();
            
        } catch (error) {
            console.error('❌ Ошибка отправки:', error);
            
            // Анализ ошибки
            const errorInfo = this.analyzeError(error);
            this.ui.addMessage('error', errorInfo.formatted);
            
            // Показать справку для известных ошибок
            if (errorInfo.code && this.diagnoseSystem.errorDatabase[errorInfo.code]) {
                this.showErrorHelp(errorInfo.code);
            }
            
        } finally {
            this.isProcessing = false;
            this.ui.setLoading(false);
            
            // Обновление статуса
            setTimeout(() => this.updateStatusDisplay(), 1000);
        }
    }
    
    // 🎯 Обработка специальных команд
    handleSpecialCommand(message) {
        const lowerMsg = message.toLowerCase().trim();
        
        // Диагностические команды
        if (lowerMsg.startsWith('cmd:')) {
            const cmd = lowerMsg.substring(4).trim();
            this.executeCommand(cmd);
            return true;
        }
        
        // Запрос справки по ошибке
        if (lowerMsg.startsWith('er:')) {
            const errorCode = message.substring(3).trim();
            this.showErrorHelp(errorCode);
            return true;
        }
        
        return false;
    }
    
    // ⚙️ Выполнение команды
    executeCommand(command) {
        switch(command) {
            case 'diagnose':
                this.runDiagnostic();
                break;
            case 'status':
                this.showSystemStatus();
                break;
            case 'ping':
                this.testPing();
                break;
            case 'clear':
                this.clearChat();
                break;
            case 'help':
                this.showHelp();
                break;
            default:
                this.ui.addMessage('system', `Неизвестная команда: ${command}`);
        }
    }
    
    // 🔍 Запуск диагностики
    async runDiagnostic() {
        this.ui.addMessage('diagnostic', '🔍 Запуск диагностики системы...');
        
        const results = await this.diagnoseSystem.runFullDiagnostic();
        
        // Проверка API (если сеть есть)
        if (this.diagnoseSystem.status.isOnline) {
            const apiAvailable = await this.aiService.testConnection();
            this.diagnoseSystem.updateApiStatus(
                apiAvailable ? 'active' : 'error',
                apiAvailable ? 'valid' : 'invalid'
            );
            
            results.push({
                step: 'GigaChat API',
                status: apiAvailable ? '✅ Доступен' : '❌ Недоступен',
                details: apiAvailable ? 'API отвечает на запросы' : 'API не отвечает'
            });
        }
        
        // Формирование отчёта
        const report = this.diagnoseSystem.formatDiagnosticReport(results);
        this.ui.addMessage('diagnostic', report);
        
        // Обновление статуса
        this.updateStatusDisplay();
    }
    
    // 📊 Показать статус системы
    showSystemStatus() {
        const status = this.diagnoseSystem.getCurrentStatus();
        const mode = this.config.USE_MOCK_DATA ? '🎭 Демо' : '🚀 Режим API';
        
        let statusText = `📊 **Статус системы MaxGPT**\n\n`;
        statusText += `**Режим:** ${mode}\n`;
        statusText += `**Сеть:** ${status.isOnline ? '🟢 Онлайн' : '🔴 Офлайн'}\n`;
        
        if (status.ping) {
            statusText += `**Пинг:** ${status.ping}мс\n`;
        }
        
        statusText += `**API:** ${status.api === 'active' ? '🟢 Активен' : '🔴 Ошибка'}\n`;
        statusText += `**Токен:** ${status.token === 'valid' ? '🟢 Активен' : '🔴 Проблема'}\n`;
        statusText += `**Сообщений:** ${this.chatHistory.length}\n`;
        statusText += `**Последняя проверка:** ${new Date(status.lastCheck).toLocaleTimeString()}`;
        
        this.ui.addMessage('system', statusText);
    }
    
    // 📶 Тест пинга
    async testPing() {
        this.ui.addMessage('system', '📶 Проверка пинга до API...');
        const ping = await this.diagnoseSystem.measurePing();
        
        if (ping) {
            this.ui.addMessage('system', `Пинг: ${ping}мс`);
        } else {
            this.ui.addMessage('system', 'Не удалось измерить пинг. API недоступен.');
        }
    }
    
    // ❓ Показать справку
    showHelp() {
        const helpText = `📖 **Справка по MaxGPT**\n\n` +
            `**Основные команды:**\n` +
            `• \`cmd:diagnose\` - полная диагностика\n` +
            `• \`cmd:status\` - статус системы\n` +
            `• \`cmd:ping\` - проверить пинг\n` +
            `• \`cmd:clear\` - очистить чат\n` +
            `• \`cmd:help\` - эта справка\n\n` +
            `**Справка по ошибкам:**\n` +
            `• \`er:400\` - информация об ошибке 400\n` +
            `• \`er:401\` - информация об ошибке 401\n` +
            `• \`er:429\` - информация об ошибке 429\n` +
            `• \`er:500\` - информация об ошибке 500\n\n` +
            `**Быстрые действия:**\n` +
            `• Нажмите 🗑️ для очистки чата\n` +
            `• Используйте Shift+Enter для новой строки`;
        
        this.ui.addMessage('system', helpText);
    }
    
    // 🔧 Показать справку по ошибке
    showErrorHelp(errorCode) {
        const errorInfo = this.diagnoseSystem.getErrorInfo(errorCode);
        
        let response = `🔍 **${errorInfo.title} (${errorCode})**\n\n`;
        response += `**Решение:** ${errorInfo.solution}\n\n`;
        response += `**Шаги для исправления:**\n`;
        
        errorInfo.steps.forEach((step, index) => {
            response += `${index + 1}. ${step}\n`;
        });
        
        response += `\n**Дополнительно:**\n`;
        response += `• Используйте \`cmd:diagnose\` для полной диагностики\n`;
        response += `• Проверьте config.js на наличие ошибок\n`;
        response += `• Убедитесь в правильности API ключа`;
        
        this.ui.addMessage('assistant', response);
    }
    
    // 🔎 Анализ ошибки
    analyzeError(error) {
        let errorCode = 'unknown';
        let message = error.message;
        
        // Извлечение кода ошибки
        const codeMatch = error.message.match(/(\d{3})/);
        if (codeMatch) {
            errorCode = codeMatch[1];
        } else if (error.message.includes('timeout') || error.name === 'AbortError') {
            errorCode = 'timeout';
            message = 'Таймаут соединения (30 секунд)';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
            errorCode = 'network';
            message = 'Проблема с сетевым соединением';
        }
        
        return {
            code: errorCode,
            message: message,
            formatted: `**Ошибка ${errorCode}**\n${message}`
        };
    }
    
    // 📝 Подготовка сообщений для API
    prepareMessages() {
        const messages = [
            { role: 'system', content: this.config.SYSTEM_PROMPT }
        ];
        
        // Добавляем историю (последние 4 сообщения)
        const recentHistory = this.chatHistory.slice(-4);
        recentHistory.forEach(msg => {
            messages.push({ 
                role: msg.role === 'assistant' ? 'assistant' : 'user', 
                content: msg.content 
            });
        });
        
        return messages;
    }
    
    // 🏁 Показать приветственное сообщение
    showWelcomeMessage() {
        const welcomeText = `👋 **Добро пожаловать в MaxGPT!**\n\n` +
            `Я ваш AI-помощник, работающий на GigaChat API.\n\n` +
            `**Доступные команды:**\n` +
            `• \`cmd:diagnose\` - диагностика системы\n` +
            `• \`cmd:status\` - текущий статус\n` +
            `• \`cmd:help\` - справка по командам\n` +
            `• \`er:400\` - информация об ошибке\n\n` +
            `**Текущий режим:** ${this.config.USE_MOCK_DATA ? '🎭 Демо' : '🚀 Реальный API'}\n` +
            `**Модель:** ${this.config.MODEL}`;
        
        this.ui.addMessage('system', welcomeText);
    }
    
    // 🔄 Запуск периодических проверок
    startPeriodicChecks() {
    // Проверяем наличие конфигурации
    if (!this.config) {
        console.error('❌ Конфигурация не найдена');
        return;
    }
    // Безопасный доступ к интервалам (значения по умолчанию)
    const networkInterval = this.config.NETWORK_CHECK_INTERVAL || 30000;
    const pingInterval = this.config.PING_INTERVAL || 60000;
    
    console.log('🔄 Запуск периодических проверок:', {
        network: networkInterval + 'мс',
        ping: pingInterval + 'мс'
    });
    
    // Проверка сети
    setInterval(async () => {
        await this.diagnoseSystem.checkNetworkStatus();
        this.updateStatusDisplay();
    }, networkInterval);
    
    // Пинг
    setInterval(async () => {
        if (this.diagnoseSystem.status.isOnline) {
            await this.diagnoseSystem.measurePing();
            this.updateStatusDisplay();
        }
    }, pingInterval);
}
        // Проверка сети
        setInterval(async () => {
            await this.diagnoseSystem.checkNetworkStatus();
            this.updateStatusDisplay();
        }, this.config.NETWORK_CHECK_INTERVAL);
        
        // Пинг
        setInterval(async () => {
            if (this.diagnoseSystem.status.isOnline) {
                await this.diagnoseSystem.measurePing();
                this.updateStatusDisplay();
            }
        }, this.config.PING_INTERVAL);
    }
    
    // 📊 Обновление отображения статуса
    updateStatusDisplay() {
        const status = this.diagnoseSystem.getCurrentStatus();
        this.ui.updateStatusDisplay(status);
    }
    
    // 📈 Обновление статистики
    updateStats() {
        const messages = this.chatHistory.length;
        const tokens = this.chatHistory.reduce((sum, msg) => sum + msg.content.length, 0);
        this.ui.updateCounters(messages, Math.round(tokens / 4));
    }
    
    // 🧹 Очистка чата
    clearChat() {
        if (confirm('Очистить всю историю чата?')) {
            this.chatHistory = [];
            this.ui.clearChat();
            localStorage.removeItem('maxgpt_chat');
            this.ui.addMessage('system', 'Чат очищен. Чем могу помочь?');
        }
    }
    
    // 💾 Загрузка истории
    loadHistory() {
        try {
            const saved = localStorage.getItem('maxgpt_chat');
            if (saved) {
                const data = JSON.parse(saved);
                this.chatHistory = data.history || [];
                
                // Восстановление сообщений в UI
                this.chatHistory.forEach(msg => {
                    this.ui.addMessage(msg.role, msg.content, new Date(msg.timestamp));
                });
                
                this.updateStats();
                console.log(`📂 Загружено ${this.chatHistory.length} сообщений`);
            }
        } catch (error) {
            console.warn('Ошибка загрузки истории:', error);
        }
    }
    
    // 💾 Сохранение истории
    saveHistory() {
        try {
            const data = {
                history: this.chatHistory.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                    timestamp: new Date().toISOString()
                })),
                savedAt: new Date().toISOString()
            };
            localStorage.setItem('maxgpt_chat', JSON.stringify(data));
        } catch (error) {
            console.warn('Ошибка сохранения истории:', error);
        }
    }
    
    // 🎯 Обработчик быстрых команд
    handleQuickCommand(command) {
        this.executeCommand(command);
    }
}