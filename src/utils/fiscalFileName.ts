export const getFiscalFileName = (customerName?: string) => {
  const firstName = String(customerName || '')
    .trim()
    .split(/\s+/)[0]
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*]/g, '')
    .toUpperCase();

  return `NF ${firstName || 'CLIENTE'} - AMORAS CAPITAL`;
};
