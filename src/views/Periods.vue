<script setup lang="ts">
import PageHeader from "../components/PageHeader.vue";
import { getPeriods, setPeriodFeedback } from "../api/periods";
import { useResource, useAction } from "../composables/resource";
import type { PeriodDto } from "../types";
import { confirmAction } from "../composables/confirmation";
import LoadState from "../components/LoadState.vue";
const { data, loading, error, refresh } = useResource((signal) =>
  getPeriods(signal),
);
const action = useAction();
async function toggle(period: PeriodDto, event: Event) {
  (event.target as HTMLInputElement).checked = period.isFeedbackOpen;
  const opened = data.value?.find(
    (p) => p.isFeedbackOpen && p.id !== period.id,
  );
  const message = period.isFeedbackOpen
    ? `Студенты не смогут оставлять и изменять отзывы за «${period.title}».`
    : `Сбор отзывов за «${period.title}» будет открыт.${opened ? ` Сбор за «${opened.title}» будет закрыт.` : ""}`;
  if (
    (await confirmAction({
      title: period.isFeedbackOpen
        ? "Закрыть сбор отзывов?"
        : "Открыть сбор отзывов?",
      description: message,
      confirmText: period.isFeedbackOpen ? "Закрыть сбор" : "Открыть сбор",
      danger: period.isFeedbackOpen,
    })) &&
    (await action.run(
      () => setPeriodFeedback(period.id, !period.isFeedbackOpen),
      "Состояние периода обновлено",
    ))
  )
    await refresh();
}
</script>
<template>
  <PageHeader title="Учебные периоды">Сбор отзывов открыт только у одного семестра. Новые периоды создаются при импорте.</PageHeader>
  <p v-if="action.error.value" role="alert" class="error-text">
    {{ action.error.value }}
  </p>
  <p v-if="action.success.value" class="notice" role="status">
    {{ action.success.value }}
  </p>
  <LoadState
    skeleton="table"
    :loading="loading"
    :error="error"
    :empty="!data?.length"
    @retry="refresh"
    ><div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Период</th>
            <th>Нагрузок</th>
            <th>Отзывов</th>
            <th>Сбор отзывов</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in data" :key="p.id">
            <td>{{ p.title }}</td>
            <td>{{ p.workloadCount }}</td>
            <td>{{ p.feedbackCount }}</td>
            <td>
              <label class="switch"
                ><input
                  type="checkbox"
                  :checked="p.isFeedbackOpen"
                  :disabled="action.pending.value"
                  :aria-label="`Сбор отзывов: ${p.title}`"
                  @change="toggle(p, $event)"
                /><span class="switch__track" />{{
                  p.isFeedbackOpen ? "Открыт" : "Закрыт"
                }}</label
              >
            </td>
          </tr>
        </tbody>
      </table>
    </div></LoadState
  >
</template>
