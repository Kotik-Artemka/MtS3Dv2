import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pr.settings')
http_application = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.urls import path

from app.consumers import CatalogRelay

application = ProtocolTypeRouter({
    'http': http_application,
    'websocket': AllowedHostsOriginValidator(
        URLRouter([path('ws/catalog/', CatalogRelay.as_asgi())])
    ),
})
