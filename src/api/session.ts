import { auth, syncSession, installSession, clearSession } from "../store/auth";
import { ApiError, transport } from "./transport";
import type { ApiSuccessResult, LoginResultDto } from "../types";
export async function withSessionLock<T>(action: () => Promise<T>): Promise<T> {
  if (!navigator.locks)
    throw new Error("Для входа нужен современный браузер и HTTPS.");
  return navigator.locks.request("vsoko.auth", action);
}
export function assertCurrentSession(version: number) {
  syncSession();
  if (auth.version !== version)
    throw new DOMException("Session changed", "AbortError");
}
let pending: { version: number; promise: Promise<void> } | undefined;
let failure: { token: string; until: number; error: unknown } | undefined;
export async function refreshSessionLocked(version: number) {
  assertCurrentSession(version);
  const token = auth.session?.data.refreshToken;
  if (!token) throw new DOMException("Signed out", "AbortError");
  if (failure?.token === token && failure.until > Date.now())
    throw failure.error;
  try {
    const response = await transport<ApiSuccessResult<LoginResultDto>>(
      "POST",
      "/Security/Refresh",
      { refresh: token },
    );
    assertCurrentSession(version);
    installSession(response.data.data);
    failure = undefined;
  } catch (error) {
    assertCurrentSession(version);
    if (error instanceof ApiError && [401, 403].includes(error.response.status))
      clearSession();
    else failure = { token, until: Date.now() + 5000, error };
    throw error;
  }
}
export function refreshSession() {
  syncSession();
  const version = auth.version;
  const token = auth.session?.data.refreshToken;
  if (pending?.version === version) return pending.promise;
  const promise = withSessionLock(async () => {
    assertCurrentSession(version);
    if (auth.session?.data.refreshToken !== token) return;
    await refreshSessionLocked(version);
  });
  pending = { version, promise };
  const clear = () => {
    if (pending?.promise === promise) pending = undefined;
  };
  void promise.then(clear, clear);
  return promise;
}
export async function waitForRefresh() {
  if (pending?.version === auth.version) await pending.promise;
}
