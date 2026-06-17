export const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatMoney(value: number) {
  return moneyFormatter.format(value);
}

export function toMoneyNumber(value: unknown) {
  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return 0;
  }

  return amount;
}

export function sumMoney<T>(
  items: T[],
  selector: (item: T) => number,
) {
  return items.reduce((sum, item) => sum + toMoneyNumber(selector(item)), 0);
}
