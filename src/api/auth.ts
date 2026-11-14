import { auth, syncSession, installSession, clearSession } from "../store/auth";
import {
  assertCurrentSession,
  refreshSessionLocked,
  withSessionLock,
} from "./session";
import { ApiError, transport } from "./transport";
import type {
  ApiSuccessResult,
  LoginResultDto,
  LoginQuery,
  ChangePasswordCommand,
} from "../types";
export async function login(data: LoginQuery) {
  syncSession();
  const version = auth.version;
  return withSessionLock(async () => {
    assertCurrentSession(version);
    const response = await transport<ApiSuccessResult<LoginResultDto>>(
      "POST",
      "/Security/Login",
      data,
    );
    assertCurrentSession(version);
    installSession(response.data.data, true);
  });
}
export async function logout() {
  syncSession();
  const version = auth.version;
  return withSessionLock(async () => {
    assertCurrentSession(version);
    const refresh = auth.session?.data.refreshToken;
    clearSession();
    if (refresh) await transport("POST", "/Security/LogOut", { refresh });
  });
}
let pending: Promise<void> | undefined;
export function changePassword(data: ChangePasswordCommand) {
  if (pending) return pending;
  syncSession();
  const version = auth.version;
  const originalToken = auth.session?.data.accessToken;
  pending = withSessionLock(async () => {
    assertCurrentSession(version);
    if (
      auth.session?.data.accessToken !== originalToken &&
      !auth.session?.data.mustChangePassword
    )
      return;
    const submit = () =>
      transport<ApiSuccessResult<LoginResultDto>>(
        "POST",
        "/Security/ChangePassword",
        data,
        {},
        auth.session?.data.accessToken,
      );
    let response;
    try {
      response = await submit();
    } catch (error) {
      if (!(error instanceof ApiError) || error.response.status !== 401)
        throw error;
      await refreshSessionLocked(version);
      response = await submit();
    }
    assertCurrentSession(version);
    if (response.data?.data?.accessToken) installSession(response.data.data);
    else await refreshSessionLocked(version);
  });
  const result = pending;
  void result.then(
    () => {
      pending = undefined;
    },
    () => {
      pending = undefined;
    },
  );
  return result;
}
