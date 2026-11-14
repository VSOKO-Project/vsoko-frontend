import { ref, shallowRef, watch, onScopeDispose, type WatchSource } from "vue";
import { auth } from "../store/auth";
import { getApiErrorMessage } from "../api/errors";
export function useResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  sources: WatchSource[] = [],
) {
  const data = shallowRef<T>();
  const loading = ref(false);
  const error = ref("");
  let controller: AbortController | undefined;
  async function refresh() {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    loading.value = true;
    error.value = "";
    data.value = undefined;
    try {
      const result = await load(current.signal);
      if (!current.signal.aborted) data.value = result;
    } catch (cause) {
      if (!current.signal.aborted)
        error.value = getApiErrorMessage(
          cause,
          "Не удалось загрузить данные. Попробуйте ещё раз.",
        );
    } finally {
      if (!current.signal.aborted) loading.value = false;
    }
  }
  watch([() => auth.version, ...sources], () => void refresh(), {
    immediate: true,
  });
  onScopeDispose(() => controller?.abort());
  return { data, loading, error, refresh };
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
