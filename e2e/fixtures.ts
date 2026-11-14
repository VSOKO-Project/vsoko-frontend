import { test as base, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { responseData, session } from "../tests/fixtures";
export { expect, session };
export const test = base.extend<{
  app: {
    signIn: (admin?: boolean, mustChangePassword?: boolean) => Promise<void>;
  };
}>({
  app: async ({ page }, use) => {
    await page.route("https://vsoko.test/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith("/api/")) {
        const path = url.pathname.slice(4);
        if (
          path === "/Report" ||
          [
            "/Import/template",
            "/Import/export",
            "/Import/credentials",
          ].includes(path)
        ) {
          await route.fulfill({
            contentType:
              path === "/Report"
                ? "application/pdf"
                : "application/octet-stream",
            body: path === "/Report" ? "%PDF-1.4 test" : "xlsx-test",
          });
          return;
        }
        if (
          route.request().method() === "DELETE" ||
          path === "/Security/LogOut"
        ) {
          await route.fulfill({ status: 204 });
          return;
        }
        await route.fulfill({ json: { data: responseData(path) } });
        return;
      }
      const asset =
        url.pathname.startsWith("/assets/") ||
        url.pathname.startsWith("/fonts/") ||
        url.pathname === "/favicon.svg";
      const file = resolve(
        "dist",
        asset ? url.pathname.slice(1) : "index.html",
      );
      const extension = file.split(".").at(-1);
      const types: Record<string, string> = {
        js: "text/javascript",
        css: "text/css",
        html: "text/html",
        woff2: "font/woff2",
        svg: "image/svg+xml",
      };
      try {
        await route.fulfill({
          body: await readFile(file),
          contentType: types[extension || "html"] || "application/octet-stream",
        });
      } catch {
        await route.fulfill({ status: 404 });
      }
    });
    await page.addInitScript(() => {
      if (!localStorage.getItem("vsoko.theme"))
        localStorage.setItem("vsoko.theme", "light");
    });
    await use({
      signIn: async (admin = false, mustChangePassword = false) => {
        await page.addInitScript(
          ({ data }) =>
            localStorage.setItem(
              "vsoko.auth.v1",
              JSON.stringify({ id: "e2e", data }),
            ),
          {
            data: {
              ...session,
              login: admin ? "admin" : "student",
              isAdmin: admin,
              mustChangePassword,
            },
          },
        );
      },
    });
  },
});
