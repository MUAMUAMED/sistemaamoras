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

export const getFiscalPdfFileName = (customerName?: string) => {
  const fullName = String(customerName || '')
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*]/g, '')
    .toUpperCase();

  return `NF ${fullName || 'CLIENTE'} - AMORAS CAPITAL`;
};
