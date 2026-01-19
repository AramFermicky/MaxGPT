// ai-service.js - Сервис работы с GigaChat API
class AIService {
    constructor(config) {
        this.config = config;
        this.tokenCache = null;
        this.tokenExpiry = 0;
    }
    
    // 🔐 Получение OAuth токена
    async getAccessToken() {
        // Проверяем кэш
        if (this.tokenCache && this.tokenExpiry > Date.now()) {
            return this.tokenCache;
        }
        
        console.log('🔐 Запрос нового OAuth токена...');
        
        try {
            const authHeader = btoa(`${this.config.CLIENT_ID}:`);
            
            const response = await fetch(this.config.AUTH_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${authHeader}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'RqUID': this.config.RQ_UID
                },
                body: new URLSearchParams({
                    'scope': this.config.SCOPE
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Ошибка OAuth:', {
                    status: response.status,
                    error: errorText
                });
                throw new Error(`OAuth ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            
            if (!data.access_token) {
                throw new Error('Токен не найден в ответе OAuth');
            }
            
            // Сохраняем в кэш
            this.tokenCache = data.access_token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // -1 мин
            
            console.log('✅ Токен получен:', {
                length: data.access_token.length,
                expiresIn: data.expires_in
            });
            
            return this.tokenCache;
            
        } catch (error) {
            console.error('🚨 Ошибка получения токена:', error);
            throw error;
        }
    }
    
    // 📤 Отправка запроса к GigaChat API
    async sendRequest(messages, isTest = false) {
        if (this.config.USE_MOCK_DATA) {
            return this.getMockResponse(messages);
        }
        
        try {
            const token = await this.getAccessToken();
            
            const requestBody = {
                model: this.config.MODEL,
                messages: isTest ? 
                    [{ role: 'user', content: 'Тест' }] : 
                    messages,
                max_tokens: isTest ? 10 : this.config.MAX_TOKENS,
                temperature: this.config.TEMPERATURE,
                stream: false
            };
            
            console.log('📤 Отправка запроса к GigaChat...');
            
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000);
            
            const response = await fetch(this.config.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Ошибка API:', {
                    status: response.status,
                    error: errorText
                });
                
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: errorText };
                }
                
                throw new Error(`API ${response.status}: ${errorData.error?.message || errorText}`);
            }
            
            const data = await response.json();
            console.log('✅ API ответ получен');
            return data;
            
        } catch (error) {
            console.error('🚨 Ошибка отправки запроса:', error);
            throw error;
        }
    }
    
    // 🎭 Mock-ответы для демо-режима
    async getMockResponse(messages) {
        const userMessage = messages[messages.length - 1]?.content || '';
        
        const mockResponses = [
            `Это демо-ответ на: "${userMessage}". В реальном режиме здесь был бы ответ от GigaChat.`,
            `Для работы с реальным AI установите USE_MOCK_DATA: false в config.js`,
            `Демо-режим: ваш запрос "${userMessage.substring(0, 50)}..." получен.`
        ];
        
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    choices: [{
                        message: {
                            content: mockResponses[Math.floor(Math.random() * mockResponses.length)]
                        }
                    }]
                });
            }, 800);
        });
    }
    
    // 🔍 Проверка доступности API
    async testConnection() {
        try {
            const response = await this.sendRequest([], true);
            return response && response.choices;
        } catch (error) {
            console.warn('⚠️ API недоступен:', error.message);
            return false;
        }
    }
    
    // 🔄 Очистка кэша токена
    clearTokenCache() {
        this.tokenCache = null;
        this.tokenExpiry = 0;
        console.log('🧹 Кэш токена очищен');
    }
}