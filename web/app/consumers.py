import asyncio
from contextlib import suppress
from urllib.parse import urlsplit, urlunsplit

from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from websockets.asyncio.client import connect
from websockets.exceptions import WebSocketException


class CatalogRelay(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        self.relay = asyncio.create_task(self.forward_events())

    async def disconnect(self, code):
        self.relay.cancel()
        with suppress(asyncio.CancelledError):
            await self.relay

    async def forward_events(self):
        backend = urlsplit(settings.BACKEND_URL)
        scheme = 'wss' if backend.scheme == 'https' else 'ws'
        url = urlunsplit((scheme, backend.netloc, backend.path + '/ws/catalog/', '', ''))
        try:
            async with connect(url, open_timeout=5, close_timeout=1, proxy=None) as socket:
                async for event in socket:
                    if isinstance(event, str):
                        await self.send(text_data=event)
        except (OSError, TimeoutError, WebSocketException):
            await self.close(code=1011)
        else:
            await self.close()
