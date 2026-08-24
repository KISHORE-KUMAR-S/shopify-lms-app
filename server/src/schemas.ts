import { z } from "zod";

/**
 * Server-side validation for all writable LMS resources. The client validates
 * too, but these are authoritative.
 */

export const courseCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  instructorName: z.string().trim().min(1, "Instructor name is required").max(120),
  category: z.string().trim().max(120).optional().nullable(),
  duration: z.coerce
    .number({ error: "Duration must be a number" })
    .int("Duration must be a whole number of hours")
    .positive("Duration must be greater than zero")
    .max(10000)
    .optional()
    .nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const courseUpdateSchema = courseCreateSchema.partial();

export const studentCreateSchema = z.object({
  name: z.string().trim().min(1, "Student name is required").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(254),
});

export const enrollmentCreateSchema = z.object({
  studentId: z.string().uuid("Select a student"),
  courseId: z.string().uuid("Select a course"),
});

export const enrollmentStatusSchema = z.object({
  status: z.enum(["IN_PROGRESS", "COMPLETED"], {
    error: "Status must be IN_PROGRESS or COMPLETED",
  }),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
});
