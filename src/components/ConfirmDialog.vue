<script setup lang="ts">
import { watch, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import Modal from "./Modal.vue";
import { confirmation, finishConfirmation } from "../composables/confirmation";
import { auth } from "../store/auth";
const route = useRoute();
watch([() => auth.version, () => route.fullPath], () =>
  finishConfirmation(false),
);
onUnmounted(() => finishConfirmation(false));
</script>
<template>
  <Modal
    :open="!!confirmation"
    :title="confirmation?.title || 'Подтверждение'"
    @close="finishConfirmation(false)"
    ><template v-if="confirmation"
      ><p class="confirmation-description">{{ confirmation.description }}</p>
      <div class="confirmation-actions">
        <button class="btn btn--secondary" @click="finishConfirmation(false)">
          Отмена</button
        ><button
          class="btn"
          :class="confirmation.danger ? 'btn--danger' : 'btn--primary'"
          @click="finishConfirmation(true)"
        >
          {{ confirmation.confirmText }}
        </button>
      </div></template
    ></Modal
  >
</template>
