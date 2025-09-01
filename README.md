# SageMind

SageMind is an advanced AI-powered search and chat platform that integrates multiple language models and search providers for enhanced information retrieval and interaction.

## Features

- **Multiple Search Providers**: SearxNG, Tavily, Serper, Bing
- **Multiple LLM Support**: Supports OpenAI, Groq, Azure, Ollama and custom models
- **Docker Integration**: Fully dockerized setup for easy deployment
- **Modern UI**: Sleek interface built with Next.js and Tailwind CSS
- **Local Modes**: Support for running with local models

## Project Structure

```
├── src/
│   ├── backend/             # Python FastAPI backend
│   │   ├── alembic/         # Database migrations
│   │   ├── db/              # Database models and utilities
│   │   ├── llm/             # LLM integrations
│   │   ├── search/          # Search provider integrations
│   │   └── main.py          # Main FastAPI application
│   │
│   └── frontend/            # Next.js frontend
│       ├── app/             # Next.js app router
│       ├── components/      # UI components
│       ├── hooks/           # React hooks
│       ├── lib/             # Utility functions
│       └── styles/          # CSS styles
│
├── docker-compose.dev.yaml  # Docker Compose configuration
├── standalone.Dockerfile    # All-in-one Docker setup
├── .env-example             # Environment variables template
└── start.sh                 # Startup script
```

## Installation and Setup

### Prerequisites

- Docker and Docker Compose
- Node.js (for local development)
- Python 3.11+ (for local development)

### Running with Docker

1. Clone the repository:
   ```bash
   git clone https://github.com/i-anubhav-anand/SageMind.git
   cd SageMind
   ```

2. Copy the environment template:
   ```bash
   cp .env-example .env
   ```

3. Update the `.env` file with your API keys and preferences

4. Run using Docker Compose:
   ```bash
   ./start.sh
   ```
   
   Or manually:
   ```bash
   docker-compose -f docker-compose.dev.yaml up --build
   ```

5. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - SearxNG: http://localhost:8080

### Running Locally (Development)

#### Backend

1. Navigate to the backend directory:
   ```bash
   cd src/backend
   ```
   
2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install poetry
   poetry install
   ```
   
3. Start the backend server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

#### Frontend

1. Navigate to the frontend directory:
   ```bash
   cd src/frontend
   ```
   
2. Install dependencies:
   ```bash
   pnpm install
   ```
   
3. Start the development server:
   ```bash
   pnpm dev
   ```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 