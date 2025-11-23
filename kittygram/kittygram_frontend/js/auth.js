const API_BASE = 'http://localhost:8000/api';

// Функция для отображения сообщений
function showMessage(message, type = 'error') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
}

// Обработка формы входа
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            username: formData.get('username'),
            password: formData.get('password')
        };
        
        try {
            const response = await fetch(`${API_BASE}/auth/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                window.location.href = 'posts.html';
            } else {
                showMessage('Неверное имя пользователя или пароль');
            }
        } catch (error) {
            showMessage('Ошибка при входе в систему');
        }
    });
}

// Обработка формы регистрации
if (document.getElementById('registerForm')) {
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            password_confirm: formData.get('password_confirm')
        };
        
        try {
            const response = await fetch(`${API_BASE}/auth/register/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showMessage('Регистрация успешна! Перенаправление...', 'success');
                // Автоматический редирект после успешной регистрации
                setTimeout(() => {
                    window.location.href = 'posts.html';
                }, 2000);
            } else {
                if (result.error) {
                    showMessage(result.error);
                } else if (result.username) {
                    showMessage(result.username[0]);
                } else if (result.password) {
                    showMessage(result.password[0]);
                } else {
                    showMessage('Ошибка при регистрации');
                }
            }
        } catch (error) {
            showMessage('Ошибка при регистрации');
        }
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