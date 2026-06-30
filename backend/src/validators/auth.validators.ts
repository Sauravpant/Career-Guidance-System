import { z } from "zod";

export const updateUserSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  education: z.string().optional(),

  skills: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
  avatarUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
});  