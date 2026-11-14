import { afterEach, expect, it } from "vitest";
import {
  confirmAction,
  confirmation,
  finishConfirmation,
} from "../src/composables/confirmation";
const options = {
  title: "Удалить отзыв?",
  description: "Это действие удалит отзыв.",
  confirmText: "Удалить",
  danger: true,
};
afterEach(() => finishConfirmation(false));
it("waits for an explicit confirmation before resolving", async () => {
  const pending = confirmAction(options);
  expect(confirmation.value?.title).toBe(options.title);
  finishConfirmation(true);
  expect(await pending).toBe(true);
  expect(confirmation.value).toBeUndefined();
});
it("cancels an action on dismissal", async () => {
  const pending = confirmAction(options);
  finishConfirmation(false);
  expect(await pending).toBe(false);
});
it("does not replace an already-open confirmation", async () => {
  const first = confirmAction(options);
  expect(await confirmAction({ ...options, title: "Другой запрос" })).toBe(
    false,
  );
  expect(confirmation.value?.title).toBe(options.title);
  finishConfirmation(true);
  expect(await first).toBe(true);
});
