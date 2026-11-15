<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useMobileNavigation } from "./composables/mobile-navigation";
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
const { open, mobile, sidebar } = useMobileNavigation();
const loggingOut = ref(false);
const showRefresh = ref(false);
watch(() => backgroundLoads.value > 0, (active, _old, cleanup) => {
  if (!active) {
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
        ["/dashboard", "Сводка"],
        ["/teachers", "Преподаватели"],
        ["/disciplines", "Дисциплины"],
        ["/criteria", "Критерии"],
        ["/summaries", "Анализ отзывов"],
        ["/reports", "Отчёты"],
        ["/periods", "Периоды"],
        ["/import", "Импорт"],
        ["/export", "Экспорт"],
      ]
    : [
        ["/workloads", "Оценка обучения"],
        ["/my-feedback", "Мои оценки"],
      ],
);
watch(
  () => route.fullPath,
  () => {
    open.value = false;
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
watch(
  () => route.path,
  () => {
    document.title = `VSOKO — ${links.value.find((link) => link[0] === route.path)?.[1] || "Качество образования"}`;
  },
  { immediate: true },
);
// A period filter should refresh data without destroying the page and its controls.
const pageKey = computed(() => JSON.stringify([
  route.path, route.query.tab, route.query.targetId, route.query.workloadId,
  route.query.edit, route.query.filter, auth.version,
]));
</script>
<template>
  <RouterView v-if="standalone" :key="route.fullPath" />
  <div v-else class="app-layout">
    <a class="skip-link" href="#main-content">К содержимому</a
    ><button
      v-if="mobile && open"
      tabindex="-1"
      class="sidebar-overlay"
      aria-label="Закрыть меню по фону"
      @click="open = false"
    />
    <aside
      id="app-navigation"
      :ref="(element) => sidebar = element as HTMLElement"
      class="sidebar"
      :class="{ 'sidebar--open': open }"
      :inert="mobile && !open"
      :aria-hidden="mobile && !open ? true : undefined"
      :role="mobile && open ? 'dialog' : undefined"
      :aria-modal="mobile && open ? true : undefined"
      aria-label="Меню навигации"
    >
      <button v-if="mobile" type="button" class="sidebar__close icon-button" aria-label="Закрыть меню" @click="open = false">×</button>
      <RouterLink class="sidebar__logo" :to="homePath()"><Brand /></RouterLink>
      <nav class="sidebar__nav" aria-label="Основная навигация">
        <RouterLink
          v-for="link in links"
          :key="link[0]"
          :to="link[0]!"
          class="sidebar__link"
          :class="{ 'sidebar__link--active': link[0] === route.path }"
          exact-active-class="sidebar__link--active"
          >{{ link[1] }}</RouterLink
        >
      </nav>
      <div class="sidebar__settings"><ThemeSelect /></div>
    </aside>
    <div class="app-layout__main" :inert="mobile && open">
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
            aria-controls="app-navigation"
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
        <RouterView :key="pageKey" />
      </main>
    </div>
  </div>
  <ConfirmDialog />
</template>
