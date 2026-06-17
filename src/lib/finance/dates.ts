export function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonthValue() {
  return todayValue().slice(0, 7);
}

export function getMonthLabel(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);

  if (!year || !month) {
    return "este mes";
  }

  return new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export function isSameMonth(dateValue: string | null, monthValue: string) {
  if (!dateValue) {
    return false;
  }

  return dateValue.slice(0, 7) === monthValue;
}

export function getProjectedDateInMonth(
  originalDate: string | null,
  monthValue: string,
) {
  const [year, month] = monthValue.split("-").map(Number);
  const originalDay = originalDate ? Number(originalDate.slice(8, 10)) : 1;
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const safeDay = Math.min(originalDay || 1, lastDayOfMonth);

  return `${monthValue}-${String(safeDay).padStart(2, "0")}`;
}

export function shiftMonth(monthValue: string, offset: number) {
  const [year, month] = monthValue.split("-").map(Number);

  if (!year || !month) {
    return currentMonthValue();
  }

  const date = new Date(year, month - 1 + offset, 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");

  return `${nextYear}-${nextMonth}`;
}
