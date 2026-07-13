import { z } from "zod";

export const smtpConfigSchema = z.object({
  smtpServer: z.string().min(1, "SMTP server is required"),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpEmailUser: z.string().email("SMTP email user must be a valid email"),
  smtpEmailPassword: z.string().min(1, "SMTP password is required"),
  smtpBcc: z.string().email("BCC must be a valid email").optional().or(z.literal("")),
  smtpEnabled: z.union([z.boolean(), z.string()]).transform((value) => {
    if (typeof value === "boolean") return value;
    return value === "true" || value === "on" || value === "1";
  }),
});

export type SmtpConfigInput = z.infer<typeof smtpConfigSchema>;

export interface SmtpConfigPublic {
  smtpServer: string;
  smtpPort: number;
  smtpEmailUser: string;
  smtpEmailPassword: string;
  smtpBcc: string | null;
  smtpEnabled: boolean;
  updatedAt: string;
}
