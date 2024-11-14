# AI Chat Application

A real-time chat application built with FastAPI backend and HTML/CSS/JavaScript frontend, integrating with OpenAI's API for intelligent responses.

## Features

- Real-time chat interface using WebSocket
- Stream-based AI responses
- Clean and responsive UI
- Error handling and logging
- Cross-Origin Resource Sharing (CORS) support

## Directory Structure

```
chatapp/
├── backend/
│   ├── conn_manager.py
│   └── models.py
├── frontend/
│   ├── static/
│   │   ├── script.js
│   │   └── styles.css
│   └── templates/
│       └── index.html
├── main.py
└── requirement.txt
```

## Prerequisites

- Python 3.8 or higher
- OpenAI API key
- Internet connection

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Adityabhaskar685/modal_chatapp.git
cd chatapp
```

2. Create a virtual environment and activate it:
```bash
python3 -m venv venv # on Windows, use: python -m venv venv
source venv/bin/activate  # On Windows, use: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirement.txt
```

4. Create a `.env` file in the root directory with the following variables:
```
API_KEY=your_openai_api_key
OPENAI_API_BASE=https://api.openai.com/v1  # Optional: Only if using a different API endpoint
DEFAULT_MODEL=gpt-4  # Or your preferred model
```

## Running the Application

1. Start the server:
```bash
python3 main.py
```

2. Open your web browser and navigate to:
```
http://localhost:8000
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| API_KEY | Your OpenAI API key | Yes | - |
| OPENAI_API_BASE | Custom API base URL | No | https://api.openai.com/v1 |
| DEFAULT_MODEL | OpenAI model to use | No | gpt-4 |

## API Endpoints

- `GET /`: Main chat interface
- `GET /health`: Health check endpoint
- `WebSocket /ws`: WebSocket endpoint for real-time chat

## Development

- The backend is built with FastAPI and handles WebSocket connections
- Frontend uses vanilla JavaScript for WebSocket communication
- Chat history is maintained per client session
- Responses are streamed in real-time

## Error Handling

- Comprehensive error logging
- Graceful WebSocket disconnection handling
- Global exception handler for HTTP requests
- User-friendly error messages

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
