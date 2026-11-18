import os

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-mts-web-local')
DEBUG = os.getenv('DJANGO_DEBUG', '1') == '1'
ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

ROOT_URLCONF = 'config.urls'
ASGI_APPLICATION = 'config.asgi.application'
WSGI_APPLICATION = 'config.wsgi.application'
INSTALLED_APPS = ['daphne', 'django.contrib.staticfiles', 'frontend']
MIDDLEWARE = ['django.middleware.common.CommonMiddleware']
TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'APP_DIRS': True,
}]

LANGUAGE_CODE = 'ru'
STATIC_URL = '/static/'
BACKEND_URL = os.getenv('BACKEND_URL', 'http://127.0.0.1:8001').rstrip('/')
