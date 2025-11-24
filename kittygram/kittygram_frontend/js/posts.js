const API_BASE = 'http://localhost:8000/api';
let currentUser = null;
let postsCache = []; // Кэш постов для быстрого доступа

// Проверка аутентификации и загрузка данных
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadPosts();
    setupEventListeners();
});

// Проверка аутентификации
async function checkAuth() {
    try {
        // Сначала получаем CSRF токен
        await ensureCSRFToken();
        
        const response = await fetch(`${API_BASE}/auth/me/`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            currentUser = await response.json();
            console.log('Пользователь авторизован:', currentUser.username);
        } else {
            console.log('Пользователь не авторизован, перенаправление на логин');
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Ошибка при проверке аутентификации:', error);
        window.location.href = 'login.html';
    }
}

// Загрузка постов
async function loadPosts() {
    try {
        const response = await fetch(`${API_BASE}/posts/`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const posts = await response.json();
            postsCache = posts; // Сохраняем в кэш
            displayPosts(posts);
        }
    } catch (error) {
        console.error('Ошибка при загрузке постов:', error);
    }
}

// Отображение постов
function displayPosts(posts) {
    const container = document.getElementById('postsContainer');
    container.innerHTML = '';
    
    posts.forEach(post => {
        const postElement = createPostElement(post);
        container.appendChild(postElement);
    });
}

// Создание элемента поста
function createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post-card';
    postDiv.id = `post-${post.id}`;
    
    const canEdit = post.can_edit && currentUser && post.author.id === currentUser.id;
    
    postDiv.innerHTML = `
        ${post.image ? `<img src="${post.image}" alt="${post.title}" class="post-image">` : ''}
        <div class="post-content">
            <h3 class="post-title">${post.title}</h3>
            <p class="post-description">${post.description || ''}</p>
            <div class="post-meta">
                <span>Автор: ${post.author.username}</span>
                <span>${new Date(post.created_at).toLocaleDateString()}</span>
            </div>
            ${canEdit ? `
                <div class="post-actions">
                    <button class="btn" onclick="editPost(${post.id})">Редактировать</button>
                    <button class="btn secondary" onclick="deletePost(${post.id})">Удалить</button>
                </div>
            ` : ''}
        </div>
    `;
    
    return postDiv;
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопка профиля
    document.getElementById('profileBtn').addEventListener('click', () => {
        window.location.href = 'profile.html';
    });
    
    // Кнопка выхода
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            const response = await fetch(`${API_BASE}/auth/logout/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                console.log('✅ Выход выполнен успешно');
                window.location.href = 'login.html';
            } else {
                console.warn('⚠️ Ошибка при выходе, но перенаправляем на логин');
                // Все равно перенаправляем на страницу логина
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('❌ Ошибка при выходе:', error);
            // Все равно перенаправляем на страницу логина
            window.location.href = 'login.html';
        }
    });
    
    // Модальное окно создания поста
    const createModal = document.getElementById('createPostModal');
    const createBtn = document.getElementById('createPostBtn');
    const createCloseBtn = createModal.querySelector('.close');
    
    createBtn.addEventListener('click', () => {
        createModal.style.display = 'block';
    });
    
    createCloseBtn.addEventListener('click', () => {
        createModal.style.display = 'none';
    });
    
    // Модальное окно редактирования поста
    const editModal = document.getElementById('editPostModal');
    const editCloseBtn = editModal.querySelector('.close');
    
    editCloseBtn.addEventListener('click', () => {
        editModal.style.display = 'none';
    });
    
    // Закрытие модальных окон при клике вне их
    window.addEventListener('click', (e) => {
        if (e.target === createModal) {
            createModal.style.display = 'none';
        }
        if (e.target === editModal) {
            editModal.style.display = 'none';
        }
    });
    
    // Форма создания поста
    document.getElementById('createPostForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await createPost();
    });
    
    // Форма редактирования поста
    document.getElementById('editPostForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updatePost();
    });
}

// Создание поста
async function createPost() {
    const form = document.getElementById('createPostForm');
    const formData = new FormData(form);
    
    console.log('📝 Данные формы создания:');
    for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
    }
    
    try {
        await ensureCSRFToken();
        
        const response = await fetch(`${API_BASE}/posts/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'include',
            body: formData
        });
        
        console.log('📡 Ответ сервера при создании:', response.status, response.statusText);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Пост создан:', result);
            document.getElementById('createPostModal').style.display = 'none';
            form.reset();
            await loadPosts();
            showNotification('Пост успешно создан!', 'success');
        } else {
            const errorText = await response.text();
            console.error('❌ Ошибка сервера при создании:', errorText);
            showNotification('Ошибка при создании поста', 'error');
        }
    } catch (error) {
        console.error('💥 Сетевая ошибка при создании:', error);
        showNotification('Сетевая ошибка при создании поста', 'error');
    }
}

// Редактирование поста
async function editPost(postId) {
    console.log('Редактирование поста:', postId);
    
    // Находим пост в кэше
    const post = postsCache.find(p => p.id === postId);
    if (!post) {
        showNotification('Пост не найден', 'error');
        return;
    }
    
    // Заполняем форму редактирования данными поста
    document.getElementById('editPostId').value = post.id;
    document.getElementById('editPostTitle').value = post.title;
    document.getElementById('editPostDescription').value = post.description || '';
    
    // Показываем текущее изображение (более компактно)
    const currentImageContainer = document.getElementById('currentImageContainer');
    if (post.image) {
        currentImageContainer.innerHTML = `
            <p><strong>Текущее фото:</strong></p>
            <img src="${post.image}" alt="${post.title}" class="current-post-image">
        `;
    } else {
        currentImageContainer.innerHTML = '<p><em>Изображение не загружено</em></p>';
    }
    
    // Показываем модальное окно редактирования
    document.getElementById('editPostModal').style.display = 'block';
    
    // Прокручиваем к верху модального окна
    const modalContent = document.querySelector('#editPostModal .modal-content');
    modalContent.scrollTop = 0;
}

// Обновление поста
async function updatePost() {
    const form = document.getElementById('editPostForm');
    const formData = new FormData(form);
    const postId = document.getElementById('editPostId').value;
    
    console.log('📝 Данные формы редактирования для поста:', postId);
    
    // Проверяем, было ли выбрано новое изображение
    const imageInput = document.getElementById('editPostImage');
    if (imageInput.files.length === 0) {
        // Если новое изображение не выбрано, не включаем поле image в FormData
        formData.delete('image');
        console.log('🖼️ Новое изображение не выбрано, сохраняем текущее');
    } else {
        console.log('🖼️ Выбрано новое изображение');
    }
    
    // Логируем только текстовые поля для отладки
    console.log('📝 Текстовые данные:');
    console.log(' - title:', formData.get('title'));
    console.log(' - description:', formData.get('description'));
    console.log(' - image:', formData.get('image') ? 'есть' : 'нет');
    
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Сохранение...';
    submitButton.disabled = true;
    
    try {
        await ensureCSRFToken();
        
        const response = await fetch(`${API_BASE}/posts/${postId}/`, {
            method: 'PATCH',
            headers: {
                'X-CSRFToken': getCSRFToken()
                // Не устанавливаем Content-Type для FormData - браузер сделает это сам
            },
            credentials: 'include',
            body: formData
        });
        
        console.log('📡 Ответ сервера при редактировании:', response.status, response.statusText);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Пост обновлен:', result);
            document.getElementById('editPostModal').style.display = 'none';
            form.reset();
            await loadPosts();
            showNotification('Пост успешно обновлен!', 'success');
        } else {
            // Пытаемся получить детальную информацию об ошибке
            let errorMessage = 'Ошибка при обновлении поста';
            try {
                const errorResult = await response.json();
                console.error('❌ Ошибка сервера:', errorResult);
                
                // Формируем понятное сообщение об ошибке
                if (errorResult.title) {
                    errorMessage = `Ошибка в названии: ${errorResult.title.join(', ')}`;
                } else if (errorResult.description) {
                    errorMessage = `Ошибка в описании: ${errorResult.description.join(', ')}`;
                } else if (errorResult.image) {
                    errorMessage = `Ошибка в изображении: ${errorResult.image.join(', ')}`;
                } else if (errorResult.non_field_errors) {
                    errorMessage = errorResult.non_field_errors.join(', ');
                } else {
                    errorMessage = 'Неизвестная ошибка сервера';
                }
            } catch (e) {
                const errorText = await response.text();
                console.error('❌ Текст ошибки:', errorText);
                errorMessage = `Ошибка ${response.status}: ${response.statusText}`;
            }
            
            showNotification(errorMessage, 'error');
        }
    } catch (error) {
        console.error('💥 Сетевая ошибка при редактировании:', error);
        showNotification('Сетевая ошибка при обновлении поста', 'error');
    } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
}

// Удаление поста
async function deletePost(postId) {
    if (!confirm('Вы уверены, что хотите удалить этот пост?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/posts/${postId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            await loadPosts();
            showNotification('Пост успешно удален!', 'success');
        } else {
            showNotification('Ошибка при удалении поста', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка при удалении поста', 'error');
    }
}

// Функция для получения CSRF токена если его нет
async function ensureCSRFToken() {
    if (!getCSRFToken()) {
        // Делаем GET запрос чтобы получить CSRF cookie
        await fetch(`${API_BASE}/posts/`, {
            credentials: 'include'
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
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Стили для уведомления
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease-out;
    `;
    
    // Цвета в зависимости от типа
    if (type === 'success') {
        notification.style.backgroundColor = '#4CAF50';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#f44336';
    } else if (type === 'warning') {
        notification.style.backgroundColor = '#ff9800';
    } else {
        notification.style.backgroundColor = '#2196F3';
    }
    
    // Добавляем в DOM
    document.body.appendChild(notification);
    
    // Удаляем через 3 секунды
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Добавляем CSS анимации для уведомлений
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
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