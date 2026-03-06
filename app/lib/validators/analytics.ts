import { z } from "zod";

/** GET /api/analytics/top-destinations */
export const topDestinationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

/** GET /api/analytics/bookings-summary */
export const bookingsSummaryQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
    .optional(),
  groupBy: z.enum(["day", "month"]).default("day"),
});
