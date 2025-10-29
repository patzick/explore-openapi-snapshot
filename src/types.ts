import { z } from "zod";

export const SnapshotSchema = z.object({
  id: z.uuidv7(),
  projectId: z.uuidv7(),
  name: z.string(),
  hash: z.string(),
  description: z.string().optional().nullable(),
  size: z.number(),
  status: z.enum(["available", "expired"]),
  expiredAt: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  createdAt: z.string(),
  modifiedAt: z.string(),
});

export const SnapshotReturnSchema = z.object({
  id: z.string().optional(),
  url: z.string(),
  sameAsBase: z.boolean(),
  message: z.string().optional().nullable(),
  error: z.string().optional().nullable(),
});

export type SnapshotReturn = z.infer<typeof SnapshotReturnSchema>;
export type Snapshot = z.infer<typeof SnapshotSchema>;
