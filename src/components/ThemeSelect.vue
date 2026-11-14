<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
let saved = "system";
try {
  saved = localStorage.getItem("vsoko.theme") || "system";
} catch {
  /* Optional storage. */
}
const theme = ref(["light", "dark"].includes(saved) ? saved : "system");
const media = window.matchMedia("(prefers-color-scheme: dark)");
function apply() {
  document.documentElement.dataset.theme =
    theme.value === "system" ? (media.matches ? "dark" : "light") : theme.value;
}
watch(
  theme,
  () => {
    apply();
    try {
      localStorage.setItem("vsoko.theme", theme.value);
    } catch {
      /* Theme remains usable. */
    }
  },
  { immediate: true },
);
onMounted(() => media.addEventListener("change", apply));
onUnmounted(() => media.removeEventListener("change", apply));
</script>
<template>
  <select v-model="theme" class="theme-select" aria-label="Тема оформления">
    <option value="system">Как в системе</option>
    <option value="light">Светлая тема</option>
    <option value="dark">Тёмная тема</option>
  </select>
</template>
