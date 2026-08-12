import { z } from "zod";

export const createSessionSchema = z.object({
  idToken: z.string().min(1, "El idToken es obligatorio"),
});