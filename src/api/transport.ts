import { API_BASE_URL } from "../utils/constants";
export class ApiError extends Error {
  response: {
    status: number;
    data: { detail?: string; title?: string; report?: unknown };
  };
  constructor(status: number, data: ApiError["response"]["data"]) {
    super(data.detail || "Не удалось выполнить запрос");
    this.response = { status, data };
  }
}
export interface RequestOptions {
  params?: object;
  signal?: AbortSignal;
  responseType?: "blob";
  headers?: Record<string, string>;
  timeout?: number;
  paramsSerializer?: object;
}
export async function transport<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
  token?: string,
): Promise<{ data: T }> {
  const url = new URL(`${API_BASE_URL}${path}`, location.origin);
  for (const [key, value] of Object.entries(options.params ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    for (const item of Array.isArray(value) ? value : [value])
      url.searchParams.append(key, String(item));
  }
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && body !== null && !(body instanceof FormData))
    headers["Content-Type"] = "application/json";
  const signal = AbortSignal.any([
    AbortSignal.timeout(options.timeout ?? 20000),
    ...(options.signal ? [options.signal] : []),
  ]);
  const response = await fetch(url, {
    method,
    headers,
    body:
      body === undefined || body === null
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    let data = {};
    try {
      data = await response.json();
    } catch {
      /* Proxy may return HTML. */
    }
    throw new ApiError(response.status, data);
  }
  const data =
    response.status === 204
      ? undefined
      : options.responseType === "blob"
        ? await response.blob()
        : await response
            .text()
            .then((text) => (text ? JSON.parse(text) : undefined));
  return { data: data as T };
}
