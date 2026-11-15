<script setup lang="ts">
import { useScrollLock } from "../composables/scroll-lock";
import { ref, watch, nextTick, useId } from "vue";
const props = defineProps<{ open: boolean; title: string }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement>();
const titleId = useId();
useScrollLock(() => props.open);
watch(
  () => props.open,
  async (open) => {
    await nextTick();
    if (props.open !== open) return;
    if (open) {
      if (!dialog.value?.open) dialog.value?.showModal();
    } else dialog.value?.close();
  },
  { immediate: true },
);
function backdrop(event: MouseEvent) {
  if (event.target === dialog.value) {
    const box = dialog.value.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      emit("close");
  }
}
</script>
<template>
  <dialog
    ref="dialog"
    class="vue-modal"
    :aria-labelledby="titleId"
    @cancel.prevent="emit('close')"
    @click="backdrop"
  >
    <div class="modal__header">
      <h2 :id="titleId">{{ title }}</h2>
      <button
        type="button"
        aria-label="Закрыть окно"
        class="icon-button"
        @click="emit('close')"
      >
        ×
      </button>
    </div>
    <slot />
  </dialog>
</template>

<style scoped>
.vue-modal {
  margin: auto;
  width: min(640px, calc(100% - 32px));
  max-height: 85dvh;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  overflow: auto;
  border-radius: 10px;
  padding: 24px;
  max-width: 560px;
}
.vue-modal::backdrop {
  background: #0c202980;
}
.modal__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 24px;
}
.modal__header h2 {
  font-family: var(--font-body);
  font-size: 20px;
  font-weight: 600;
}
.vue-modal :deep(.btn) {
  margin-top: 16px;
}
</style>
