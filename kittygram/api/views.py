from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied, AuthenticationFailed
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import Post
from .serializers import PostSerializer, UserRegistrationSerializer, UserSerializer

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Проверяем права на редактирование
        if instance.author != request.user:
            raise PermissionDenied("Вы можете редактировать только свои посты")
        
        # Для PATCH запроса используем частичное обновление
        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)

    def perform_update(self, serializer):
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        if self.get_object().author != request.user:
            raise PermissionDenied("Вы можете удалять только свои посты")
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def my_posts(self, request):
        posts = Post.objects.filter(author=request.user)
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)

class UserRegistrationView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        if request.user.is_authenticated:
            return Response(
                {
                    'error': 'Вы уже авторизованы. Выйдите из системы для регистрации нового аккаунта.'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = UserRegistrationSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.save()

            # Аутентифицируем и логиним пользователя
            user = authenticate(
                username=serializer.validated_data['username'],
                password=serializer.validated_data['password']
            )

            if user:
                login(request, user)
                return Response(
                    {
                        'user': {
                            'id': user.id,
                            'username': user.username,
                            'email': user.email
                        },
                        'message': 'Пользователь успешно зарегистрирован и авторизован'
                    },
                    status=status.HTTP_201_CREATED
                )
            else:
                return Response(
                    {'error': 'Ошибка аутентификации после регистрации'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

class UserLoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {'error': 'Необходимо указать имя пользователя и пароль'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = authenticate(username=username, password=password)
        
        if user is not None:
            if user.is_active:
                login(request, user)
                return Response(
                    {
                        'user': {
                            'id': user.id,
                            'username': user.username,
                            'email': user.email
                        },
                        'message': 'Вход выполнен успешно'
                    },
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {'error': 'Аккаунт отключен'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            return Response(
                {'error': 'Неверное имя пользователя или пароль'},
                status=status.HTTP_401_UNAUTHORIZED
            )

class UserLogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(
            {'message': 'Выход выполнен успешно'},
            status=status.HTTP_200_OK
        )

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)