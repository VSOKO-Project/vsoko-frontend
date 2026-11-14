// Kept as the endpoint-wrapper entry point; transport uses native fetch.
import {
  auth,
  syncSession,
  clearSession,
  requirePasswordChange,
} from "../store/auth";
import {
  assertCurrentSession,
  refreshSession,
  waitForRefresh,
} from "./session";
import { ApiError, transport, type RequestOptions } from "./transport";
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
) {
  syncSession();
  const version = auth.version;
  await waitForRefresh();
  assertCurrentSession(version);
  if (!auth.session || auth.session.data.mustChangePassword)
    throw new DOMException("Session not ready", "AbortError");
  const token = auth.session.data.accessToken;
  try {
    const result = await transport<T>(method, path, body, options, token);
    assertCurrentSession(version);
    return result;
  } catch (error) {
    assertCurrentSession(version);
    const passwordRequired =
      error instanceof ApiError &&
      error.response.status === 403 &&
      error.response.data.title === "Password Change Required";
    if (
      !(error instanceof ApiError) ||
      (error.response.status !== 401 && !passwordRequired)
    )
      throw error;
    if (auth.session?.data.accessToken === token) await refreshSession();
    assertCurrentSession(version);
    if (!auth.session || auth.session.data.mustChangePassword) throw error;
    const retryToken = auth.session.data.accessToken;
    try {
      const result = await transport<T>(
        method,
        path,
        body,
        options,
        retryToken,
      );
      assertCurrentSession(version);
      return result;
    } catch (retryError) {
      assertCurrentSession(version);
      if (
        retryError instanceof ApiError &&
        auth.session?.data.accessToken === retryToken
      ) {
        if (retryError.response.status === 401) clearSession();
        if (
          retryError.response.status === 403 &&
          retryError.response.data.title === "Password Change Required"
        )
          requirePasswordChange();
      }
      throw retryError;
    }
  }
}
export default {
  get: <T = Blob>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, undefined, options),
  post: <T = Blob>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),
  put: <T = void>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, body, options),
  delete: <T = void>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, undefined, options),
};
