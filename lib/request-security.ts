import { z } from 'zod'

export function getClientIp(req: Request) {
  const candidates = [
    req.headers.get('cf-connecting-ip'),
    req.headers.get('x-real-ip'),
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
  ]

  return candidates.find((value) => value && value.length > 0) ?? '127.0.0.1'
}

const safeText = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine((value) => !/[<>{}]/.test(value), 'Недопустимые символы')

export const usernameLookupSchema = z.object({
  username: z
    .string()
    .trim()
    .transform((value) => value.replace(/^@+/, ''))
    .pipe(z.string().min(3).max(32).regex(/^[A-Za-z0-9_]+$/)),
})

export const ticketCreateSchema = z.object({
  subject: safeText(3, 120),
  message: safeText(5, 4000),
  imageUrl: z.string().url().max(2000).nullable().optional(),
})

export const ticketReplySchema = z.object({
  body: z.string().trim().max(4000).default(''),
  imageUrl: z.string().url().max(2000).nullable().optional(),
})

export const marketOrderSchema = z.object({
  productId: z.string().trim().min(1).max(80),
  fullName: safeText(2, 120),
  phone: z.string().trim().min(5).max(32).regex(/^[0-9+()\-\s]+$/),
  address: safeText(5, 200),
  city: safeText(2, 80),
})

export const marketReviewSchema = z.object({
  productId: z.string().trim().min(1).max(80),
  rating: z.coerce.number().int().min(1).max(5),
  comment: safeText(3, 1500),
})

export const pingStatSchema = z.object({
  locationId: z.string().trim().min(1).max(80),
  latency: z.coerce.number().finite().min(0).max(60000),
})
