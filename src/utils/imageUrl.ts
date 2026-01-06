/**
 * Helper para construir URLs de imagens
 * Usa variável de ambiente ou URL relativa
 */
export const getImageUrl = (url: string | null | undefined): string => {
  if (!url) {
    console.warn('⚠️ [getImageUrl] URL vazia ou undefined');
    return '';
  }
  
  // Se já é uma URL completa (http/https), retorna como está
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.log('✅ [getImageUrl] URL completa detectada:', url);
    return url;
  }
  
  // Obter URL base da API (mesma lógica do api.ts)
  const apiUrl = 
    import.meta.env.REACT_APP_API_URL || 
    import.meta.env.VITE_API_URL || 
    process.env.REACT_APP_API_URL;
  
  // Se temos uma URL de API configurada, construir URL completa
  if (apiUrl) {
    // Remover /api do final se existir (imagens são servidas na raiz do backend)
    // Também remover barra final se existir
    let baseUrl = apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    // Garantir que a URL da imagem começa com /
    const imagePath = url.startsWith('/') ? url : `/${url}`;
    const finalUrl = `${baseUrl}${imagePath}`;
    console.log('🔗 [getImageUrl] URL construída:', { 
      original: url, 
      apiUrl, 
      baseUrl, 
      imagePath,
      finalUrl 
    });
    return finalUrl;
  }
  
  // Se não temos URL de API configurada, usar URL relativa
  // Isso funciona se frontend e backend estão no mesmo domínio
  const relativeUrl = url.startsWith('/') ? url : `/${url}`;
  console.log('📁 [getImageUrl] Usando URL relativa (sem API_URL configurada):', relativeUrl);
  return relativeUrl;
};

