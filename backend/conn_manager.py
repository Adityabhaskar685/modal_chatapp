from fastapi import WebSocket
from typing import List, Dict
from .models import ChatHistory


class ConnectionManager:
    def __init__(self, logger):
        self._log = logger.getLogger(__name__)
        self._log.info("connection manager initialized")
        self.active_connections: List[WebSocket] = []
        self.chat_histories: Dict[str, ChatHistory] = {}

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        self._log.info(f"New WebSocket connection. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.remove(websocket)
        self._log.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    def get_chat_history(self, client_id: str) -> ChatHistory:
        if client_id not in self.chat_histories:
            self.chat_histories[client_id] = ChatHistory(messages=[])
        return self.chat_histories[client_id]