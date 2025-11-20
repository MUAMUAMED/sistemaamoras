/**
 * Helper para construir URLs de imagens
 * Usa variável de ambiente ou URL relativa
 */
export const getImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  // Se já é uma URL completa (http/https), retorna como está
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Se começa com /, usa URL relativa (mesmo domínio)
  if (url.startsWith('/')) {
    return url;
  }
  
  // Caso contrário, constrói URL baseada na API URL
  const apiUrl = process.env.REACT_APP_API_URL || '';
  if (apiUrl) {
    // Remove /api do final se existir
    const baseUrl = apiUrl.replace(/\/api\/?$/, '');
    return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
  }
  
  // Fallback: URL relativa
  return url.startsWith('/') ? url : `/${url}`;
};

