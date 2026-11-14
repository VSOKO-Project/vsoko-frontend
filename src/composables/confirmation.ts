import { shallowRef } from "vue";
export interface Confirmation {
  title: string;
  description: string;
  confirmText: string;
  danger?: boolean;
}
export const confirmation = shallowRef<Confirmation>();
let resolveCurrent: ((approved: boolean) => void) | undefined;
export function confirmAction(options: Confirmation): Promise<boolean> {
  if (resolveCurrent) return Promise.resolve(false);
  confirmation.value = options;
  return new Promise((resolve) => {
    resolveCurrent = resolve;
  });
}
export function finishConfirmation(approved: boolean) {
  const resolve = resolveCurrent;
  resolveCurrent = undefined;
  confirmation.value = undefined;
  resolve?.(approved);
}
