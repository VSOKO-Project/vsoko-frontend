import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { transport, ApiError } from "../src/api/transport";
beforeEach(() =>
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: "ok" }), { status: 200 }),
      ),
  ),
);
afterEach(() => vi.unstubAllGlobals());
it("serializes repeated arrays and omits empty query values", async () => {
  await transport(
    "GET",
    "/Import/export",
    undefined,
    {
      params: {
        teacherIds: ["a", "b"],
        empty: "",
        missing: undefined,
        startYear: 2026,
      },
    },
    "token",
  );
  const [url, options] = vi.mocked(fetch).mock.calls[0]!;
  const parsed = new URL(String(url));
  expect(parsed.searchParams.getAll("teacherIds")).toEqual(["a", "b"]);
  expect(parsed.searchParams.has("empty")).toBe(false);
  expect(options?.headers).toMatchObject({ Authorization: "Bearer token" });
});
it("sends JSON payloads with content type", async () => {
  await transport("POST", "/Feedback", { comment: "Спасибо" });
  const options = vi.mocked(fetch).mock.calls[0]![1]!;
  expect(options.body).toBe('{"comment":"Спасибо"}');
  expect(options.headers).toMatchObject({ "Content-Type": "application/json" });
});
it("leaves multipart boundary to the browser", async () => {
  const body = new FormData();
  body.append("file", new File(["x"], "data.xlsx"));
  await transport("POST", "/Import/preview", body);
  const options = vi.mocked(fetch).mock.calls[0]![1]!;
  expect(options.body).toBe(body);
  expect(options.headers).not.toHaveProperty("Content-Type");
});
it("returns download blobs", async () => {
  vi.mocked(fetch).mockResolvedValue(new Response("%PDF", { status: 200 }));
  const result = await transport<Blob>("POST", "/Report", null, {
    responseType: "blob",
  });
  expect(await result.data.text()).toBe("%PDF");
});
it("handles no-content responses", async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));
  expect((await transport("DELETE", "/Criteria/x")).data).toBeUndefined();
});
it("preserves structured validation details", async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(
      JSON.stringify({
        detail: "Файл не прошёл проверку",
        report: { errors: [] },
      }),
      { status: 400 },
    ),
  );
  await expect(transport("POST", "/Import/apply")).rejects.toMatchObject({
    response: {
      status: 400,
      data: { detail: "Файл не прошёл проверку", report: { errors: [] } },
    },
  });
});
it("handles HTML gateway errors", async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response("<h1>Unavailable</h1>", { status: 502 }),
  );
  await expect(transport("GET", "/Periods")).rejects.toBeInstanceOf(ApiError);
});
