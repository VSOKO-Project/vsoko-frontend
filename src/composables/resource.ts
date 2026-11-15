import { ref, shallowRef, watch, onScopeDispose, type WatchSource } from "vue";
import { auth } from "../store/auth";
import { getApiErrorMessage } from "../api/errors";
export const backgroundLoads = ref(0);
export const refreshNotice = ref("");
// Cache successful reads only, bounded and isolated to the current account.
// Revisited screens render immediately and revalidate in the background.
const snapshots = new Map<string, unknown>();
watch(() => auth.version, () => { snapshots.clear(); refreshNotice.value = ""; }, { flush: "sync" });
export function useResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  sources: WatchSource[] = [],
  cacheKey?: () => string,
) {
  const data = shallowRef<T>();
  const loading = ref(false);
  const refreshing = ref(false);
  const error = ref("");
  let controller: AbortController | undefined;
  async function refresh(reset = false) {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    if (reset) data.value = undefined;
    const key = auth.session ? cacheKey?.() : undefined;
    const version = auth.version;
    if (key && data.value === undefined && snapshots.has(key))
      data.value = snapshots.get(key) as T;
    const background = data.value !== undefined;
    loading.value = !background;
    refreshing.value = background;
    error.value = "";
    let counted = background;
    function finishBackground() {
      if (!counted) return;
      counted = false;
      backgroundLoads.value = Math.max(0, backgroundLoads.value - 1);
    }
    if (background) {
      backgroundLoads.value++;
      current.signal.addEventListener("abort", finishBackground, { once: true });
    }
    try {
      const result = await load(current.signal);
      if (!current.signal.aborted && version === auth.version) {
        data.value = result;
        if (key) {
          snapshots.delete(key);
          snapshots.set(key, result);
          if (snapshots.size > 80) snapshots.delete(snapshots.keys().next().value!);
        }
      }
    } catch (cause) {
      if (!current.signal.aborted) {
        if (background)
          refreshNotice.value =
            "Не удалось обновить данные. Показана последняя загруженная версия.";
        else
          error.value = getApiErrorMessage(
            cause,
            "Не удалось загрузить данные. Попробуйте ещё раз.",
          );
      }
    } finally {
      finishBackground();
      current.signal.removeEventListener("abort", finishBackground);
      if (!current.signal.aborted) {
        loading.value = false;
        refreshing.value = false;
      }
    }
  }
  watch(
    [() => auth.version, ...sources],
    (value, previous) =>
      void refresh(!!previous?.length && value[0] !== previous[0]),
    { immediate: true },
  );
  onScopeDispose(() => controller?.abort());
  return { data, loading, refreshing, error, refresh: () => refresh() };
}
export function useAction() {
  const pending = ref(false);
  const error = ref("");
  const success = ref("");
  async function run(action: () => Promise<unknown>, message = "") {
    if (pending.value) return false;
    pending.value = true;
    error.value = "";
    success.value = "";
    try {
      await action();
      success.value = message;
      return true;
    } catch (cause) {
      error.value = getApiErrorMessage(
        cause,
        cause instanceof Error
          ? cause.message
          : "Не удалось выполнить действие",
      );
      return false;
    } finally {
      pending.value = false;
    }
  }
  return { pending, error, success, run };
}
