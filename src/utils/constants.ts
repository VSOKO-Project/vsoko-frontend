export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "/api"
).replace(/\/$/, "");
export const DEFAULT_PAGE_SIZE = Math.max(
  1,
  Number(import.meta.env.VITE_DEFAULT_PAGE_SIZE) || 10,
);
