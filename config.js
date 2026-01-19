// config-simple.js - Упрощенная версия без init()
const MAXGPT_CONFIG = {
    // 🔑 Ваши данные GigaChat
    CLIENT_ID: '019bd542-301a-7cfc-baec-2d046295513b',
    SCOPE: 'GIGACHAT_API_PERS',
    
    // 🌐 Эндпоинты
    AUTH_URL: 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
    API_URL: 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
    
    // 🤖 Модель
    MODEL: 'GigaChat',
    
    // ⚙️ Параметры
    MAX_TOKENS: 1000,
    TEMPERATURE: 0.7,
    
    // 🎯 Промпт
    SYSTEM_PROMPT: `Ты — MaxGPT, полезный AI-помощник.`,
    
    // 🔧 Настройки
    USE_MOCK_DATA: false,
    DEBUG_MODE: true,
    
    // 📊 Мониторинг
    PING_INTERVAL: 60000,
    NETWORK_CHECK_INTERVAL: 30000,
    
    // Добавляем RQ_UID напрямую
    RQ_UID: (function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    })()
};

console.log('✅ Конфигурация загружена:', Object.keys(MAXGPT_CONFIG));