const API_BASE = '/api';

// Простая функция для получения CSRF токена из кук
function getCSRFToken() {
    console.log('Getting CSRF token from cookies...');
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                console.log('CSRF token found:', cookieValue ? 'yes' : 'no');
                break;
            }
        }
    }
    return cookieValue;
}

// Функция для отображения сообщений
function showMessage(message, type = 'error') {
    console.log('Message:', type, message);
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 3000);
        }
    } else {
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

// Обработка формы входа
if (document.getElementById('loginForm')) {
    console.log('Login form found');
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        const data = {
            username: username,
            password: password
        };
        
        console.log('Login attempt for user:', username);
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Вход...';
        submitButton.disabled = true;
        
        try {
            const csrfToken = getCSRFToken();
            console.log('CSRF Token:', csrfToken);
            
            const response = await fetch(`${API_BASE}/auth/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken || ''
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            
            console.log('Login response status:', response.status);
            
            const result = await response.json();
            console.log('Login response:', result);
            
            if (response.ok) {
                showMessage('Вход выполнен успешно! Перенаправление...', 'success');
                // Немедленно переходим на posts.html без задержки
                window.location.href = 'posts.html';
            } else {
                showMessage(result.error || 'Ошибка при входе');
            }
        } catch (error) {
            console.error('Ошибка при входе:', error);
            showMessage('Ошибка сети при попытке входа: ' + error.message);
        } finally {
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    });
}

// Обработка формы регистрации
if (document.getElementById('registerForm')) {
    console.log('Register form found');
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const passwordConfirm = document.getElementById('regPasswordConfirm').value;
        
        const data = {
            username: username,
            email: email,
            password: password,
            password_confirm: passwordConfirm
        };
        
        console.log('Register attempt for user:', username);
        
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
            const csrfToken = getCSRFToken();
            console.log('CSRF Token:', csrfToken);
            
            const response = await fetch(`${API_BASE}/auth/register/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken || ''
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            
            console.log('Register response status:', response.status);
            
            const result = await response.json();
            console.log('Register response:', result);
            
            if (response.ok) {
                showMessage('Регистрация успешна! Вы автоматически вошли в систему.', 'success');
                // Немедленно переходим на posts.html без задержки
                window.location.href = 'posts.html';
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
            showMessage('Ошибка сети при регистрации: ' + error.message);
        } finally {
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    });
}

// Проверяем аутентификацию при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Page loaded:', window.location.pathname);
    
    // Если на странице постов, проверяем аутентификацию
    if (window.location.pathname.includes('posts.html')) {
        console.log('Checking authentication on posts page...');
        try {
            const response = await fetch(`${API_BASE}/auth/me/`, {
                method: 'GET',
                credentials: 'include'
            });
            
            console.log('Auth check response status:', response.status);
            
            if (!response.ok) {
                console.log('Not authenticated, redirecting to login');
                window.location.href = 'index.html';
            } else {
                console.log('User is authenticated');
                const userData = await response.json();
                console.log('User data:', userData);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = 'index.html';
        }
    }
});