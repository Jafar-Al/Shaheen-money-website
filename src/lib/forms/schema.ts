import { z } from 'astro/zod';

/**
 * Strict allow-lists (audit L.5 #5): unknown fields are rejected, every
 * string is trimmed and capped, and each field exists for a stated purpose
 * (L.5 #10). Error messages are codes; the page maps them to localised text.
 */
export const PHONE = /^\+?[0-9][0-9\s\-().]{6,19}$/;
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const required = (max: number) => z.string().trim().min(1, 'required').max(max, 'too_long');
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'too_long')
    .optional()
    .transform((v) => (v ? v : undefined));
const locale = z.enum(['en', 'ar']);
const consent = z.literal('yes', { error: 'required' });

/**
 * One application for both business audiences. `type` carries who the
 * applicant is, so there is no separate "are you a shop or a company" field
 * that could disagree with it; SHOP_TYPES decides which inbox it is routed
 * to (src/lib/forms/deliver.ts).
 */
export const SHOP_TYPES = ['grocery', 'pharmacy', 'phone', 'exchange'] as const;
export const COMPANY_TYPES = ['bank', 'wallet', 'psp', 'employer', 'merchant'] as const;
export const BUSINESS_TYPES = [...SHOP_TYPES, ...COMPANY_TYPES, 'other'] as const;

export const businessSchema = z.strictObject({
  locale,
  name: required(120),
  business: required(160),
  type: z.enum(BUSINESS_TYPES, { error: 'required' }),
  country: required(80),
  city: required(80),
  phone: z.string().trim().min(1, 'required').regex(PHONE, 'phone'),
  email: z
    .string()
    .trim()
    .max(254, 'too_long')
    .refine((v) => v === '' || EMAIL.test(v), 'email')
    .optional()
    .transform((v) => (v ? v : undefined)),
  message: optional(1000),
  consent,
});

export const contactSchema = z.strictObject({
  locale,
  topic: z.enum(['support', 'partnership', 'press', 'other'], { error: 'required' }),
  name: required(120),
  email: z.string().trim().min(1, 'required').max(254, 'too_long').regex(EMAIL, 'email'),
  message: required(3000),
  consent,
});

export type BusinessApplication = z.infer<typeof businessSchema>;
export type ContactMessage = z.infer<typeof contactSchema>;
