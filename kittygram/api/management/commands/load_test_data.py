from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.core.files.base import ContentFile
from django.contrib.auth.models import User
from api.models import Post
from random import randint
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO

class Command(BaseCommand):
    help = 'Очищает базу данных (удаляет всех пользователей и все посты) и загружает в неё тестовые данные'

    def create_test_image(self):
        width, height= randint(400, 1200), randint(400, 1200)
        color = (randint(100, 255), randint(100, 255), randint(100, 255))

        image = Image.new('RGB', (width, height), color=color)
        draw = ImageDraw.Draw(image)
        cat_text = "Кот Шрёдингера"

        try:
            font = ImageFont.truetype("arial.ttf", 80)
        except:
            try:
                font = ImageFont.truetype("DejaVuSans.ttf", 80)
            except:
                font = ImageFont.load_default()
        
        bbox = draw.textbbox((0, 0), cat_text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (width - text_width) // 2
        y = (height - text_height) // 2
        
        draw.text((x, y), cat_text, fill=(255, 255, 255), font=font)
        
        image_buffer = BytesIO()
        image.save(image_buffer, format='JPEG', quality=85)
        image_buffer.seek(0)

        return image_buffer

    def add_test_images_to_posts(self):
        self.stdout.write('Добавление тестовых изображений к постам...')
        
        for i, post in enumerate(Post.objects.all()):
            if not post.image:
                image_buffer = self.create_test_image()
                image_name = f'test_cat_{i+1}.jpg'
                
                post.image.save(
                    image_name,
                    ContentFile(image_buffer.getvalue()),
                    save=True
                )

                self.stdout.write(
                    self.style.SUCCESS(f'Добавлено изображение для поста "{post.title}"')
                )
    
    def handle(self, *args, **options):
        self.stdout.write('Очистка базы данных...')
        
        post_count = Post.objects.count()
        if post_count > 0:
            Post.objects.all().delete()
            self.stdout.write(
                self.style.SUCCESS(f'Удалено постов: {post_count}')
            )
        else:
            self.stdout.write('Посты уже отсутствуют')
        
        user_count = User.objects.count()
        if user_count > 0:
            User.objects.all().delete()
            self.stdout.write(
                self.style.SUCCESS(f'Удалено пользователей: {user_count}')
            )
        else:
            self.stdout.write('Пользователи уже отсутствуют')

        self.stdout.write('')
        self.stdout.write('Загрузка тестовых данных...')
        
        try:
            call_command('loaddata', 'test_data.json', app_label='api')
            self.stdout.write(
                self.style.SUCCESS('Фикстуры успешно загружены!')
            )

            self.add_test_images_to_posts()
            
            self.stdout.write('')
            self.stdout.write(
                self.style.SUCCESS('Фикстуры успешно дополнены тестовыми jpg-изображениями!')
            )

            self.stdout.write('')
            self.stdout.write(f'Всего постов: {Post.objects.count()}')
            self.stdout.write('')
            self.stdout.write('Данные для тестирования:')
            self.stdout.write('1-ый пользователь: логин - tester_1 / пароль - tester_1')
            self.stdout.write('2-ой пользователь: логин - tester_2 / пароль - tester_2')
            self.stdout.write('Администратор: логин - admin / пароль - admin')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Ошибка при загрузке тестовых данных: {e}')
            )