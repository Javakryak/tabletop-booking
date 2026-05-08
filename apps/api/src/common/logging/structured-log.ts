type StructuredLogLevel = "info" | "warn" | "error";

const MAX_DEPTH = 5;
const MAX_STRING_LENGTH = 2048;
const REDACTED_VALUE = "[REDACTED]";
const TRUNCATED_VALUE = "[TRUNCATED]";

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /\+?\d[\d\s()-]{8,}\d/g;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/gi;
const QUERY_SECRET_PATTERN =
  /\b(token|auth|authorization|cookie|password|secret|init_data|telegram_init_data|jwt)=([^&\s]+)/gi;

const SENSITIVE_KEYWORDS = [
  "authorization",
  "cookie",
  "email",
  "init_data",
  "jwt",
  "password",
  "phone",
  "secret",
  "set-cookie",
  "telegram",
  "token"
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSensitiveKey(key: string): boolean {
  const lowerCased = key.toLowerCase();
  return SENSITIVE_KEYWORDS.some((keyword) => lowerCased.includes(keyword));
}

function sanitizeString(value: string): string {
  const replaced = value
    .replace(BEARER_PATTERN, "Bearer [REDACTED]")
    .replace(QUERY_SECRET_PATTERN, "$1=[REDACTED]")
    .replace(EMAIL_PATTERN, REDACTED_VALUE)
    .replace(PHONE_PATTERN, REDACTED_VALUE);

  if (replaced.length <= MAX_STRING_LENGTH) {
    return replaced;
  }

  return `${replaced.slice(0, MAX_STRING_LENGTH)}...[TRUNCATED]`;
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth >= MAX_DEPTH) {
    return TRUNCATED_VALUE;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  if (!isRecord(value)) {
    return String(value);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    sanitized[key] = isSensitiveKey(key)
      ? REDACTED_VALUE
      : sanitizeValue(nestedValue, depth + 1);
  }

  return sanitized;
}

function normalizeRequestId(input: unknown): string | null {
  if (typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.slice(0, 128);
  return sanitizeString(normalized);
}

export function logStructured(
  level: StructuredLogLevel,
  context: string,
  fields: Record<string, unknown> = {}
): void {
  const requestId = normalizeRequestId(fields.requestId);
  const sanitized = sanitizeValue(fields);
  const payload = isRecord(sanitized) ? sanitized : { payload: sanitized };
  const record = {
    ...payload,
    context,
    level,
    requestId,
    timestamp: new Date().toISOString()
  };
  const line = JSON.stringify(record);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}
