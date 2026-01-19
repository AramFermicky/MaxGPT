// script.js - в начале
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Загрузка MaxGPT...');
    
    // Проверка конфигурации перед запуском
    if (!window.MAXGPT_CONFIG) {
        showCriticalError('Конфигурация не загружена. Проверьте config.js');
        return;
    }
    
    // Проверка обязательных полей
    const requiredFields = [
        'CLIENT_ID', 'AUTH_URL', 'API_URL', 'MODEL',
        'PING_INTERVAL', 'NETWORK_CHECK_INTERVAL'
    ];
    
    const missingFields = requiredFields.filter(field => !window.MAXGPT_CONFIG[field]);
    
    if (missingFields.length > 0) {
        showCriticalError(`Отсутствуют поля в config.js: ${missingFields.join(', ')}`);
        return;
    }
    
    // ... остальной код инициализации
});

function showCriticalError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'init-error';
    errorDiv.innerHTML = `
        <h3>⚠️ Критическая ошибка конфигурации</h3>
        <p>${message}</p>
        <div class="error-actions">
            <button onclick="location.reload()">🔄 Перезагрузить</button>
            <button onclick="showConfigHelp()">📖 Помощь</button>
        </div>
    `;
    document.body.appendChild(errorDiv);
}
    
    // Проверка мобильного устройства
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        document.body.classList.add('mobile');
        console.log('📱 Мобильное устройство обнаружено');
    }
    
    try {
        // Инициализация приложения
        window.app = new AppCore(window.MAXGPT_CONFIG);
        await window.app.init();
        
        console.log('✅ MaxGPT успешно инициализирован');
        
        // Глобальные утилиты
        window.copyToClipboard = (text) => {
            navigator.clipboard.writeText(text)
                .then(() => window.app.ui.showSuccessHint('Скопировано в буфер обмена'))
                .catch(err => console.error('Ошибка копирования:', err));
        };
        
    } catch (error) {
        console.error('❌ Ошибка инициализации MaxGPT:', error);
        
        // Показать ошибку пользователю
        const errorDiv = document.createElement('div');
        errorDiv.className = 'init-error';
        errorDiv.innerHTML = `
            <h3>⚠️ Ошибка запуска MaxGPT</h3>
            <p>${error.message}</p>
            <div class="error-actions">
                <button onclick="location.reload()">🔄 Перезагрузить</button>
                <button onclick="localStorage.clear(); location.reload()">🧹 Очистить данные</button>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }
});