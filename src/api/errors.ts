import { ApiError } from "./transport";

/** Текст ошибки из ProblemDetails.detail, иначе запасной текст. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const detail = (error.response?.data as { detail?: string } | undefined)
      ?.detail;
    if (typeof detail === "string" && detail) return detail;
  }
  return fallback;
}
