import { z } from "zod";

export const idSchema = z.coerce.number().int().positive();
export const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");