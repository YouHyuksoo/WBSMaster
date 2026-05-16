export function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toProgressTaskDateRange(targetDate: string, today = new Date()) {
  const todayInput = formatDateInput(today);
  return {
    startDate: targetDate < todayInput ? targetDate : todayInput,
    endDate: targetDate,
  };
}

export function getTargetDateDiffDays(targetDate: string, today = new Date()): number {
  const target = parseDateInputAsUtc(targetDate);
  const base = parseDateInputAsUtc(formatDateInput(today));
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((target.getTime() - base.getTime()) / msPerDay);
}

export function getTargetDateDiffLabel(targetDate: string, today = new Date()): string {
  const diff = getTargetDateDiffDays(targetDate, today);
  if (diff === 0) return "D-Day";
  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
}

function parseDateInputAsUtc(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
