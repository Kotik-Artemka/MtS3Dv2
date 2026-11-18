import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
http_application = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import path

from app.consumers import CatalogConsumer

application = ProtocolTypeRouter({
    'http': http_application,
    'websocket': URLRouter([path('ws/catalog/', CatalogConsumer.as_asgi())]),
})
