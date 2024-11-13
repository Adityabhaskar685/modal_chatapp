from pydantic import BaseModel, Field
from typing import List

class Message(BaseModel):
    role: str
    content: str

class ChatHistory(BaseModel):
    messages: List[Message]
    total_messages: int = Field(default=0)