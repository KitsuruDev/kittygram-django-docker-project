from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import Post

class Command(BaseCommand):
    help = 'Очищает базу данных (удаляет всех пользователей и все посты)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Пропустить подтверждение удаления',
        )

    def handle(self, *args, **options):
        if not options['force']:
            confirm = input(
                'Вы уверены, что хотите очистить базу данных? '
                'Это удалит всех пользователей и все посты. [y/N]: '
            )

            if confirm.lower() != 'y':
                self.stdout.write('Операция отменена')
                return

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
        self.stdout.write(
            self.style.SUCCESS('База данных успешно очищена!')
        )