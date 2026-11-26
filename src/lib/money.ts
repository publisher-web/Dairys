export function formatYen(amount: number): string {
  return `${amount > 0 ? '収入' : '支出'} ${Math.abs(amount).toLocaleString('ja-JP')}円`
}
