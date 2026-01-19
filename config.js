// config.js - Исправленная конфигурация для GigaChat API
const MAXGPT_CONFIG = {
    // 🔑 Ваши данные (замените на свои, если нужно)
    CLIENT_ID: '019bd542-301a-7cfc-baec-2d046295513b',
    CLIENT_SECRET: '', // Обычно пусто для GigaChat (только ID)
    SCOPE: 'GIGACHAT_API_PERS',
    RQ_UID: this.generateUUID(), // Генерируем уникальный ID
    
    // 🌐 Эндпоинты GigaChat
    AUTH_URL: 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
    API_URL: 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
    
    // 🤖 Модель
    MODEL: 'GigaChat',
    
    // ⚙️ Параметры
    MAX_TOKENS: 1000,
    TEMPERATURE: 0.7,
    STREAM: false,
    
    // 🎯 Промпт
    SYSTEM_PROMPT: `Ты — MaxGPT, полезный AI-помощник.
Отвечай точно, информативно и дружелюбно.
Если не знаешь ответа — так и скажи.`,
    
    // 🔧 Настройки
    DEBUG_MODE: true,
    USE_MOCK_DATA: false,
    
    // Генератор UUID для RqUID
    generateUUID: function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
};

// Инициализируем RQ_UID
MAXGPT_CONFIG.RQ_UID = MAXGPT_CONFIG.generateUUID();

// 🔒 Защита
Object.freeze(MAXGPT_CONFIG);

console.log('🔧 MaxGPT Config для GigaChat OAuth загружен:', {
    clientId: MAXGPT_CONFIG.CLIENT_ID ? 'установлен' : 'отсутствует',
    rqUid: MAXGPT_CONFIG.RQ_UID.substring(0, 8) + '...',
    scope: MAXGPT_CONFIG.SCOPE
});