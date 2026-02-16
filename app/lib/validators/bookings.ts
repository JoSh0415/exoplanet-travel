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
