import { useScrollLock } from "./scroll-lock";
import { nextTick, onMounted, onScopeDispose, ref, watch } from "vue";

/** Keep the mobile drawer out of the tab order when closed and modal when open. */
export function useMobileNavigation() {
  const open = ref(false);
  const mobile = ref(false);
  const sidebar = ref<HTMLElement>();
  let media: MediaQueryList | undefined;
  let previousFocus: HTMLElement | undefined;

  useScrollLock(() => mobile.value && open.value);
  function resize() {
    mobile.value = !!media?.matches;
    if (!mobile.value) open.value = false;
  }
  function keyboard(event: KeyboardEvent) {
    if (!mobile.value || !open.value) return;
    if (event.key === "Escape") {
      event.preventDefault();
      open.value = false;
    }
    if (event.key !== "Tab") return;
    const controls = sidebar.value?.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), [tabindex="0"]',
    );
    const first = controls?.[0];
    const last = controls?.[controls.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  watch(open, async (value) => {
    if (value && mobile.value) {
      previousFocus = document.activeElement as HTMLElement;
      await nextTick();
      if (open.value) sidebar.value?.querySelector<HTMLElement>("a[href]")?.focus();
    } else {
      await nextTick();
      if (mobile.value && previousFocus?.isConnected) previousFocus.focus();
      previousFocus = undefined;
    }
  });
  onMounted(() => {
    media = window.matchMedia("(max-width: 768px)");
    resize();
    media.addEventListener("change", resize);
    window.addEventListener("keydown", keyboard);
  });
  onScopeDispose(() => {
    media?.removeEventListener("change", resize);
    window.removeEventListener("keydown", keyboard);
  });
  return { open, mobile, sidebar };
}
