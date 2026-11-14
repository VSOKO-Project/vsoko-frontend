<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
let saved = "system";
try {
  saved = localStorage.getItem("vsoko.theme") || "system";
} catch {
  /* Optional storage. */
}
const preference = ref(saved);
const media = window.matchMedia("(prefers-color-scheme: dark)");
const systemDark = ref(media.matches);
const dark = computed(
  () =>
    preference.value === "dark" ||
    (preference.value === "system" && systemDark.value),
);
function followSystem() {
  systemDark.value = media.matches;
}
watch(
  dark,
  (value) => {
    document.documentElement.dataset.theme = value ? "dark" : "light";
    document.documentElement.style.colorScheme = value ? "dark" : "light";
  },
  { immediate: true },
);
function toggle() {
  preference.value = dark.value ? "light" : "dark";
  try {
    localStorage.setItem("vsoko.theme", preference.value);
  } catch {
    /* Theme remains usable. */
  }
}
onMounted(() => media.addEventListener("change", followSystem));
onUnmounted(() => media.removeEventListener("change", followSystem));
</script>
<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="dark ? 'Включить светлую тему' : 'Включить тёмную тему'"
    :title="dark ? 'Светлая тема' : 'Тёмная тема'"
    @click="toggle"
  >
    <svg
      v-if="dark"
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"
      /></svg
    ><svg
      v-else
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M20.4 15.4A8.5 8.5 0 0 1 8.6 3.6a8.5 8.5 0 1 0 11.8 11.8Z" />
    </svg>
  </button>
</template>
