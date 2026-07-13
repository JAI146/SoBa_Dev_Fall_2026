export function formatTransferDate(value: string | null | undefined) {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString();
}

export function formatTransferAmount(value: number | null | undefined) {
  if (value == null) return "—";
  return `$${value.toFixed(2)}`;
}
