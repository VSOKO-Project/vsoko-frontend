import { test, expect } from "./fixtures";

for (const theme of ["light", "dark"] as const) {
  for (const modal of [false, true]) {
    test(`${theme} dropdown has an opaque surface ${modal ? "inside a dialog" : "over page content"}`, async ({ page, app }, testInfo) => {
      await app.signIn(true);
      await page.addInitScript(value => localStorage.setItem("vsoko.theme", value), theme);
      await page.goto(modal ? "/criteria" : "/dashboard");
      if (modal) await page.getByRole("button", { name: "Добавить критерий" }).click();
      await page.getByRole("combobox", { name: modal ? "Тип критерия" : "Период" }).click();
      const menu = page.getByRole("listbox");
      await expect(menu).toBeVisible();
      const surface = theme === "light" ? "rgb(255, 255, 255)" : "rgb(27, 39, 48)";
      await expect(menu).toHaveCSS("background-color", surface);
      await expect(menu).toHaveCSS("border-top-width", "1px");
      await expect(menu.getByRole("option").first()).toHaveCSS("display", "flex");
      await page.screenshot({ path: testInfo.outputPath("dropdown.png"), fullPage: true });
      await page.keyboard.press("Escape");
      await expect(menu).toHaveCount(0);
      await expect(page.getByRole("combobox", { name: modal ? "Тип критерия" : "Период" })).toBeFocused();
    });
  }
}
