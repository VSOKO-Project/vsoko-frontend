import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

// Exercise the real stylesheet cascade in jsdom, including both themes and the
// responsive rules. Browser layout and accessibility are covered by Playwright.
function readCss(file: string): string {
  return readFileSync(file, "utf8").replace(/@import "([^"]+)";/g, (_, path) => readCss(resolve(dirname(file), path)));
}
const css = readCss(resolve("src/styles/index.css"));
const skeletonCss = readFileSync(resolve("src/components/LoadState.vue"), "utf8").match(/<style scoped>([\s\S]*?)<\/style>/)![1]!;
let style: HTMLStyleElement | undefined;
function render(html: string, width = 1440, theme = "light") {
  document.documentElement.dataset.theme = theme;
  style = document.createElement("style");
  style.textContent = css + skeletonCss;
  document.head.append(style);
  function resolve(rules: CSSRuleList): string {
    return Array.from(rules).map(rule => {
      if (rule.type !== CSSRule.MEDIA_RULE) return rule.cssText;
      const media = rule as CSSMediaRule;
      const maxWidth = media.conditionText.match(/max-width:\s*(\d+)px/);
      return maxWidth && width <= Number(maxWidth[1]) ? resolve(media.cssRules) : "";
    }).join("\n");
  }
  style.textContent = resolve(style.sheet!.cssRules);
  document.body.innerHTML = html;
  return (selector: string) => getComputedStyle(document.querySelector(selector)!);
}
afterEach(() => {
  style?.remove();
  document.body.innerHTML = "";
  delete document.documentElement.dataset.theme;
});

describe("shared styles", () => {
  it("keeps compact and ghost button variants after the base button rule", () => {
    const styles = render('<button class="btn regular">Regular</button><button class="btn btn--sm">Small</button><button class="btn btn--ghost">Ghost</button>');
    expect(styles(".regular").minHeight).toBe("38px");
    expect(styles(".btn--sm").minHeight).toBe("36px");
    expect(styles(".btn--ghost").borderTopWidth).toBe("0px");
  });

  it("keeps the period switch clickable and aligned with its label", () => {
    const styles = render('<label class="switch"><input type="checkbox" checked /><span class="switch__track"></span>Открыт</label>');
    expect(styles(".switch").display).toBe("inline-flex");
    expect(styles(".switch input").position).toBe("absolute");
    expect(styles(".switch input").width).toBe("100%");
    expect(styles(".switch__track").width).toBe("40px");
  });

  for (const theme of ["light", "dark"]) {
    it(`keeps semantic badge colors in the ${theme} theme`, () => {
      const styles = render('<span class="badge">Default</span><span class="badge badge--success">Success</span><span class="badge badge--warning">Warning</span><span class="badge badge--danger">Danger</span><i class="expected" style="color: var(--color-danger)"></i>', 1440, theme);
      expect(styles(".badge--danger").color).toBe(styles(".expected").color);
      expect(new Set([styles(".badge").color, styles(".badge--success").color, styles(".badge--warning").color, styles(".badge--danger").color]).size).toBe(4);
    });
  }

  for (const width of [375, 768, 1024, 1440]) {
    it(`uses the same statistics and panel grids while loading at ${width}px`, () => {
      const styles = render('<div class="stats-grid"></div><div class="skeleton-stats"></div><div class="dashboard-panels"></div><div class="skeleton-panels"></div>', width);
      expect(styles(".stats-grid").gridTemplateColumns).toBe(styles(".skeleton-stats").gridTemplateColumns);
      expect(styles(".stats-grid").gap).toBe(styles(".skeleton-stats").gap);
      expect(styles(".dashboard-panels").gridTemplateColumns).toBe(styles(".skeleton-panels").gridTemplateColumns);
      if (width <= 768) expect(styles(".stats-grid").gridTemplateColumns).toBe("repeat(2, minmax(0px, 1fr))");
    });
  }
});
