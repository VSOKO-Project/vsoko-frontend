<script setup lang="ts">
import { ref, watch, nextTick, useId } from "vue";
const props = defineProps<{ open: boolean; title: string }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement>();
const titleId = useId();
watch(
  () => props.open,
  async (open) => {
    await nextTick();
    if (props.open !== open) return;
    if (open) dialog.value?.showModal();
    else dialog.value?.close();
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
