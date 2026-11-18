import asyncio
import hashlib
from contextlib import suppress

from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .catalog import CATALOG_PATH


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
            try:
                contents = await asyncio.to_thread(CATALOG_PATH.read_bytes)
            except OSError:
                await self.close(code=1011)
                return

            revision = hashlib.sha256(contents).hexdigest()
            if revision != previous:
                await self.send_json({'type': 'catalog.changed', 'revision': revision})
                previous = revision
            await asyncio.sleep(2)
