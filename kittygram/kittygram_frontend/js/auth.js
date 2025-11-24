const API_BASE = 'http://localhost:8000/api';

// Функция для получения CSRF токена
async function getCSRFToken() {
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

// Получаем CSRF токен при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    await getCSRFToken();
});

// Обработка формы входа
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            username: formData.get('username'),
            password: formData.get('password')
        };
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Вход...';
        submitButton.disabled = true;
        
        try {
            const csrfToken = await getCSRFToken();
            
            const response = await fetch(`${API_BASE}/auth/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken || ''
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showMessage('Вход выполнен успешно! Перенаправление...', 'success');
                setTimeout(() => {
                    window.location.href = 'posts.html';
                }, 1000);
            } else {
                showMessage(result.error || 'Ошибка при входе');
            }
        } catch (error) {
            console.error('Ошибка при входе:', error);
            showMessage('Ошибка сети при попытке входа');
        } finally {
            submitButton.textContent = originalText;
            submitButton.disabled = false;
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
        
        // Проверка паролей на клиенте
        if (data.password !== data.password_confirm) {
            showMessage('Пароли не совпадают');
            return;
        }
        
        if (data.password.length < 8) {
            showMessage('Пароль должен содержать минимум 8 символов');
            return;
        }
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Регистрация...';
        submitButton.disabled = true;
        
        try {
            const csrfToken = await getCSRFToken();
            
            const response = await fetch(`${API_BASE}/auth/register/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken || ''
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showMessage('Регистрация успешна! Вы автоматически вошли в систему.', 'success');
                setTimeout(() => {
                    window.location.href = 'posts.html';
                }, 2000);
            } else {
                if (result.error) {
                    showMessage(result.error);
                } else if (result.username) {
                    showMessage(result.username[0]);
                } else if (result.email) {
                    showMessage(result.email[0]);
                } else if (result.password) {
                    showMessage(result.password[0]);
                } else {
                    showMessage('Ошибка при регистрации');
                }
            }
        } catch (error) {
            console.error('Ошибка при регистрации:', error);
            showMessage('Ошибка сети при регистрации');
        } finally {
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    });
}