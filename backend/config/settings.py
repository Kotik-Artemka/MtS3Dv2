import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-mts-backend-local')
DEBUG = os.getenv('DJANGO_DEBUG', '1') == '1'
ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

ROOT_URLCONF = 'config.urls'
ASGI_APPLICATION = 'config.asgi.application'
WSGI_APPLICATION = 'config.wsgi.application'

INSTALLED_APPS = ['daphne', 'django.contrib.staticfiles', 'rest_framework', 'app']
MIDDLEWARE = ['django.middleware.common.CommonMiddleware']
TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'APP_DIRS': True,
}]
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'UNAUTHENTICATED_USER': None,
}

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    },
}

LANGUAGE_CODE = 'ru'
STATIC_URL = '/static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
