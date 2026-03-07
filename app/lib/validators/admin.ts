import { z } from "zod";

export const importRunsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const nasaCsvRowSchema = z.object({
  pl_name: z.string().min(1),
  sy_dist: z.string().min(1),
  pl_eqt: z.string().optional(),
  pl_masse: z.string().optional(),
  pl_rade: z.string().optional(),
  disc_year: z.string().optional(),
}).passthrough();
