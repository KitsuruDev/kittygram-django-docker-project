from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Post

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class PostSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    can_edit = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = ['id', 'title', 'description', 'image', 'author', 'created_at', 'can_edit']
        read_only_fields = ['author', 'created_at', 'can_edit']

    def get_can_edit(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.author == request.user
        return False

    def update(self, instance, validated_data):
        # Для PATCH запроса обрабатываем частичное обновление
        instance.title = validated_data.get('title', instance.title)
        instance.description = validated_data.get('description', instance.description)
        
        # Обновляем изображение только если оно передано
        if 'image' in validated_data:
            instance.image = validated_data['image']
        
        instance.save()
        return instance

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, min_length=8, style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True, min_length=8, style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm']
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Пароли не совпадают")
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user