import { create } from 'zustand';
import type { PeriodFilterParams } from '../types';

/**
 * Выбранный период для админских страниц: '' — все периоды,
 * 'p:<id>' — семестр, 'y:<startYear>' — учебный год целиком.
 * Хранится в zustand, чтобы выбор не сбрасывался при переходах.
 */
interface PeriodFilterState {
  value: string;
  setValue: (value: string) => void;
}

export const usePeriodFilterStore = create<PeriodFilterState>((set) => ({
  value: '',
  setValue: (value) => set({ value }),
}));

export function toPeriodParams(value: string): PeriodFilterParams {
  if (value.startsWith('p:')) return { PeriodId: value.slice(2) };
  if (value.startsWith('y:')) return { StartYear: Number(value.slice(2)) };
  return {};
}

export function usePeriodFilter(): PeriodFilterParams {
  const value = usePeriodFilterStore((s) => s.value);
  return toPeriodParams(value);
}
