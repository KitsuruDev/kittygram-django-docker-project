const API_BASE = 'http://localhost:8000/api';

// Загрузка данных профиля
document.addEventListener('DOMContentLoaded', async () => {
    await loadProfile();
    setupEventListeners();
});

// Загрузка профиля
async function loadProfile() {
    try {
        const response = await fetch(`${API_BASE}/auth/me/`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const user = await response.json();
            displayProfile(user);
        } else {
            window.location.href = 'login.html';
        }
    } catch (error) {
        window.location.href = 'login.html';
    }
}

// Отображение профиля
function displayProfile(user) {
    const profileInfo = document.getElementById('profileInfo');
    profileInfo.innerHTML = `
        <div class="profile-info">
            <p><strong>ID:</strong> ${user.id}</p>
            <p><strong>Имя пользователя:</strong> ${user.username}</p>
            <p><strong>Email:</strong> ${user.email || 'Не указан'}</p>
        </div>
    `;
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопка выхода
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await fetch(`${API_BASE}/auth/logout/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-CSRFToken': getCSRFToken()
                }
            });
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Ошибка при выходе:', error);
        }
    });
    
    // Кнопка "Мои посты"
    document.getElementById('myPostsBtn').addEventListener('click', () => {
        // Можно реализовать фильтрацию постов на странице posts.html
        window.location.href = 'posts.html';
    });
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