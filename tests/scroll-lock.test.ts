import { mount } from "@vue/test-utils";
import { afterEach, expect, it } from "vitest";
import { ref } from "vue";
import { useScrollLock } from "../src/composables/scroll-lock";

afterEach(() => { document.body.style.overflow = ""; });

it("preserves the original scrolling style across overlapping dialogs", () => {
  document.body.style.overflow = "auto";
  const first = ref(false);
  const second = ref(false);
  const wrapper = mount({
    setup() { useScrollLock(first); useScrollLock(second); },
    template: "<div />",
  });
  first.value = true;
  second.value = true;
  expect(document.body.style.overflow).toBe("hidden");
  first.value = false;
  expect(document.body.style.overflow).toBe("hidden");
  second.value = false;
  expect(document.body.style.overflow).toBe("auto");
  wrapper.unmount();
});

it("releases a lock when an open dialog is unmounted", () => {
  const wrapper = mount({
    setup() { useScrollLock(() => true); },
    template: "<div />",
  });
  expect(document.body.style.overflow).toBe("hidden");
  wrapper.unmount();
  expect(document.body.style.overflow).toBe("");
});
