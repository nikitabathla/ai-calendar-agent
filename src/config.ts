import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 3000),
  llm: {
    groqApiKey: process.env.GROQ_API_KEY,
    chatModel: process.env.LLM_MODEL ?? "openai/gpt-oss-20b"
  },
  calendar: {
    credentialsPath: process.env.GOOGLE_CREDENTIALS_PATH ?? "",
    tokenPath: process.env.GOOGLE_TOKEN_PATH,
    calendarId: process.env.GOOGLE_CALENDAR_ID
  }
} as const;
