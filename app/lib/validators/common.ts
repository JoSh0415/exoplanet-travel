import { z } from "zod";

export const idSchema = z.string().cuid();

export const validateId = (id: string) => {
  return idSchema.safeParse(id);
};