export function showPasswordResetNotice(): boolean {
  return import.meta.env.VITE_SHOW_PASSWORD_RESET_NOTICE !== "false";
}
