// diagnose-system.js - Система диагностики и мониторинга
class DiagnoseSystem {
    constructor(config) {
        this.config = config;
        this.status = {
            network: 'checking',
            api: 'checking',
            token: 'checking',
            lastPing: null,
            lastCheck: null,
            isOnline: navigator.onLine
        };
        
        this.errorDatabase = {
            '400': {
                title: 'Некорректный запрос',
                solution: 'Проверьте формат JSON запроса и кодировку сообщений',
                steps: ['Проверьте config.js', 'Убедитесь в корректности модели']
            },
            '401': {
                title: 'Ошибка авторизации',
                solution: 'Неверный или просроченный API ключ/токен',
                steps: ['Проверьте CLIENT_ID в config.js', 'Очистите кэш токена']
            },
            '403': {
                title: 'Доступ запрещен',
                solution: 'У вас нет прав на использование этого ресурса',
                steps: ['Проверьте SCOPE в config.js', 'Убедитесь в активации ключа']
            },
            '429': {
                title: 'Слишком много запросов',
                solution: 'Превышен лимит запросов. Подождите 60 секунд',
                steps: ['Уменьшите частоту запросов', 'Проверьте лимиты тарифа']
            },
            '500': {
                title: 'Ошибка сервера',
                solution: 'Проблема на стороне GigaChat API',
                steps: ['Попробуйте через 5 минут', 'Проверьте status.sberbank.ru']
            },
            'network': {
                title: 'Проблема сети',
                solution: 'Нет соединения с интернетом или блокировка CORS',
                steps: ['Проверьте интернет-соединение', 'Отключите VPN/прокси']
            },
            'timeout': {
                title: 'Таймаут соединения',
                solution: 'Сервер не отвечает в течение 30 секунд',
                steps: ['Проверьте интернет-соединение', 'Увеличьте timeout']
            }
        };
    }
    
    // 🌐 Проверка интернет-соединения
    async checkNetworkStatus() {
        console.log('🌐 Проверка сетевого соединения...');
        
        // Используем несколько тестовых URL для надежности
        const testUrls = [
            'https://www.google.com/gen_204',
            'https://connectivitycheck.gstatic.com/generate_204',
            'https://captive.apple.com/hotspot-detect.html'
        ];
        
        let isOnline = false;
        
        for (const url of testUrls) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);
                
                await fetch(url, {
                    method: 'HEAD',
                    mode: 'no-cors',
                    cache: 'no-store',
                    signal: controller.signal
                });
                
                clearTimeout(timeout);
                isOnline = true;
                break;
            } catch (error) {
                continue;
            }
        }
        
        this.status.isOnline = isOnline || navigator.onLine;
        this.status.network = this.status.isOnline ? 'online' : 'offline';
        this.status.lastCheck = Date.now();
        
        console.log(`📡 Сеть: ${this.status.network}`);
        return this.status.isOnline;
    }
    
    // 📶 Измерение пинга до API
    async measurePing() {
        if (!this.status.isOnline) {
            this.status.lastPing = null;
            return null;
        }
        
        try {
            const startTime = Date.now();
            
            // Пробуем подключиться к OAuth серверу
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            
            await fetch(this.config.AUTH_URL, {
                method: 'HEAD',
                mode: 'no-cors',
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            const ping = Date.now() - startTime;
            
            this.status.lastPing = ping;
            console.log(`📶 Пинг: ${ping}мс`);
            return ping;
            
        } catch (error) {
            console.warn('⚠️ Не удалось измерить пинг:', error.message);
            this.status.lastPing = null;
            return null;
        }
    }
    
    // 🔍 Полная диагностика системы
    async runFullDiagnostic() {
        console.log('🔍 Запуск полной диагностики...');
        
        const results = [];
        
        // 1. Проверка сети
        results.push({
            step: 'Проверка сети',
            status: await this.checkNetworkStatus() ? '✅ Онлайн' : '❌ Офлайн',
            details: this.status.isOnline ? 'Интернет-соединение установлено' : 'Нет интернет-соединения'
        });
        
        // 2. Пинг
        const ping = await this.measurePing();
        results.push({
            step: 'Пинг до API',
            status: ping ? `✅ ${ping}мс` : '⚠️ Недоступен',
            details: ping ? 'Соединение с API установлено' : 'API недоступен'
        });
        
        // 3. Проверка конфигурации
        const configCheck = this.checkConfiguration();
        results.push(configCheck);
        
        // 4. Проверка API (только если сеть есть)
        if (this.status.isOnline) {
            results.push({
                step: 'GigaChat API',
                status: '⏳ Проверка...',
                details: 'Тестирование соединения с API'
            });
        }
        
        this.status.lastCheck = Date.now();
        return results;
    }
    
    // ⚙️ Проверка конфигурации
    checkConfiguration() {
        const issues = [];
        
        if (!this.config.CLIENT_ID || this.config.CLIENT_ID.includes('ваш_ключ')) {
            issues.push('CLIENT_ID не установлен');
        }
        
        if (!this.config.SCOPE) {
            issues.push('SCOPE не указан');
        }
        
        return {
            step: 'Конфигурация',
            status: issues.length === 0 ? '✅ Корректна' : '❌ Ошибки',
            details: issues.length === 0 ? 
                'Все параметры настроены правильно' : 
                issues.join(', ')
        };
    }
    
    // 🔧 Получение информации об ошибке
    getErrorInfo(errorCode) {
        return this.errorDatabase[errorCode] || {
            title: `Неизвестная ошибка (${errorCode})`,
            solution: 'Проверьте консоль браузера для деталей',
            steps: ['Запустите диагностику: cmd:diagnose', 'Проверьте config.js']
        };
    }
    
    // 📊 Формирование диагностического отчёта
    formatDiagnosticReport(results) {
        let report = '📊 **Диагностический отчёт**\n\n';
        
        results.forEach((result, index) => {
            report += `${result.status} **${result.step}**: ${result.details}\n`;
        });
        
        report += '\n**Рекомендации:**\n';
        
        if (!this.status.isOnline) {
            report += '1. Проверьте интернет-соединение\n';
            report += '2. Отключите VPN/прокси\n';
            report += '3. Попробуйте другую сеть\n';
        }
        
        if (this.config.USE_MOCK_DATA) {
            report += '4. Для реального API установите USE_MOCK_DATA: false\n';
        }
        
        return report;
    }
    
    // 🔄 Обновление статуса API
    updateApiStatus(status, tokenStatus = 'unknown') {
        this.status.api = status;
        this.status.token = tokenStatus;
    }
    
    // 📈 Получение текущего статуса
    getCurrentStatus() {
        return {
            network: this.status.network,
            api: this.status.api,
            token: this.status.token,
            ping: this.status.lastPing,
            lastCheck: this.status.lastCheck,
            isOnline: this.status.isOnline
        };
    }
}