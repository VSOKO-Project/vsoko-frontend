import { expect, it } from "vitest";
import { accountLogin } from "../src/utils/account";
function token(claims: object) {
  return `header.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.signature`;
}
it("shows the existing API name claim", () =>
  expect(
    accountLogin(
      token({
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name":
          "20261234",
      }),
    ),
  ).toBe("20261234"));
it("decodes Unicode account names", () =>
  expect(accountLogin(token({ name: "Иван Петров" }))).toBe("Иван Петров"));
it("uses the recorded login for older sessions", () =>
  expect(accountLogin("invalid", "student")).toBe("student"));
it("never displays arbitrary non-string claims", () =>
  expect(accountLogin(token({ name: { admin: true } }), "student")).toBe(
    "student",
  ));
