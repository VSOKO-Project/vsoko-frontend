import { computed, ref } from "vue";
import type { PeriodFilterParams } from "../types";
export const periodValue = ref("");
export const periodParams = computed<PeriodFilterParams>(() =>
  periodValue.value.startsWith("p:")
    ? { PeriodId: periodValue.value.slice(2) }
    : periodValue.value.startsWith("y:")
      ? { StartYear: Number(periodValue.value.slice(2)) }
      : {},
);
