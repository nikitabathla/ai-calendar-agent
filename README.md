# AI Calendar Assistant

A minimal Node.js + TypeScript assistant that manages your Google Calendar using natural language.

---

## Features

- **Check Schedule**: Ask what's on your calendar for today, tomorrow, or any date range.
- **Check Availability**: Find out if you're free at a given time or see overlapping events.
- **Book Meetings**: Schedule events with duration, description, and attendee email invites.
- **Conversation Memory**: Remembers context across messages in the same session.
- **Web UI & REST API**: Includes a lightweight web chat interface and a `/chat` endpoint.

---

## How It Works

```text
User Message + History
        ↓
  Groq LLM (Function Calling)
        ↓
  Node.js executes Calendar Tool (listEvents / getAvailability / createEvent)
        ↓
  Google Calendar API
        ↓
  Tool result returned to LLM
        ↓
  Natural Language Response
```

---

## Setup

### 1. Prerequisites
- Node.js 18+ (Node 22 recommended)
- A [Groq API Key](https://console.groq.com)
- Google Cloud project with **Google Calendar API** enabled and a **Desktop App** OAuth client (`credentials.json`)

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Fill in your `.env`:

```ini
PORT=3000
GROQ_API_KEY=your_groq_api_key
LLM_MODEL=openai/gpt-oss-20b
GOOGLE_CREDENTIALS_PATH=credentials.json
GOOGLE_CALENDAR_ID=primary
```

Place your downloaded `credentials.json` in the project root.

---

## Running the App

### Development

```bash
npm run dev
```

On first launch, Google authentication will open in your browser to authorize calendar access.

- **Web UI**: Open `http://localhost:3000`
- **Health Check**: `GET http://localhost:3000/health`
- **Chat Endpoint**: `POST http://localhost:3000/chat`

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Am I free tomorrow at 3 PM for 30 minutes?",
    "timezone": "Asia/Kolkata"
  }'
```

### Build

```bash
npm run build
```

---

## Project Structure

```text
ai-calendar-agent/
├── src/
│   ├── index.ts        # Express server & static asset handler
│   ├── agent.ts        # Groq LLM tool-calling loop & conversation memory
│   ├── calendar.ts     # Google Calendar API client & operations
│   ├── tools.ts        # Tool definitions & schemas (list, availability, create)
│   └── config.ts       # Environment configuration
├── public/
│   ├── index.html      # Web chat interface
│   ├── styles.css      # Chat styling & responsive layout
│   └── app.js          # Client-side chat logic & history tracking
├── .env.example        # Environment variable template
├── package.json
└── tsconfig.json
```
