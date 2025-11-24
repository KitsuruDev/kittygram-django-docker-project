const API_BASE = '/api';
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
            updateUIForAuthenticatedUser();
        } else {
            console.log('Пользователь не авторизован');
            showAuthMessage();
        }
    } catch (error) {
        console.error('Ошибка при проверке аутентификации:', error);
        showAuthMessage();
    }
}

// Обновление UI для авторизованного пользователя
function updateUIForAuthenticatedUser() {
    // Показываем кнопки для авторизованных пользователей
    const authElements = document.querySelectorAll('.auth-required');
    authElements.forEach(el => el.style.display = 'block');
    
    // Обновляем приветствие если есть элемент
    const greetingEl = document.getElementById('userGreeting');
    if (greetingEl) {
        greetingEl.textContent = `Привет, ${currentUser.username}!`;
    }
}

// Показать сообщение об необходимости авторизации
function showAuthMessage() {
    const container = document.getElementById('postsContainer');
    if (container) {
        container.innerHTML = `
            <div class="auth-message">
                <h2>Необходима авторизация</h2>
                <p>Пожалуйста, <a href="login.html">войдите в систему</a> для просмотра постов</p>
                <button onclick="window.location.href='login.html'" class="btn">Войти</button>
            </div>
        `;
    }
    
    // Скрываем кнопки для неавторизованных пользователей
    const authElements = document.querySelectorAll('.auth-required');
    authElements.forEach(el => el.style.display = 'none');
}

// Загрузка постов
async function loadPosts() {
    // Если пользователь не авторизован, не загружаем посты
    if (!currentUser) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/posts/`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const posts = await response.json();
            postsCache = posts; // Сохраняем в кэш
            displayPosts(posts);
        } else if (response.status === 401) {
            console.log('Сессия истекла, требуется повторная авторизация');
            showAuthMessage();
        }
    } catch (error) {
        console.error('Ошибка при загрузке постов:', error);
    }
}

// Отображение постов
function displayPosts(posts) {
    const container = document.getElementById('postsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (posts.length === 0) {
        container.innerHTML = '<p class="no-posts">Пока нет постов. Будьте первым!</p>';
        return;
    }
    
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
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });
    }
    
    // Кнопка выхода
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
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
                    window.location.href = 'login.html';
                }
            } catch (error) {
                console.error('❌ Ошибка при выходе:', error);
                window.location.href = 'login.html';
            }
        });
    }
    
    // Модальное окно создания поста
    const createModal = document.getElementById('createPostModal');
    const createBtn = document.getElementById('createPostBtn');
    const createCloseBtn = createModal ? createModal.querySelector('.close') : null;
    
    if (createBtn && createModal) {
        createBtn.addEventListener('click', () => {
            createModal.style.display = 'block';
        });
    }
    
    if (createCloseBtn) {
        createCloseBtn.addEventListener('click', () => {
            createModal.style.display = 'none';
        });
    }
    
    // Модальное окно редактирования поста
    const editModal = document.getElementById('editPostModal');
    const editCloseBtn = editModal ? editModal.querySelector('.close') : null;
    
    if (editCloseBtn) {
        editCloseBtn.addEventListener('click', () => {
            editModal.style.display = 'none';
        });
    }
    
    // Закрытие модальных окон при клике вне их
    window.addEventListener('click', (e) => {
        const createModal = document.getElementById('createPostModal');
        const editModal = document.getElementById('editPostModal');
        
        if (createModal && e.target === createModal) {
            createModal.style.display = 'none';
        }
        if (editModal && e.target === editModal) {
            editModal.style.display = 'none';
        }
    });
    
    // Форма создания поста
    const createForm = document.getElementById('createPostForm');
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await createPost();
        });
    }
    
    // Форма редактирования поста
    const editForm = document.getElementById('editPostForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await updatePost();
        });
    }
}

// Создание поста
async function createPost() {
    if (!currentUser) {
        showNotification('Необходима авторизация для создания постов', 'error');
        return;
    }
    
    const form = document.getElementById('createPostForm');
    const formData = new FormData(form);
    
    // Проверяем размер файла
    const imageInput = document.getElementById('createPostImage');
    if (imageInput && imageInput.files.length > 0) {
        const file = imageInput.files[0];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (file.size > maxSize) {
            showNotification('Размер файла не должен превышать 10MB', 'error');
            return;
        }
        
        // Проверяем тип файла
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showNotification('Разрешены только файлы JPEG, PNG, GIF и WebP', 'error');
            return;
        }
    }
    
    console.log('📝 Данные формы создания:');
    for (let [key, value] of formData.entries()) {
        if (key === 'image') {
            console.log(`${key}:`, value.name, `(${(value.size / 1024 / 1024).toFixed(2)} MB)`);
        } else {
            console.log(`${key}:`, value);
        }
    }
    
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Создание...';
    submitButton.disabled = true;
    
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
        } else if (response.status === 413) {
            showNotification('Файл слишком большой. Максимальный размер: 10MB', 'error');
        } else {
            const errorText = await response.text();
            console.error('❌ Ошибка сервера при создании:', errorText);
            showNotification('Ошибка при создании поста', 'error');
        }
    } catch (error) {
        console.error('💥 Сетевая ошибка при создании:', error);
        showNotification('Сетевая ошибка при создании поста', 'error');
    } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
}

// Редактирование поста
async function editPost(postId) {
    if (!currentUser) {
        showNotification('Необходима авторизация для редактирования постов', 'error');
        return;
    }
    
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
    
    // Показываем текущее изображение
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
    if (modalContent) {
        modalContent.scrollTop = 0;
    }
}

// Обновление поста
async function updatePost() {
    if (!currentUser) {
        showNotification('Необходима авторизация для обновления постов', 'error');
        return;
    }
    
    const form = document.getElementById('editPostForm');
    const formData = new FormData(form);
    const postId = document.getElementById('editPostId').value;
    
    console.log('📝 Данные формы редактирования для поста:', postId);
    
    // Проверяем, было ли выбрано новое изображение
    const imageInput = document.getElementById('editPostImage');
    if (imageInput && imageInput.files.length === 0) {
        formData.delete('image');
        console.log('🖼️ Новое изображение не выбрано, сохраняем текущее');
    } else {
        console.log('🖼️ Выбрано новое изображение');
    }
    
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
            let errorMessage = 'Ошибка при обновлении поста';
            try {
                const errorResult = await response.json();
                console.error('❌ Ошибка сервера:', errorResult);
                
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
    if (!currentUser) {
        showNotification('Необходима авторизация для удаления постов', 'error');
        return;
    }
    
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
        
        .auth-message {
            text-align: center;
            padding: 40px 20px;
            background: #f8f9fa;
            border-radius: 10px;
            margin: 20px 0;
        }
        
        .auth-message h2 {
            color: #6c757d;
            margin-bottom: 10px;
        }
        
        .auth-message .btn {
            margin-top: 15px;
        }
        
        .no-posts {
            text-align: center;
            padding: 40px 20px;
            color: #6c757d;
            font-style: italic;
        }
    `;
    document.head.appendChild(style);
}