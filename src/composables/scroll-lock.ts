import { onScopeDispose, watch, type WatchSource } from "vue";

let locks = 0;
let previousOverflow = "";

/** Dialogs may overlap; restore scrolling only after the last one closes. */
export function useScrollLock(active: WatchSource<boolean>) {
  let locked = false;
  function update(value: boolean) {
    if (value === locked) return;
    locked = value;
    if (value) {
      if (locks++ === 0) {
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
      }
    } else if (--locks === 0) {
      document.body.style.overflow = previousOverflow;
    }
  }
  watch(active, update, { immediate: true, flush: "sync" });
  onScopeDispose(() => update(false));
}
