import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(async ({ command, mode }) => ({
  plugins: [vue(), ...(command === 'serve' && mode === 'mock' ? [(await import('./dev/mock-api')).mockApi()] : [])],
  ...(mode === 'mock' ? { define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api') } } : {}),
}));
