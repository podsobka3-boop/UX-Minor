import type { Settings } from './storage';

const PROGRESS = [
  (g: string) => `Делаешь «${g}»?`,
  (g: string) => `«${g}» — в процессе?`,
  (g: string) => `Как там «${g}»?`,
  (g: string) => `Не забыл про «${g}»?`,
];

// Каждая третья (примерно) тыкалка спрашивает, сделано ли.
export function pickNudge(goal: string): { message: string; kind: 'progress' | 'done' } {
  if (Math.random() < 0.3) return { message: `Сделал «${goal}»?`, kind: 'done' };
  const tpl = PROGRESS[Math.floor(Math.random() * PROGRESS.length)];
  return { message: tpl(goal), kind: 'progress' };
}

// Случайная задержка до следующего вопроса, в миллисекундах.
export function nextDelayMs(s: Settings) {
  if (s.demo) return (5 + Math.random() * 10) * 1000;
  const min = s.minIntervalMin * 60_000;
  const max = s.maxIntervalMin * 60_000;
  return min + Math.random() * (max - min);
}

export function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function plural(n: number, one: string, few: string, many: string) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
  return many;
}

export function minutesText(ms: number) {
  const min = Math.max(1, Math.round(ms / 60_000));
  return `${min} ${plural(min, 'минута', 'минуты', 'минут')}`;
}

export function timesText(n: number) {
  return `${n} ${plural(n, 'раз', 'раза', 'раз')}`;
}
