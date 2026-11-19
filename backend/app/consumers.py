import asyncio
import hashlib
import json
from contextlib import suppress

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .models import STLModel
from .serializers import STLModelSerializer


@database_sync_to_async
def catalog_revision():
    data = STLModelSerializer(STLModel.objects.all(), many=True).data
    return hashlib.sha256(json.dumps(data).encode()).hexdigest()


class CatalogConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.accept()
        self.watcher = asyncio.create_task(self.watch_catalog())

    async def disconnect(self, code):
        self.watcher.cancel()
        with suppress(asyncio.CancelledError):
            await self.watcher

    async def watch_catalog(self):
        previous = None
        while True:
            revision = await catalog_revision()
            if revision != previous:
                await self.send_json({'type': 'catalog.changed', 'revision': revision})
                previous = revision
            await asyncio.sleep(2)
