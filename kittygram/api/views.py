from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import login, authenticate
from django.contrib.auth.models import User
from .models import Post
from .serializers import PostSerializer, UserRegistrationSerializer, UserSerializer

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def update(self, request, *args, **kwargs):
        if self.get_object().author != request.user:
            raise PermissionDenied("Вы можете редактировать только свои посты")
        return super().update(request, *args, **kwargs)

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

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)