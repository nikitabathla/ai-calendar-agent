import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";
import Groq from "groq-sdk";
import { calendarTools } from "./tools";
import { config } from "./config";
import moment from "moment-timezone";

const groq = new Groq({ apiKey: config.llm.groqApiKey });

const tools = calendarTools.map((tool) => ({
  type: "function" as const,
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  }
}));

function userClock(timeZone?: string) {
  const zone =
    timeZone && moment.tz.zone(timeZone) ? timeZone : moment.tz.guess();
  const now = moment.tz(zone);
  return {
    zone,
    time: now.format("YYYY-MM-DD HH:mm"),
    offset: now.format("Z")
  };
}

async function runTool(name: string, rawArgs: string) {
  const tool = calendarTools.find((item) => item.name === name);
  if (!tool) return { error: `Unknown tool ${name}` };

  try {
    const parsed = tool.schema.safeParse(JSON.parse(rawArgs));
    if (!parsed.success) return { error: parsed.error.issues };
    const run = tool.execute as (input: unknown) => Promise<unknown>;
    return run(parsed.data);
  } catch {
    return { error: "Invalid tool arguments" };
  }
}

export async function runAgent(
  message: string,
  timeZone?: string,
  history: { role: "user" | "assistant"; content: string }[] = []
): Promise<string> {
  const clock = userClock(timeZone);
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are a calendar assistant. User timezone is ${clock.zone} (${clock.offset}). Local time is ${clock.time}.
Use listEvents, getAvailability, and createEvent. Pass ISO datetimes with offset ${clock.offset}.
If the user gives participant emails, pass them as createEvent attendees. Google Calendar automatically sends the email invitations to all attendees.
Keep details already given in the conversation. Do not ask again for details already provided.

CRITICAL RULES FOR CREATING EVENTS:
1. NEVER call createEvent unless the user has explicitly provided:
   - What time of day (e.g. "4 PM", "10:30 AM")
   - How long it should last (duration or end time)
2. If the user only says "tomorrow" or gives a date without a specific time, DO NOT guess or pick a default time (like 10 AM or 9 AM).
3. Instead, ask the user what time they would like to schedule it, or offer to check their availability first.
4. Do not say an event was created unless createEvent actually succeeded.`
    },
    ...history,
    { role: "user", content: message }
  ];

  for (let step = 0; step < 5; step++) {
    const completion = await groq.chat.completions.create({
      model: config.llm.chatModel,
      messages,
      tools,
      tool_choice: "auto"
    });

    const reply = completion.choices[0]?.message;
    const calls = reply?.tool_calls ?? [];
    if (calls.length === 0) return reply?.content ?? "";

    messages.push({
      role: "assistant",
      content: reply.content ?? null,
      tool_calls: calls
    });

    for (const call of calls) {
      const result = await runTool(call.function.name, call.function.arguments);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result)
      });
    }
  }

  return "I could not finish that request.";
}
