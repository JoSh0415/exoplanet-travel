import { z } from "zod";

export const createBookingSchema = z.object({
  userId: z.string().min(10),
  planetId: z.string().min(10),
  travelClass: z
    .string()
    .trim()
    .min(1)
    .max(60),
});

export const listBookingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().min(10).optional(),
});

export const updateBookingSchema = z
  .object({
    travelClass: z.string().trim().min(1).max(60).optional(),
    status: z.string().trim().min(1).max(30).optional(), // only if you added status to Prisma
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one field must be provided",
  });