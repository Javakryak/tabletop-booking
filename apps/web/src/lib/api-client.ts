const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

export class ApiRequestError extends Error {
  details: unknown;
  status: number;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.details = details;
    this.status = status;
  }
}

function extractData<T>(payload: unknown): T {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "data" in payload &&
    (payload as { data: unknown }).data !== undefined
  ) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

function extractErrorMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const responseMessage = (payload as { message?: unknown }).message;
  if (typeof responseMessage === "string") {
    return responseMessage;
  }
  if (Array.isArray(responseMessage)) {
    const prepared = responseMessage
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .join("; ");
    if (prepared.length > 0) {
      return prepared;
    }
  }

  const nestedError = (payload as { error?: unknown }).error;
  if (typeof nestedError === "object" && nestedError !== null) {
    const nestedMessage = (nestedError as { message?: unknown }).message;
    if (typeof nestedMessage === "string") {
      return nestedMessage;
    }
    if (Array.isArray(nestedMessage)) {
      const prepared = nestedMessage
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .join("; ");
      if (prepared.length > 0) {
        return prepared;
      }
    }
  }

  return null;
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  const text = await response.text();
  const payload = text.length > 0 ? (JSON.parse(text) as unknown) : undefined;

  if (!response.ok) {
    const message = extractErrorMessage(payload) ?? "Ошибка запроса к API";

    throw new ApiRequestError(message, response.status, payload);
  }

  return extractData<T>(payload);
}
