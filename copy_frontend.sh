#!/bin/bash

echo "Copying frontend files..."

# Проверяем существование фронтенда в правильном пути
if [ -d "/app/kittygram/frontend" ]; then
    echo "Frontend directory found at /app/kittygram/frontend"
    
    # Копируем HTML файлы
    if [ -d "/app/kittygram/frontend/html" ]; then
        echo "Copying HTML files..."
        cp -r /app/kittygram/frontend/html/* /app/collected_static/ 2>/dev/null || echo "HTML copy failed"
    fi
    
    # Копируем CSS
    if [ -d "/app/kittygram/frontend/css" ]; then
        echo "Copying CSS files..."
        cp -r /app/kittygram/frontend/css /app/collected_static/ 2>/dev/null || echo "CSS copy failed"
    fi
    
    # Копируем JS
    if [ -d "/app/kittygram/frontend/js" ]; then
        echo "Copying JS files..."
        cp -r /app/kittygram/frontend/js /app/collected_static/ 2>/dev/null || echo "JS copy failed"
    fi
    
else
    echo "ERROR: Frontend directory not found at /app/kittygram/frontend"
    echo "Available directories in /app:"
    ls -la /app/
fi