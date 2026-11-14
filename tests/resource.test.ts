import { mount, flushPromises } from "@vue/test-utils";
import { expect, it, vi } from "vitest";
import { ref } from "vue";
import { useResource, refreshNotice } from "../src/composables/resource";
it("keeps the current data visible while a refresh is pending", async () => {
  let finish: (value: string) => void = () => {};
  const load = vi
    .fn()
    .mockResolvedValueOnce("first")
    .mockImplementationOnce(
      () => new Promise<string>((resolve) => (finish = resolve)),
    );
  let resource!: ReturnType<typeof useResource<string>>;
  const wrapper = mount({
    setup() {
      resource = useResource<string>(load);
      return { resource };
    },
    template: "<div>{{ resource.data.value }}</div>",
  });
  await flushPromises();
  const pending = resource.refresh();
  expect(resource.data.value).toBe("first");
  expect(resource.loading.value).toBe(false);
  expect(resource.refreshing.value).toBe(true);
  finish("second");
  await pending;
  expect(wrapper.text()).toBe("second");
  expect(resource.refreshing.value).toBe(false);
  wrapper.unmount();
});
it("ignores an out-of-date response after the query changes", async () => {
  let finish: (value: string) => void = () => {};
  const query = ref("first");
  let resource!: ReturnType<typeof useResource<string>>;
  const wrapper = mount({
    setup() {
      resource = useResource<string>(
        () =>
          query.value === "first"
            ? new Promise((resolve) => (finish = resolve))
            : Promise.resolve("latest"),
        [query],
      );
      return {};
    },
    template: "<div/>",
  });
  query.value = "second";
  await flushPromises();
  finish("stale");
  await flushPromises();
  expect(resource.data.value).toBe("latest");
  wrapper.unmount();
});
it("keeps the last successful data after a background refresh error", async () => {
  const load = vi
    .fn()
    .mockResolvedValueOnce("saved")
    .mockRejectedValueOnce(new Error("offline"));
  let resource!: ReturnType<typeof useResource<string>>;
  const wrapper = mount({
    setup() {
      resource = useResource<string>(load);
      return {};
    },
    template: "<div/>",
  });
  await flushPromises();
  await resource.refresh();
  expect(resource.data.value).toBe("saved");
  expect(resource.error.value).toBe("");
  expect(refreshNotice.value).toContain("последняя загруженная");
  refreshNotice.value = "";
  wrapper.unmount();
});
it("discards private data immediately when the account changes", async () => {
  const { installSession } = await import("../src/store/auth");
  const first = {
    accessToken: "one",
    refreshToken: "refresh",
    userId: "one",
    isAdmin: false,
    mustChangePassword: false,
    expires: "",
  };
  installSession(first, true);
  const finish: ((value: string) => void)[] = [];
  let resource!: ReturnType<typeof useResource<string>>;
  const wrapper = mount({
    setup() {
      resource = useResource<string>(
        () => new Promise((resolve) => finish.push(resolve)),
      );
      return {};
    },
    template: "<div/>",
  });
  finish[0]!("private");
  await flushPromises();
  expect(resource.data.value).toBe("private");
  installSession({ ...first, userId: "two" }, true);
  await flushPromises();
  expect(resource.data.value).toBeUndefined();
  expect(resource.loading.value).toBe(true);
  finish[1]!("second account");
  await flushPromises();
  expect(resource.data.value).toBe("second account");
  wrapper.unmount();
});
