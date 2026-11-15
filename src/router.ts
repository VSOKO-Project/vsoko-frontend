import { createRouter, createWebHistory } from "vue-router";
import { auth, homePath, syncSession } from "./store/auth";
import Login from "./views/Login.vue";
import Workloads from "./views/Workloads.vue";
import Feedback from "./views/Feedback.vue";
import History from "./views/History.vue";
import Dashboard from "./views/Dashboard.vue";
import Catalog from "./views/Catalog.vue";
import Directory from "./views/Directory.vue";
import FeedbackDetail from "./views/FeedbackDetail.vue";
import Summaries from "./views/Summaries.vue";
import Reports from "./views/Reports.vue";
import Periods from "./views/Periods.vue";
import Import from "./views/Import.vue";
import Export from "./views/Export.vue";
import NotFound from "./views/NotFound.vue";
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: () => homePath() },
    { path: "/login", component: Login, meta: { public: true } },
    {
      path: "/change-password",
      component: Login,
      props: { changePassword: true },
    },
    { path: "/workloads", component: Workloads },
    { path: "/feedback/new", component: Feedback },
    { path: "/my-feedback", component: History },
    {
      path: "/feedback",
      redirect: { path: "/disciplines", query: { tab: "feedback" } },
      meta: { admin: true },
    },
    { path: "/dashboard", component: Dashboard, meta: { admin: true } },
    { path: "/criteria", component: Catalog, props: { kind: 'criteria' }, meta: { admin: true } },
    ...(["teachers", "disciplines"] as const).map(kind => ({
      path: `/${kind}`, component: Directory, props: { kind }, meta: { admin: true },
    })),
    { path: "/ratings", redirect: to => ({ path: to.query.kind === 'teachers' ? '/teachers' : '/disciplines', query: { tab: 'ratings' } }) },
    ...(["teachers", "disciplines"] as const).map(kind => ({
      path: `/${kind}/rating`,
      redirect: (to: { query: object }) => ({ path: `/${kind}`, query: { ...to.query, tab: 'ratings' } }),
    })),
    { path: "/feedback/:id", component: FeedbackDetail, meta: { admin: true } },
    { path: "/summaries", component: Summaries, meta: { admin: true } },
    { path: "/reports", component: Reports, meta: { admin: true } },
    { path: "/periods", component: Periods, meta: { admin: true } },
    { path: "/import", component: Import, meta: { admin: true } },
    { path: "/export", component: Export, meta: { admin: true } },
    { path: "/:pathMatch(.*)*", component: NotFound, meta: { public: true } },
  ],
});
router.beforeEach((to) => {
  syncSession();
  const home = homePath();
  if (to.path === "/login" && auth.session) return home;
  if (!to.meta.public && !auth.session) return "/login";
  if (auth.session?.data.mustChangePassword && to.path !== "/change-password")
    return "/change-password";
  if (to.path === "/change-password" && !auth.session?.data.mustChangePassword)
    return home;
  if (to.meta.admin && !auth.session?.data.isAdmin) return "/workloads";
});
