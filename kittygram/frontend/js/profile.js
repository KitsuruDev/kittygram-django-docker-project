const API_BASE = '/api';

// Загрузка данных профиля
document.addEventListener('DOMContentLoaded', async () => {
    await loadProfile();
    setupEventListeners();
});

// Загрузка профиля
async function loadProfile() {
    try {
        console.log('Loading profile...');
        const response = await fetch(`${API_BASE}/auth/me/`, {
            credentials: 'include'
        });
        
        console.log('Profile response status:', response.status);
        
        if (response.ok) {
            const user = await response.json();
            console.log('User profile loaded:', user);
            displayProfile(user);
        } else {
            console.warn('Profile load failed, redirecting to login');
            showAuthMessage();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showAuthMessage();
    }
}

// Отображение профиля
function displayProfile(user) {
    const profileInfo = document.getElementById('profileInfo');
    if (!profileInfo) {
        console.error('Profile info element not found');
        return;
    }
    
    profileInfo.innerHTML = `
        <div class="profile-info">
            <p><strong>ID:</strong> ${user.id}</p>
            <p><strong>Имя пользователя:</strong> ${user.username}</p>
            <p><strong>Email:</strong> ${user.email || 'Не указан'}</p>
            <p><strong>Статус:</strong> <span class="status-active">Активен</span></p>
        </div>
    `;
}

// Показать сообщение об необходимости авторизации
function showAuthMessage() {
    const profileInfo = document.getElementById('profileInfo');
    if (profileInfo) {
        profileInfo.innerHTML = `
            <div class="auth-message">
                <h3>Необходима авторизация</h3>
                <p>Пожалуйста, войдите в систему для просмотра профиля</p>
                <button onclick="window.location.href='login.html'" class="btn">Войти</button>
            </div>
        `;
    }
    
    // Скрываем кнопки для неавторизованных пользователей
    const authButtons = document.querySelector('.profile-actions');
    if (authButtons) {
        authButtons.style.display = 'none';
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопка выхода
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (!confirm('Вы уверены, что хотите выйти?')) {
                return;
            }
            
            try {
                const csrfToken = getCSRFToken();
                const response = await fetch(`${API_BASE}/auth/logout/`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'X-CSRFToken': csrfToken,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('Logout response status:', response.status);
                
                if (response.ok) {
                    console.log('✅ Выход выполнен успешно');
                    showNotification('Выход выполнен успешно', 'success');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1000);
                } else {
                    console.warn('⚠️ Ошибка при выходе, но перенаправляем на логин');
                    window.location.href = 'login.html';
                }
            } catch (error) {
                console.error('❌ Ошибка при выходе:', error);
                window.location.href = 'login.html';
            }
        });
    }
    
    // Кнопка "Мои посты"
    const myPostsBtn = document.getElementById('myPostsBtn');
    if (myPostsBtn) {
        myPostsBtn.addEventListener('click', () => {
            window.location.href = 'posts.html';
        });
    }
    
    // Кнопка "Назад"
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'posts.html';
        });
    }
}

// Получение CSRF токена
function getCSRFToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Функция для показа уведомлений
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Добавляем CSS стили если их нет
if (!document.querySelector('#profile-styles')) {
    const style = document.createElement('style');
    style.id = 'profile-styles';
    style.textContent = `
        .auth-message {
            text-align: center;
            padding: 40px 20px;
            background: #f8f9fa;
            border-radius: 10px;
            margin: 20px 0;
            border: 2px dashed #dee2e6;
        }
        
        .auth-message h3 {
            color: #6c757d;
            margin-bottom: 15px;
        }
        
        .auth-message .btn {
            margin-top: 15px;
        }
        
        .profile-info {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .profile-info p {
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .profile-info p:last-child {
            border-bottom: none;
        }
        
        .status-active {
            color: #28a745;
            font-weight: bold;
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}