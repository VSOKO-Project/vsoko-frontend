import { beforeEach, afterEach, expect, it, vi } from "vitest";
const session = {
  accessToken: "access",
  refreshToken: "refresh",
  userId: "student",
  expires: "",
  isAdmin: false,
  mustChangePassword: false,
};
beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn());
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: {
      request: vi.fn(async (_name: string, action: () => Promise<unknown>) =>
        action(),
      ),
    },
  });
});
afterEach(() => vi.unstubAllGlobals());
it("uses the existing session storage format", async () => {
  localStorage.setItem(
    "vsoko.auth.v1",
    JSON.stringify({ id: "existing", data: session }),
  );
  const { auth, homePath } = await import("../src/store/auth");
  expect(auth.session?.id).toBe("existing");
  expect(homePath()).toBe("/workloads");
});
it("routes admins and temporary passwords correctly", async () => {
  const store = await import("../src/store/auth");
  store.installSession({ ...session, isAdmin: true }, true);
  expect(store.homePath()).toBe("/dashboard");
  store.installSession({ ...session, isAdmin: true, mustChangePassword: true });
  expect(store.homePath()).toBe("/change-password");
});
it("ignores malformed sessions", async () => {
  localStorage.setItem(
    "vsoko.auth.v1",
    '{"id":"x","data":{"accessToken":"x"}}',
  );
  const store = await import("../src/store/auth");
  expect(store.homePath()).toBe("/login");
});
it("clears the session even when logout has no network", async () => {
  const store = await import("../src/store/auth");
  store.installSession(session, true);
  vi.mocked(fetch).mockRejectedValue(new TypeError("offline"));
  const { logout } = await import("../src/api/auth");
  await expect(logout()).rejects.toThrow("offline");
  expect(store.auth.session).toBeNull();
});
it("deduplicates concurrent refreshes", async () => {
  const store = await import("../src/store/auth");
  store.installSession(session, true);
  vi.mocked(fetch).mockResolvedValue(
    new Response(
      JSON.stringify({
        data: { ...session, accessToken: "new", refreshToken: "new-refresh" },
      }),
    ),
  );
  const { refreshSession } = await import("../src/api/session");
  await Promise.all([refreshSession(), refreshSession(), refreshSession()]);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(store.auth.session?.data.accessToken).toBe("new");
});
it("keeps credentials during refresh outages", async () => {
  const store = await import("../src/store/auth");
  store.installSession(session, true);
  vi.mocked(fetch).mockRejectedValue(new TypeError("offline"));
  const { refreshSession } = await import("../src/api/session");
  await expect(refreshSession()).rejects.toThrow();
  await expect(refreshSession()).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(store.auth.session).not.toBeNull();
});
it("clears rejected refresh credentials", async () => {
  const store = await import("../src/store/auth");
  store.installSession(session, true);
  vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 401 }));
  const { refreshSession } = await import("../src/api/session");
  await expect(refreshSession()).rejects.toThrow();
  expect(store.auth.session).toBeNull();
});
it("rejects responses after an account switch", async () => {
  const store = await import("../src/store/auth");
  store.installSession(session, true);
  let finish: (value: Response) => void = () => {};
  vi.mocked(fetch).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { refreshSession } = await import("../src/api/session");
  const pending = refreshSession();
  await Promise.resolve();
  store.installSession({ ...session, userId: "other" }, true);
  finish(
    new Response(JSON.stringify({ data: { ...session, accessToken: "late" } })),
  );
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(store.auth.session?.data.userId).toBe("other");
});
it("refreshes and retries an expired API request once", async () => {
  const store = await import("../src/store/auth");
  store.installSession(session, true);
  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response("{}", { status: 401 }))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ data: { ...session, accessToken: "new" } }),
      ),
    )
    .mockResolvedValueOnce(new Response(JSON.stringify({ data: ["result"] })));
  const { default: api } = await import("../src/api/client");
  expect((await api.get<{ data: string[] }>("/Periods")).data.data).toEqual([
    "result",
  ]);
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(vi.mocked(fetch).mock.calls[2]?.[1]?.headers).toMatchObject({
    Authorization: "Bearer new",
  });
});
it("changes a temporary password and installs the returned session", async () => {
  const store = await import("../src/store/auth");
  store.installSession({ ...session, mustChangePassword: true }, true);
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify({ data: session })),
  );
  const { changePassword } = await import("../src/api/auth");
  await changePassword({ currentPassword: "Temp1", newPassword: "New123" });
  expect(store.auth.session?.data.mustChangePassword).toBe(false);
  expect(store.homePath()).toBe("/workloads");
  expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body))).toEqual(
    { currentPassword: "Temp1", newPassword: "New123" },
  );
});
it("refreshes an expired token during password change", async () => {
  const store = await import("../src/store/auth");
  store.installSession({ ...session, mustChangePassword: true }, true);
  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response("{}", { status: 401 }))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            ...session,
            accessToken: "rotated",
            mustChangePassword: true,
          },
        }),
      ),
    )
    .mockResolvedValueOnce(new Response(JSON.stringify({ data: session })));
  const { changePassword } = await import("../src/api/auth");
  await changePassword({ currentPassword: "Temp1", newPassword: "New123" });
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(store.homePath()).toBe("/workloads");
});
it("deduplicates simultaneous password changes", async () => {
  const store = await import("../src/store/auth");
  store.installSession({ ...session, mustChangePassword: true }, true);
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify({ data: session })),
  );
  const { changePassword } = await import("../src/api/auth");
  await Promise.all([
    changePassword({ currentPassword: "Temp1", newPassword: "New123" }),
    changePassword({ currentPassword: "Temp1", newPassword: "New123" }),
  ]);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("does not hide password validation failures", async () => {
  const store = await import("../src/store/auth");
  store.installSession({ ...session, mustChangePassword: true }, true);
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify({ detail: "Недостаточно сложный пароль" }), {
      status: 400,
    }),
  );
  const { changePassword } = await import("../src/api/auth");
  await expect(
    changePassword({ currentPassword: "Temp1", newPassword: "weak" }),
  ).rejects.toThrow("Недостаточно сложный пароль");
  expect(store.auth.session?.data.mustChangePassword).toBe(true);
});
it("rejects expired credentials after a failed API retry", async () => {
  const store = await import("../src/store/auth");
  store.installSession(session, true);
  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response("{}", { status: 401 }))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ data: { ...session, accessToken: "new" } }),
      ),
    )
    .mockResolvedValueOnce(new Response("{}", { status: 401 }));
  const { default: api } = await import("../src/api/client");
  await expect(api.get("/Periods")).rejects.toThrow();
  expect(store.auth.session).toBeNull();
});
it("does not refresh on ordinary forbidden responses", async () => {
  const store = await import("../src/store/auth");
  store.installSession(session, true);
  vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 403 }));
  const { default: api } = await import("../src/api/client");
  await expect(api.get("/Periods")).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(store.auth.session).not.toBeNull();
});
it("stops API requests when password change is required", async () => {
  const store = await import("../src/store/auth");
  store.installSession({ ...session, mustChangePassword: true }, true);
  const { default: api } = await import("../src/api/client");
  await expect(api.get("/Periods")).rejects.toMatchObject({
    name: "AbortError",
  });
  expect(fetch).not.toHaveBeenCalled();
});
it("syncs cross-tab logout and refuses updates for another user", async () => {
  const store = await import("../src/store/auth");
  store.installSession(session, true);
  store.installSession({ ...session, userId: "other" });
  expect(store.auth.session?.data.userId).toBe("student");
  localStorage.removeItem(store.AUTH_STORAGE_KEY);
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: store.AUTH_STORAGE_KEY,
      storageArea: localStorage,
    }),
  );
  expect(store.auth.session).toBeNull();
});
