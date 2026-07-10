const IMAGE_CACHE_BUSTER = Date.now().toString();

const withImageCacheBuster = (value: string) => {
  if (!value.includes('/uploads/products/')) return value;
  const separator = value.includes('?') ? '&' : '?';
  return `${value}${separator}v=${IMAGE_CACHE_BUSTER}`;
};

export const getImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return withImageCacheBuster(url);
  }

  const apiUrl =
    import.meta.env.REACT_APP_API_URL ||
    import.meta.env.VITE_API_URL ||
    process.env.REACT_APP_API_URL;

  if (apiUrl) {
    const baseUrl = apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    const imagePath = url.startsWith('/') ? url : `/${url}`;
    return withImageCacheBuster(`${baseUrl}${imagePath}`);
  }

  const relativeUrl = url.startsWith('/') ? url : `/${url}`;
  return withImageCacheBuster(relativeUrl);
};
