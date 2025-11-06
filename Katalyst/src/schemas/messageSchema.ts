import { z } from 'zod';

export const messageSchema = z.object({
            content: z
                        .string()
                        .min(1, 'Message content must not be empty')
                        .max(5000, 'Message content must not exceed 5000 characters'),
            image: z
                        .string()
                        .optional()
                        .describe('Base64 encoded image for QR code detection'),
}); 