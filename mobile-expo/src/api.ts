import * as SecureStore from 'expo-secure-store';
import type { AuthUser, Catalog, DraftImage, DraftResponse, ClothingForm, ListedProduct } from './types';

// A URL é definida no .env para apontar sempre ao serviço público atual da Zeabur.
// Não há fallback: usar uma URL antiga poderia gravar dados no backend errado.
const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'amoras_producao_token';
const USER_KEY = 'amoras_producao_user';

type StoredSession = { token: string; user: AuthUser };

export async function getSession(): Promise<StoredSession | null> {
  const [token, rawUser] = await Promise.all([SecureStore.getItemAsync(TOKEN_KEY), SecureStore.getItemAsync(USER_KEY)]);
  if (!token || !rawUser) return null;
  try { return { token, user: JSON.parse(rawUser) as AuthUser }; } catch { return null; }
}

export async function saveSession(session: StoredSession) {
  await Promise.all([SecureStore.setItemAsync(TOKEN_KEY, session.token), SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user))]);
}

export async function clearSession() {
  await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USER_KEY)]);
}

async function request<T>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) {
    throw new Error('API não configurada. Defina EXPO_PUBLIC_API_URL no arquivo .env com a URL do serviço Zeabur seguida de /api.');
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
  });
  const json = await response.json().catch(() => ({})) as T & { error?: string; message?: string };
  if (!response.ok) throw new Error(json.message || json.error || 'Não foi possível concluir a solicitação.');
  return json;
}

export async function login(email: string, password: string) {
  return request<StoredSession>('/auth/login', undefined, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }),
  });
}

export async function loadCatalog(token: string): Promise<Catalog> {
  const [categories, subcategories, patterns, sizes] = await Promise.all([
    request<Catalog['categories']>('/categories', token), request<Catalog['subcategories']>('/subcategories', token),
    request<Catalog['patterns']>('/patterns', token), request<Catalog['sizes']>('/sizes?active=true', token),
  ]);
  return { categories, subcategories, patterns, sizes };
}

export async function listProducts(token: string): Promise<ListedProduct[]> {
  const response = await request<{ data: ListedProduct[] }>('/products?limit=100&isDraft=false', token);
  return response.data;
}

export async function generateDraft(token: string, photos: string[]): Promise<DraftResponse> {
  const form = new FormData();
  photos.forEach((uri, index) => form.append('images', { uri, type: 'image/jpeg', name: `roupa-${Date.now()}-${index}.jpg` } as unknown as Blob));
  return request<DraftResponse>('/production/draft', token, { method: 'POST', body: form });
}

export async function publishDraft(token: string, form: ClothingForm, images: DraftImage[]) {
  return request<{ product: { id: string; barcode: string }; created: { category: boolean; subcategory: boolean; pattern: boolean }; mergedIntoExisting: boolean }>('/production/publish', token, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: form.name, description: form.description, category: { id: form.categoryId, name: form.categoryName },
      subcategory: form.subcategoryName ? { id: form.subcategoryId, name: form.subcategoryName } : null,
      pattern: { id: form.patternId, name: form.patternName }, sizeId: form.sizeId,
      price: Number(form.price.replace(',', '.')), stock: Number(form.stock), initialLocation: form.initialLocation, images,
    }),
  });
}
