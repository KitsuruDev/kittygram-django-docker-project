from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from .models import Post
import tempfile
from PIL import Image

def create_test_image():
    image = Image.new('RGB', (100, 100), color='red')
    file = tempfile.NamedTemporaryFile(suffix='.jpg')
    image.save(file)
    file.seek(0)
    return file

class PostModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
    
    def test_create_post(self):
        post = Post.objects.create(
            title='Test Post',
            description='Test Description',
            author=self.user
        )
        self.assertEqual(post.title, 'Test Post')
        self.assertEqual(post.author, self.user)

class AuthenticationTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123',
            'password_confirm': 'testpass123'
        }
    
    def test_user_registration(self):
        url = reverse('register')
        response = self.client.post(url, self.user_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(User.objects.get().username, 'testuser')
    
    def test_user_registration_with_existing_username(self):
        User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        
        url = reverse('register')
        response = self.client.post(url, self.user_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

class PostAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )

        self.other_user = User.objects.create_user(
            username='otheruser',
            password='otherpass123'
        )
        
        self.post_data = {
            'title': 'Test Post',
            'description': 'Test Description'
        }
        
        self.post = Post.objects.create(
            title='Existing Post',
            description='Existing Description',
            author=self.user
        )
    
    def test_create_post_authenticated(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('post-list')
        
        with create_test_image() as image:
            data = self.post_data.copy()
            data['image'] = image
            
            response = self.client.post(url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Post.objects.count(), 2)
        self.assertEqual(Post.objects.latest('id').author, self.user)
    
    def test_create_post_unauthenticated(self):
        url = reverse('post-list')
        
        with create_test_image() as image:
            data = self.post_data.copy()
            data['image'] = image
            
            response = self.client.post(url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_get_posts_list(self):
        url = reverse('post-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
    
    def test_update_own_post(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('post-detail', args=[self.post.id])
        
        updated_data = {
            'title': 'Updated Title',
            'description': 'Updated Description'
        }
        
        response = self.client.patch(url, updated_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.post.refresh_from_db()
        self.assertEqual(self.post.title, 'Updated Title')
    
    def test_update_other_user_post(self):
        self.client.force_authenticate(user=self.other_user)
        url = reverse('post-detail', args=[self.post.id])
        
        updated_data = {
            'title': 'Updated Title'
        }
        
        response = self.client.patch(url, updated_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_delete_own_post(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('post-detail', args=[self.post.id])
        
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Post.objects.count(), 0)
    
    def test_delete_other_user_post(self):
        self.client.force_authenticate(user=self.other_user)
        url = reverse('post-detail', args=[self.post.id])
        
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Post.objects.count(), 1)

class PermissionTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.other_user = User.objects.create_user(
            username='otheruser', 
            password='otherpass123'
        )
        
        self.post = Post.objects.create(
            title='Test Post',
            description='Test Description',
            author=self.user
        )
    
    def test_can_edit_field(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('post-detail', args=[self.post.id])
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['can_edit'])
    
    def test_cannot_edit_other_user_post(self):
        self.client.force_authenticate(user=self.other_user)
        url = reverse('post-detail', args=[self.post.id])
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['can_edit'])