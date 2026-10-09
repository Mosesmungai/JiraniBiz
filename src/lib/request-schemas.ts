import { NextResponse } from "next/server";
import { z } from "zod";

const email = z.string().trim().email().max(254);
const password = z.string().min(8).max(256);
const identifier = z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9_-]+$/);

export const loginBodySchema = z.object({
  email,
  password: z.string().min(1).max(256),
}).strict();

export const registerBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  email,
  phone: z.string().trim().max(32).optional(),
  password,
  role: z.enum(["customer", "business_owner"]).optional(),
}).strict();

export const passwordResetRequestSchema = z.object({ email }).strict();
export const passwordResetConfirmSchema = z.object({
  token: z.string().min(32).max(256),
  password,
}).strict();

export const bookingCreateBodySchema = z.object({
  businessId: identifier,
  serviceId: identifier.optional(),
  scheduledAt: z.string().trim().min(1).max(100).refine(
    (value) => Number.isFinite(Date.parse(value)),
    "scheduledAt must be a valid date.",
  ),
  notes: z.string().max(2000).optional().default(""),
}).strict();

export const bookingUpdateBodySchema = z.object({
  scheduledAt: z.string().trim().min(1).max(100).refine(
    (value) => Number.isFinite(Date.parse(value)),
    "scheduledAt must be a valid date.",
  ).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(["Confirmed", "Completed", "Cancelled"]).optional(),
}).strict().refine(
  (value) => value.scheduledAt !== undefined || value.notes !== undefined || value.status !== undefined,
  "At least one editable booking field is required.",
);

export const paymentReferenceBodySchema = z.object({
  reference: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6,32}$/),
}).strict();

export const serviceCreateBodySchema = z.object({
  businessId: identifier,
  name: z.string().trim().min(1).max(120),
  description: z.string().max(2000).optional().default(""),
  price: z.number().finite().min(0).max(1_000_000).optional().default(0),
}).strict();

export const reviewCreateBodySchema = z.object({
  businessId: identifier,
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional().default(""),
}).strict();

export const leadCreateBodySchema = z.object({
  businessSlug: identifier,
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(32),
  message: z.string().trim().min(1).max(2000),
}).strict();

export const adminReviewBodySchema = z.object({
  action: z.enum([
    "confirm_payment",
    "reject_payment",
    "approve_verification",
    "reject_verification",
  ]),
}).strict();

export const preferencesBodySchema = z.object({
  preferences: z.unknown(),
}).strict();

const deviceLocationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracy: z.number().finite().min(0).max(100),
}).strict();

export const businessCreateFormSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(100),
  area: z.string().trim().min(1).max(100),
  country: z.enum(["Kenya", "Uganda", "Tanzania"]),
  region: z.string().trim().max(80).optional().default(""),
  description: z.string().trim().min(1).max(4000),
  phone: z.string().trim().min(1).max(32),
  email: z.string().trim().email().max(254),
  planId: z.enum(["area", "region", "country"]),
  trial: z.boolean(),
  location: deviceLocationSchema,
}).strict();

export const verificationFormSchema = z.object({
  businessId: identifier,
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracy: z.number().finite().min(0).max(100),
}).strict();

export type LoginBody = z.infer<typeof loginBodySchema>;
export type RegisterBody = z.infer<typeof registerBodySchema>;
export type BookingCreateBody = z.infer<typeof bookingCreateBodySchema>;
export type BookingUpdateBody = z.infer<typeof bookingUpdateBodySchema>;
export type PaymentReferenceBody = z.infer<typeof paymentReferenceBodySchema>;
export type ServiceCreateBody = z.infer<typeof serviceCreateBodySchema>;
export type ReviewCreateBody = z.infer<typeof reviewCreateBodySchema>;
export type LeadCreateBody = z.infer<typeof leadCreateBodySchema>;
export type AdminReviewBody = z.infer<typeof adminReviewBodySchema>;
export type PreferencesBody = z.infer<typeof preferencesBodySchema>;
export type BusinessCreateForm = z.infer<typeof businessCreateFormSchema>;
export type VerificationForm = z.infer<typeof verificationFormSchema>;

export type ParsedBody<T> =
  | { data: T; response?: never }
  | { data?: never; response: NextResponse };

export async function parseJsonBody<T extends z.ZodType>(
  request: Request,
  schema: T,
  maxBytes = 32 * 1024,
): Promise<ParsedBody<z.infer<T>>> {
  let text: string;
  try {
    text = await request.text();
  } catch {
    return { response: NextResponse.json({ error: "Unable to read request body." }, { status: 400 }) };
  }

  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return { response: NextResponse.json({ error: "Request body is too large." }, { status: 413 }) };
  }

  let body: unknown;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    return { response: NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }) };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      response: NextResponse.json(
        { error: "Invalid request body.", details: parsed.error.issues.map(({ path, message }) => ({ path, message })) },
        { status: 400 },
      ),
    };
  }
  return { data: parsed.data };
}

export function contentLengthError(request: Request, maxBytes: number, label: string) {
  const value = request.headers.get("content-length");
  if (value === null) return null;
  if (!/^\d+$/.test(value)) {
    return NextResponse.json({ error: "Invalid Content-Length header." }, { status: 400 });
  }
  const contentLength = Number(value);
  if (!Number.isSafeInteger(contentLength)) {
    return NextResponse.json({ error: "Invalid Content-Length header." }, { status: 400 });
  }
  if (contentLength > maxBytes) {
    return NextResponse.json({ error: `${label} is too large.` }, { status: 413 });
  }
  return null;
}

export async function parseBoundedFormData(
  request: Request,
  maxBytes: number,
  label: string,
): Promise<ParsedBody<FormData>> {
  const sizeError = contentLengthError(request, maxBytes, label);
  if (sizeError) return { response: sizeError };
  if (!request.body) {
    return { response: NextResponse.json({ error: "Request must be a valid multipart form." }, { status: 400 }) };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > maxBytes) {
        void reader.cancel().catch(() => undefined);
        return { response: NextResponse.json({ error: `${label} is too large.` }, { status: 413 }) };
      }
      chunks.push(value);
    }
  } catch {
    return { response: NextResponse.json({ error: "Unable to read multipart request." }, { status: 400 }) };
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const form = await new Response(body, {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
    return { data: form };
  } catch {
    return { response: NextResponse.json({ error: "Request must be a valid multipart form." }, { status: 400 }) };
  }
}

export function parseStrictFormData(
  form: FormData,
  allowedFields: readonly string[],
  repeatedFields: readonly string[] = [],
) {
  const allowed = new Set(allowedFields);
  const repeated = new Set(repeatedFields);
  for (const [key] of form.entries()) {
    if (!allowed.has(key)) {
      return NextResponse.json({ error: `Unknown form field: ${key}.` }, { status: 400 });
    }
  }
  for (const key of allowed) {
    if (!repeated.has(key) && form.getAll(key).length > 1) {
      return NextResponse.json({ error: `Form field ${key} must not be repeated.` }, { status: 400 });
    }
  }
  return null;
}
