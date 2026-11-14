import { reactive, readonly } from "vue";
import type { LoginResultDto } from "../types";
export const AUTH_STORAGE_KEY = "vsoko.auth.v1";
interface Session {
  id: string;
  data: LoginResultDto;
}
function read(): Session | null {
  try {
    const value = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null");
    if (
      typeof value?.id === "string" &&
      typeof value.data?.accessToken === "string" &&
      typeof value.data?.refreshToken === "string" &&
      typeof value.data?.userId === "string" &&
      typeof value.data?.isAdmin === "boolean" &&
      typeof value.data?.mustChangePassword === "boolean"
    )
      return value;
  } catch {
    /* Invalid session is signed out. */
  }
  return null;
}
// Preserve sessions from earlier versions.
try {
  if (
    !localStorage.getItem(AUTH_STORAGE_KEY) &&
    localStorage.getItem("accessToken")
  )
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        id: crypto.randomUUID(),
        data: {
          accessToken: localStorage.getItem("accessToken"),
          refreshToken: localStorage.getItem("refreshToken"),
          userId: localStorage.getItem("userId"),
          expires: "",
          isAdmin: localStorage.getItem("isAdmin") === "true",
          mustChangePassword:
            localStorage.getItem("mustChangePassword") === "true",
        },
      }),
    );
  for (const key of [
    "accessToken",
    "refreshToken",
    "userId",
    "isAdmin",
    "mustChangePassword",
  ])
    localStorage.removeItem(key);
} catch {
  /* Storage errors are shown when trying to sign in. */
}
const state = reactive({ session: read(), version: 0 });
export const auth = readonly(state);
export function syncSession() {
  const next = read();
  if (
    next?.id !== state.session?.id ||
    next?.data.isAdmin !== state.session?.data.isAdmin ||
    next?.data.userId !== state.session?.data.userId ||
    next?.data.mustChangePassword !== state.session?.data.mustChangePassword
  )
    state.version++;
  state.session = next;
}
export function installSession(data: LoginResultDto, replace = false) {
  syncSession();
  if (!replace && (!state.session || state.session.data.userId !== data.userId))
    return;
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      id: replace ? crypto.randomUUID() : state.session!.id,
      data: {
        ...data,
        login: data.login || (!replace ? state.session?.data.login : undefined),
      },
    }),
  );
  syncSession();
}
export function clearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  syncSession();
}
export function requirePasswordChange() {
  if (state.session)
    installSession({ ...state.session.data, mustChangePassword: true });
}
export function homePath() {
  return !state.session
    ? "/login"
    : state.session.data.mustChangePassword
      ? "/change-password"
      : state.session.data.isAdmin
        ? "/dashboard"
        : "/workloads";
}
window.addEventListener("storage", (event) => {
  if (
    event.storageArea === localStorage &&
    (!event.key || event.key === AUTH_STORAGE_KEY)
  )
    syncSession();
});
