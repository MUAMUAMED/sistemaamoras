/** Resolve only the supported sale families configured in Central Fiscal. */
export function resolveDefaultCfop(configured: string | undefined, destination: number, taxpayerIndicator?: string): string {
  const code = String(configured || '').replace(/\D/g, '');
  const production = ['5101', '6101', '6107'].includes(code);
  const resale = ['5102', '6102', '6108'].includes(code);
  if (!production && !resale) return '';
  if (destination === 1) return production ? '5101' : '5102';
  if (destination !== 2 || !['1', '2', '9'].includes(taxpayerIndicator || '')) return '';
  return taxpayerIndicator === '9' ? (production ? '6107' : '6108') : (production ? '6101' : '6102');
}
