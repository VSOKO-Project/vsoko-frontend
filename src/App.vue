<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { router } from "./router";
import { auth, homePath } from "./store/auth";
import { backgroundLoads, refreshNotice } from "./composables/resource";
import { accountLogin } from "./utils/account";
import { logout } from "./api/auth";
import ConfirmDialog from "./components/ConfirmDialog.vue";
import Brand from "./components/Brand.vue";
import ThemeSelect from "./components/ThemeSelect.vue";
const route = useRoute();
const open = ref(false);
const loggingOut = ref(false);
const showRefresh = ref(false);
watch(backgroundLoads, (count, _old, cleanup) => {
  if (!count) {
    showRefresh.value = false;
    return;
  }
  const timer = setTimeout(() => {
    showRefresh.value = true;
  }, 160);
  cleanup(() => clearTimeout(timer));
});
const userLogin = computed(() =>
  accountLogin(
    auth.session?.data.accessToken || "",
    auth.session?.data.login || "",
  ),
);
const isAdmin = computed(() => !!auth.session?.data.isAdmin);
const standalone = computed(
  () => route.meta.public || route.path === "/change-password",
);
const links = computed(() =>
  isAdmin.value
    ? [
        ["/dashboard", "Обзор результатов"],
        ["/teachers/rating", "Оценки преподавателей"],
        ["/disciplines/rating", "Оценки дисциплин"],
        ["/feedback", "Отзывы"],
        ["/teachers", "Преподаватели"],
        ["/disciplines", "Дисциплины"],
        ["/criteria", "Критерии"],
        ["/summaries", "Сводки ИИ"],
        ["/reports", "Отчёты"],
        ["/periods", "Периоды"],
        ["/import", "Импорт"],
      ]
    : [
        ["/workloads", "Оценить занятия"],
        ["/my-feedback", "Мои оценки"],
      ],
);
watch(
  () => route.fullPath,
  () => {
    open.value = false;
    document.title = `VSOKO — ${links.value.find((l) => l[0] === route.path)?.[1] || "Качество образования"}`;
  },
);
watch(
  () => auth.version,
  () => {
    const home = homePath();
    if (
      !auth.session ||
      auth.session.data.mustChangePassword ||
      route.path === "/login" ||
      route.path === "/change-password" ||
      (route.meta.admin && !isAdmin.value)
    )
      void router.replace(home);
  },
);
async function exit() {
  loggingOut.value = true;
  try {
    await logout();
  } catch {
    /* Session is cleared before network request. */
  } finally {
    loggingOut.value = false;
  }
}
function escape(event: KeyboardEvent) {
  if (event.key === "Escape") open.value = false;
}
onMounted(() => window.addEventListener("keydown", escape));
onUnmounted(() => window.removeEventListener("keydown", escape));
</script>
<template>
  <RouterView v-if="standalone" :key="route.fullPath" />
  <div v-else class="app-layout">
    <a class="skip-link" href="#main-content">К содержимому</a
    ><button
      v-if="open"
      class="sidebar-overlay"
      aria-label="Закрыть меню"
      @click="open = false"
    />
    <aside class="sidebar" :class="{ 'sidebar--open': open }">
      <RouterLink class="sidebar__logo" :to="homePath()"><Brand /></RouterLink>
      <nav class="sidebar__nav" aria-label="Основная навигация">
        <RouterLink
          v-for="link in links"
          :key="link[0]"
          :to="link[0]!"
          class="sidebar__link"
          exact-active-class="sidebar__link--active"
          >{{ link[1] }}</RouterLink
        >
      </nav>
      <div class="sidebar__settings"><ThemeSelect /></div>
    </aside>
    <div class="app-layout__main">
      <header class="header">
        <div
          v-if="showRefresh"
          class="refresh-progress"
          role="status"
          aria-label="Обновление данных"
        />
        <div class="header__left">
          <button
            class="header__menu-btn"
            :aria-expanded="open"
            aria-label="Открыть меню"
            @click="open = !open"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        <div class="header__actions">
          <div class="account-info">
            <span class="account-login">{{
              userLogin || "Пользователь"
            }}</span><span class="account-role">{{
              isAdmin ? "Администратор" : "Студент"
            }}</span>
          </div>
          <button class="header__logout" :disabled="loggingOut" @click="exit">
            Выйти
          </button>
        </div>
      </header>
      <main
        id="main-content"
        class="app-layout__content"
        tabindex="-1"
        :aria-busy="backgroundLoads > 0"
      >
        <div v-if="refreshNotice" class="update-notice" role="status">
          {{ refreshNotice
          }}<button
            class="text-link"
            aria-label="Закрыть сообщение об обновлении"
            @click="refreshNotice = ''"
          >
            Закрыть
          </button>
        </div>
        <RouterView :key="`${route.fullPath}:${auth.version}`" />
      </main>
    </div>
  </div>
  <ConfirmDialog />
</template>
