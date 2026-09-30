import { fetchCalendarEvents, insertCalendarEvent } from "./calendar";

import moment from "moment-timezone";
import { z } from "zod";

/**
 * 1. listEvents Tool
 * Lists events for a given time range.
 */
export const listEventsSchema = z.object({
  timeMin: z
    .string()
    .describe("ISO start datetime string (e.g. 2026-09-30T00:00:00Z)"),
  timeMax: z
    .string()
    .optional()
    .describe("ISO end datetime string (e.g. 2026-09-30T23:59:59Z)")
});

export type ListEventsInput = z.infer<typeof listEventsSchema>;

export async function listEvents(input: ListEventsInput) {
  console.log("[Tools] Executing listEvents with input:", input);
  const events = await fetchCalendarEvents(input.timeMin, input.timeMax);
  return {
    success: true,
    message: "listEvents executed successfully.",
    events
  };
}

/**
 * 2. getAvailability Tool
 * Checks if the user is free at a specific time or finds free slots.
 */
export const getAvailabilitySchema = z.object({
  date: z.string().describe("Date to check in YYYY-MM-DD format"),
  startTime: z
    .string()
    .optional()
    .describe("ISO datetime or time string to check specific slot"),
  durationMinutes: z
    .number()
    .default(30)
    .describe("Duration of proposed meeting in minutes")
});

export type GetAvailabilityInput = z.infer<typeof getAvailabilitySchema>;

export async function getAvailability(input: GetAvailabilityInput) {
  console.log("[Tools] Executing getAvailability with input:", input);

  const slotStart = input.startTime ? moment.parseZone(input.startTime) : null;
  const slotEnd =
    slotStart?.clone().add(input.durationMinutes, "minutes") ?? null;
  const dayStart = (slotStart ?? moment.parseZone(`${input.date}T00:00:00Z`))
    .clone()
    .startOf("day");
  const dayEnd = dayStart.clone().endOf("day");

  const events = await fetchCalendarEvents(dayStart.format(), dayEnd.format());
  const conflicts = events.filter((event) => {
    const start = moment(event.start?.dateTime ?? event.start?.date);
    const end = moment(event.end?.dateTime ?? event.end?.date);
    if (!slotStart || !slotEnd) return true;
    return start.isBefore(slotEnd) && end.isAfter(slotStart);
  });

  return {
    success: true,
    isFree: conflicts.length === 0,
    conflicts: conflicts.map((event) => ({
      summary: event.summary,
      start: event.start?.dateTime ?? event.start?.date,
      end: event.end?.dateTime ?? event.end?.date
    }))
  };
}

/**
 * 3. createEvent Tool
 * Creates a new meeting or event on the user's calendar.
 */
export const createEventSchema = z.object({
  summary: z.string().describe("Title of the event (e.g. 'Design Discussion')"),
  startTime: z.string().describe("ISO start datetime string"),
  endTime: z.string().describe("ISO end datetime string"),
  description: z.string().optional().describe("Optional description or agenda"),
  attendees: z
    .array(z.string().email())
    .optional()
    .describe("Participant emails")
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export async function createEvent(input: CreateEventInput) {
  console.log("[Tools] Executing createEvent with input:", input);
  const created = await insertCalendarEvent(input);
  return {
    success: true,
    summary: created?.summary ?? input.summary,
    start: created?.start?.dateTime ?? input.startTime,
    end: created?.end?.dateTime ?? input.endTime,
    attendees: input.attendees ?? [],
    htmlLink: created?.htmlLink,
    message: input.attendees?.length
      ? `Event scheduled and Google Calendar invite sent to: ${input.attendees.join(", ")}`
      : "Event scheduled successfully."
  };
}

/**
 * Registry of available tools for the LLM
 */
export const calendarTools = [
  {
    name: "listEvents",
    description: "List calendar events within a specified date/time range.",
    schema: listEventsSchema,
    parameters: {
      type: "object",
      properties: {
        timeMin: {
          type: "string",
          description: "ISO start datetime, e.g. 2026-10-01T00:00:00+05:30"
        },
        timeMax: {
          type: "string",
          description: "ISO end datetime, e.g. 2026-10-01T23:59:59+05:30"
        }
      },
      required: ["timeMin"]
    },
    execute: listEvents
  },
  {
    name: "getAvailability",
    description: "Check if the user is free at a given time.",
    schema: getAvailabilitySchema,
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        startTime: { type: "string", description: "ISO datetime to check" },
        durationMinutes: {
          type: "number",
          description: "Meeting length in minutes"
        }
      },
      required: ["date"]
    },
    execute: getAvailability
  },
  {
    name: "createEvent",
    description:
      "Create an event on the user's calendar. ONLY call this tool after the user has explicitly given a specific time of day and duration.",
    schema: createEventSchema,
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Event title" },
        startTime: {
          type: "string",
          description: "ISO start datetime with timezone offset"
        },
        endTime: {
          type: "string",
          description: "ISO end datetime with timezone offset"
        },
        description: { type: "string", description: "Optional details" },
        attendees: {
          type: "array",
          items: { type: "string" },
          description: "Participant email addresses"
        }
      },
      required: ["summary", "startTime", "endTime"]
    },
    execute: createEvent
  }
];
