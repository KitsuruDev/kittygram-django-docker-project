FROM python:3.11-slim

WORKDIR /app

# Установка зависимостей системы
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Копирование requirements и установка Python зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование проекта
COPY . .

# Создание директорий для статики и медиа
RUN mkdir -p /var/www/kittygram/static
RUN mkdir -p /var/www/kittygram/media

# Выдача права на выполнение скрипта
RUN chmod +x scripts/start.sh

EXPOSE 8080

CMD ["/app/scripts/start.sh"]