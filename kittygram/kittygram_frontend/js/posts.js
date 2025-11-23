const API_BASE = 'http://localhost:8000/api';
let currentUser = null;

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
    
    // Модальное окно создания поста
    const modal = document.getElementById('createPostModal');
    const createBtn = document.getElementById('createPostBtn');
    const closeBtn = document.querySelector('.close');
    
    createBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Форма создания поста
    document.getElementById('createPostForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await createPost();
    });
}

// Создание поста
async function createPost() {
    const form = document.getElementById('createPostForm');
    const formData = new FormData(form);
    
    console.log('📝 Данные формы:');
    for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
    }
    
    console.log('🔑 CSRF Token:', getCSRFToken());
    console.log('👤 Current User:', currentUser);
    
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
        
        console.log('📡 Ответ сервера:', response.status, response.statusText);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Пост создан:', result);
            document.getElementById('createPostModal').style.display = 'none';
            form.reset();
            await loadPosts();
        } else {
            const errorText = await response.text();
            console.error('❌ Ошибка сервера:', errorText);
            alert('Ошибка при создании поста. Проверьте консоль для деталей.');
        }
    } catch (error) {
        console.error('💥 Сетевая ошибка:', error);
        alert('Сетевая ошибка при создании поста');
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
        } else {
            alert('Ошибка при удалении поста');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при удалении поста');
    }
}

// Редактирование поста (заглушка - можно расширить)
function editPost(postId) {
    alert(`Редактирование поста ${postId} - можно реализовать модальное окно редактирования`);
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