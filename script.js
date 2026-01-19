// script.js - Точка входа приложения
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Загрузка MaxGPT...');
    
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