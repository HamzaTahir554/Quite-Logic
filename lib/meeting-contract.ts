import { z } from "zod";

export const timezoneSchema = z
  .string()
  .min(1)
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Choose a valid timezone.");
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(
      (value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value),
      "Please remove unsupported characters.",
    );
export const meetingDetailsInput = z
  .object({
    name: text(100).min(2, "Enter your full name."),
    email: z
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
    phone: text(40)
      .regex(/^\+?[\d\s().-]+$/, "Enter a valid phone number.")
      .refine(
        (value) => value.replace(/\D/g, "").length >= 6,
        "Enter a phone number, including the country code.",
      ),
    company: text(150).min(1, "Enter your company or organization."),
    message: text(2000).min(1, "Enter the purpose of your meeting."),
    projectType: z
      .enum([
        "",
        "Web Development",
        "Mobile App",
        "AI / ML",
        "Automation",
        "SaaS",
        "Consultation",
        "Other",
      ])
      .default(""),
  })
  .strict();
export const meetingInput = meetingDetailsInput
  .extend({
    requestId: z.uuid(),
    startTime: z.iso.datetime({ offset: true }),
    timezone: timezoneSchema,
    answers: z
      .array(
        z
          .object({
            position: z.number().int().min(0).max(100),
            answer: text(2000),
          })
          .strict(),
      )
      .max(30)
      .default([]),
  })
  .strict();
export type MeetingInput = z.infer<typeof meetingInput>;
export type MeetingQuestion = {
  name: string;
  position: number;
  required: boolean;
  type: "string" | "text" | "phone_number" | "single_select" | "multi_select";
  choices: string[];
  field?: "phone" | "company" | "message" | "projectType";
};
export type Availability = {
  slots: {
    startTime: string;
    date: string;
    timezone: string;
    available: true;
  }[];
  duration: number;
  questions: MeetingQuestion[];
  phoneRequired: boolean;
};
export type MeetingConfirmation = {
  name: string;
  startTime: string;
  endTime: string;
  timezone: string;
};
export function meetingStatus(
  meeting: { state: string; startTime: string; endTime: string },
  now: number,
) {
  if (meeting.state === "cancelled") return "Cancelled";
  if (meeting.state !== "confirmed") return "Awaiting confirmation";
  if (Date.parse(meeting.endTime) <= now) return "Completed";
  return Date.parse(meeting.startTime) <= now ? "In Progress" : "Upcoming";
}
export const slotConflict =
  "That time was just booked. Please choose another available time.";
export function dateInZone(value: string | Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
