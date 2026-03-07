import { z } from "zod";

/** Allowed booking statuses — single source of truth. */
export const BOOKING_STATUSES = ["CONFIRMED", "CANCELLED"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const createBookingSchema = z.object({
  planetId: z.string().cuid(),
  travelClass: z
    .string()
    .trim()
    .min(1)
    .max(60),
});

export const listBookingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateBookingSchema = z
  .object({
    travelClass: z.string().trim().min(1).max(60).optional(),
    status: z.enum(BOOKING_STATUSES).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one field must be provided",
  });