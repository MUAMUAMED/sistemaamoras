/**
 * Helper para construir URLs de imagens
 * Usa variável de ambiente ou URL relativa
 */
export const getImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  // Debug log para rastrear URLs
  // console.log('🖼️ [IMAGE DEBUG] Processando URL:', url);
  
  // Se já é uma URL completa (http/https), retorna como está
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // console.log('✅ [IMAGE DEBUG] URL absoluta mantida:', url);
    return url;
  }
  
  // Se começa com /, usa URL relativa (mesmo domínio)
  if (url.startsWith('/')) {
    // console.log('✅ [IMAGE DEBUG] URL relativa mantida:', url);
    return url;
  }
  
  // Caso contrário, constrói URL baseada na API URL
  const apiUrl = import.meta.env.REACT_APP_API_URL || import.meta.env.VITE_API_URL || process.env.REACT_APP_API_URL || '';
  if (apiUrl) {
    // Remove /api do final se existir
    const baseUrl = apiUrl.replace(/\/api\/?$/, '');
    const finalUrl = `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
    // console.log('✅ [IMAGE DEBUG] URL construída com API URL:', finalUrl);
    return finalUrl;
  }
  
  // Fallback: URL relativa
  const fallbackUrl = url.startsWith('/') ? url : `/${url}`;
  // console.log('⚠️ [IMAGE DEBUG] Fallback para URL relativa:', fallbackUrl);
  return fallbackUrl;
};
