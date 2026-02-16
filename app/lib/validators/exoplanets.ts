import { z } from "zod";

export const exoplanetsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),

  q: z.string().trim().min(1).max(100).optional(),

  vibe: z.string().trim().min(1).max(60).optional(),

  minDistance: z.coerce.number().min(0).optional(),
  maxDistance: z.coerce.number().min(0).optional(),

  sort: z.enum(["distance", "discoveryYear", "name"]).default("distance"),
  order: z.enum(["asc", "desc"]).default("asc"),
});
