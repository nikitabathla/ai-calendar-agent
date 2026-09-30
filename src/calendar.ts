import { calendar_v3, google } from "googleapis";

import { authenticate } from "@google-cloud/local-auth";
import { config } from "./config";
import path from "path";

// Scopes required to read and write calendar events
const SCOPES = ["https://www.googleapis.com/auth/calendar"];

let calendarClient: calendar_v3.Calendar | null = null;

/** Signs in once. Later calls reuse the same client. */
export async function getCalendarClient(): Promise<calendar_v3.Calendar | null> {
  if (calendarClient) return calendarClient;

  console.log("[Calendar] Getting calendar client...");
  const auth = await authenticate({
    keyfilePath: path.join(process.cwd(), config.calendar.credentialsPath),
    scopes: SCOPES
  });

  calendarClient = google.calendar({ version: "v3", auth });
  return calendarClient;
}

/**
 * Fetches events from Google Calendar between two dates.
 */
export async function fetchCalendarEvents(
  timeMin?: string,
  timeMax?: string
): Promise<calendar_v3.Schema$Event[]> {
  console.log(
    `[Calendar] Fetching events from ${timeMin || "now"} to ${timeMax || "future"}...`
  );
  const calendarClient = await getCalendarClient();
  if (!calendarClient) return [];

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const res = await calendarClient.events.list({
    calendarId: config.calendar.calendarId,
    timeMin: timeMin ?? new Date().toISOString(),
    timeMax: timeMax ?? endOfToday.toISOString(),
    singleEvents: true,
    orderBy: "startTime"
  });

  return res.data.items ?? [];
}

export async function insertCalendarEvent(eventData: {
  summary: string;
  startTime: string;
  endTime: string;
  description?: string;
  attendees?: string[];
}): Promise<calendar_v3.Schema$Event | null> {
  const { summary, startTime, endTime, description, attendees } = eventData;
  console.log(`[Calendar] Creating event: ${eventData.summary}`);

  const calendarClient = await getCalendarClient();
  if (!calendarClient) return null;

  const res = await calendarClient.events.insert({
    calendarId: config.calendar.calendarId,
    sendUpdates: attendees?.length ? "all" : "none",
    requestBody: {
      summary,
      description,
      start: { dateTime: startTime },
      end: { dateTime: endTime },
      attendees: attendees?.map((email) => ({ email }))
    }
  });

  return res.data;
}
