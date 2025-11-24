FROM python:3.11-slim

WORKDIR /app

# Устанавливаем зависимости для сборки
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install -r requirements.txt

COPY . .

WORKDIR /app/kittygram

# Создаем необходимые директории
RUN mkdir -p ../static ../media ../collected_static

# Копируем скрипт
COPY copy_frontend.sh /app/copy_frontend.sh
RUN chmod +x /app/copy_frontend.sh

# Сначала собираем статику Django
RUN python manage.py collectstatic --noinput --clear

# Потом копируем фронтенд ПОВЕРХ статики Django
RUN /app/copy_frontend.sh

EXPOSE 8000