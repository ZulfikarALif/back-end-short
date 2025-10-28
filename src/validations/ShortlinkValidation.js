import { z } from "zod";

export const createShortlinkSchema = z.object({
  original_url: z.string().url("URL harus valid").nonempty("URL wajib diisi"),
  description: z.string().optional(),
});