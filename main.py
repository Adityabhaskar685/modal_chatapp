from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import openai
import logging
from datetime import datetime
import os
from dotenv import load_dotenv
from backend.models import Message
from backend.conn_manager import ConnectionManager


load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Qwen Chat API",
    description="A FastAPI backend for the Qwen chat application",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.mount("/static", StaticFiles(directory="frontend/static"), name="static")
templates = Jinja2Templates(directory="frontend/templates")


class Settings:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "super-secret-token")
    OPENAI_API_BASE = os.getenv("OPENAI_API_BASE", None)
    DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "gpt-4o")
    MAX_CONVERSATION_HISTORY = 10
    DEFAULT_SYSTEM_PROMPT = "You are Super Intelligent Coding Assistant."

settings = Settings()

manager = ConnectionManager(logging)

def get_openai_client():
    try:
        return openai.OpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_API_BASE,
        )
    except Exception as e:
        logger.error(f"Error initializing OpenAI client: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to initialize AI service")


@app.get("/", response_class=HTMLResponse)
async def get_home(request: Request):
    try:
        return templates.TemplateResponse(
            "index.html",
            {"request": request}
        )
    except Exception as e:
        logger.error(f"Error serving home page: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    client_id = str(id(websocket))
    await manager.connect(websocket)
    
    try:
        while True:
            user_message = await websocket.receive_text()
            chat_history = manager.get_chat_history(client_id)
            chat_history.messages.append(Message(role="user", content=user_message))
            await websocket.send_json({"role": "user", "content": user_message})

            try:
                messages = [
                    {"role": "system", "content": settings.DEFAULT_SYSTEM_PROMPT}
                ] + [
                    {"role": msg.role, "content": msg.content}
                    for msg in chat_history.messages[-settings.MAX_CONVERSATION_HISTORY:]
                ]

                client = get_openai_client()
                response = ""

                for chunk in client.chat.completions.create(
                    model=settings.DEFAULT_MODEL,
                    messages=messages,
                    stream=True
                ):
                    if chunk.choices[0].delta.content is not None:
                        response += chunk.choices[0].delta.content
                        await websocket.send_json({
                            "role": "assistant",
                            "content": response + "▌"
                        })

                chat_history.messages.append(Message(role="assistant", content=response))
                await websocket.send_json({
                    "role": "assistant",
                    "content": response
                })

            except Exception as e:
                logger.error(f"Error processing message: {str(e)}")
                await websocket.send_json({
                    "role": "system",
                    "content": "Sorry, I encountered an error processing your message. Please try again."
                })

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info(f"Client {client_id} disconnected")
    
    except Exception as e:
        logger.error(f"Unexpected error in WebSocket connection: {str(e)}")
        manager.disconnect(websocket)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": app.version
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception handler caught: {str(exc)}")
    return HTMLResponse(
        content="An internal server error occurred",
        status_code=500
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )