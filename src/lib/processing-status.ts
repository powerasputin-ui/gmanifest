/**
 * Long-running document operations (OCR, table recognition, LLM extraction)
 * run as a single blocking HTTP request — the backend has no way to report
 * real incremental progress. Rather than a spinner with no context (which
 * reads as "frozen" once it passes ~20-30s), this gives an honest sense of
 * motion: a percentage that asymptotically approaches but never reaches
 * 100% while waiting (so it never looks stuck), plus a staged status
 * message keyed to elapsed time so the user knows roughly what phase a
 * scan/table-heavy document is likely in.
 */

const PROGRESS_TIME_CONSTANT_SEC = 40;
const PROGRESS_CEILING = 92;

/** Asymptotic fake-progress percentage — approaches PROGRESS_CEILING but
 * never reaches it while still running; caller sets 100 on completion. */
export function fakeProgressPercent(elapsedSec: number): number {
  return PROGRESS_CEILING * (1 - Math.exp(-elapsedSec / PROGRESS_TIME_CONSTANT_SEC));
}

const STAGES: Array<{ afterSec: number; message: string }> = [
  { afterSec: 0, message: 'Читаем файл…' },
  { afterSec: 5, message: 'Распознаём текст…' },
  { afterSec: 25, message: 'Определяем структуру и таблицы…' },
  { afterSec: 70, message: 'Сложный документ — сканы и плотные таблицы могут занимать несколько минут…' },
];

export function processingStageMessage(elapsedSec: number): string {
  let message = STAGES[0].message;
  for (const stage of STAGES) {
    if (elapsedSec >= stage.afterSec) message = stage.message;
  }
  return message;
}

export function formatElapsed(elapsedSec: number): string {
  if (elapsedSec < 60) return `${elapsedSec} сек`;
  const min = Math.floor(elapsedSec / 60);
  const sec = elapsedSec % 60;
  return `${min} мин ${sec} сек`;
}
