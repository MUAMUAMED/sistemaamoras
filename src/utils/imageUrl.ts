export const getImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  const apiUrl =
    import.meta.env.REACT_APP_API_URL ||
    import.meta.env.VITE_API_URL ||
    (typeof process !== 'undefined' ? process.env.REACT_APP_API_URL : undefined);

  if (apiUrl) {
    const baseUrl = apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    const imagePath = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${imagePath}`;
  }

  return url.startsWith('/') ? url : `/${url}`;
};
