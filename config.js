// config.js - Конфигурация GigaChat API
const MAXGPT_CONFIG = {
    // 🔑 Ваши данные GigaChat
    CLIENT_ID: '019bd542-301a-7cfc-baec-2d046295513b',
    SCOPE: 'GIGACHAT_API_PERS',
    
    // 🌐 Эндпоинты GigaChat
    AUTH_URL: 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
    API_URL: 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
    
    // 🤖 Модель
    MODEL: 'GigaChat',
    
    // ⚙️ Параметры запроса
    MAX_TOKENS: 1000,
    TEMPERATURE: 0.7,
    
    // 🎯 Системный промпт
    SYSTEM_PROMPT: `Ты — MaxGPT, полезный AI-помощник.
Отвечай точно, информативно и дружелюбно.
Избегай политических оценок и спорных тем.`,
    
    // 🔧 Настройки
    USE_MOCK_DATA: false,    // true = демо-режим без API
    DEBUG_MODE: true,        // Детальные логи
    
    // 📊 Мониторинг
    PING_INTERVAL: 60000,    // Пинг каждые 60 секунд
    NETWORK_CHECK_INTERVAL: 30000, // Проверка сети каждые 30 секунд
    
    // 📦 Инициализация
    init: function() {
        this.RQ_UID = this.generateUUID();
        console.log('🔧 MaxGPT Config инициализирован');
        return this;
    },
    
    // 🔄 Генерация UUID для RqUID
    generateUUID: function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}.init();

// 🔒 Защита конфигурации
Object.freeze(MAXGPT_CONFIG);