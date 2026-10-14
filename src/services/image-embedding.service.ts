import { readFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export const IMAGE_EMBEDDING_DIMENSIONS = 768;

export type ImageInput = { path?: string; data?: Buffer; url?: string; mimeType: string };

type EmbeddingProvider = 'google' | 'openrouter';
function embeddingProvider(): EmbeddingProvider {
  const value = (process.env.IMAGE_EMBEDDING_PROVIDER || 'openrouter').trim().toLowerCase();
  if (value !== 'google' && value !== 'openrouter') throw configuredError('IMAGE_EMBEDDING_PROVIDER deve ser google ou openrouter.');
  return value;
}

/** Mantém o mesmo identificador no pgvector ao trocar apenas o transporte. */
export function imageEmbeddingModel(): string {
  const model = (process.env.IMAGE_EMBEDDING_MODEL || process.env.OPENROUTER_EMBEDDING_MODEL || 'google/gemini-embedding-2').trim().replace(/^models\//, '');
  return embeddingProvider() === 'google' && !model.startsWith('google/') ? `google/${model}` : model;
}

function embeddingKey(): string {
  // Chave dedicada: não modifica a seleção de IA do emissor fiscal.
  return embeddingProvider() === 'google'
    ? (process.env.IMAGE_EMBEDDING_API_KEY || process.env.GEMINI_API_KEY || '').trim()
    : (process.env.OPENROUTER_API_KEY || '').trim();
}

export function hasImageEmbeddingCredentials(): boolean { return Boolean(embeddingKey()); }

function configuredError(message: string): Error {
  return new Error(`Busca visual não configurada: ${message}`);
}

function normalizeMimeType(value: string): string {
  if (value === 'image/jpg') return 'image/jpeg';
  if (value === 'image/jpeg' || value === 'image/png' || value === 'image/webp') return value;
  const extension = path.extname(value).toLowerCase();
  return extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
}

/** Cria um vetor de imagem no mesmo espaço usado pelo catálogo. */
export async function embedImages(inputs: ImageInput[]): Promise<number[]> {
  const provider = embeddingProvider();
  const apiKey = embeddingKey();
  if (!apiKey) throw configuredError(provider === 'google' ? 'defina IMAGE_EMBEDDING_API_KEY no backend.' : 'defina OPENROUTER_API_KEY no backend.');
  const model = imageEmbeddingModel();
  if (provider === 'google' && !/^google\/[a-zA-Z0-9._-]+$/.test(model)) throw configuredError('informe um modelo de embeddings Google válido.');
  if (!inputs.length || inputs.length > 6) throw new Error('Envie entre uma e seis imagens para a busca visual.');
  const images = await Promise.all(inputs.map(async (input) => {
    let data = input.data || (input.path ? await readFile(input.path).catch(() => null) : null);
    if (!data && input.url) {
      try {
        let fetchUrl = input.url;
        if (fetchUrl.startsWith('/')) {
          const apiBase = process.env.REACT_APP_API_URL || process.env.API_URL || 'https://amorasbackenddd.zeabur.app';
          fetchUrl = `${apiBase.replace(/\/api\/?$/, '')}${fetchUrl}`;
        }
        const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(15000) });
        if (res.ok) {
          data = Buffer.from(await res.arrayBuffer());
        }
      } catch (e: any) {
        console.warn('[EMBED] Falha ao baixar imagem por URL:', e?.message || e);
      }
    }
    if (!data) throw new Error('Não foi possível ler a foto para a busca visual.');
    const mimeType = normalizeMimeType(input.mimeType);
    if (provider === 'google' && mimeType === 'image/webp') {
      return { mimeType: 'image/png', data: (await sharp(data).png().toBuffer()).toString('base64') };
    }
    return { mimeType, data: data.toString('base64') };
  }));
  const google = provider === 'google';
  const response = await fetch(google
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model.slice(7)}:embedContent`
    : 'https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: google ? { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' }
      : { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'Amoras Produção' },
    body: JSON.stringify(google
      ? { content: { parts: images.map((image) => ({ inlineData: image })) }, outputDimensionality: IMAGE_EMBEDDING_DIMENSIONS }
      : { model, input: [{ content: images.map((image) => ({ type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.data}` } })) }], dimensions: IMAGE_EMBEDDING_DIMENSIONS, encoding_format: 'float' }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    if (response.status === 429) throw Object.assign(new Error(`A cota de embeddings ${google ? 'da Google' : 'do OpenRouter'} foi atingida. Aguarde a renovação do limite antes de tentar novamente.`), { statusCode: 429 });
    const detail = (await response.text()).split(apiKey).join('[REDACTED]').slice(0, 220);
    throw configuredError(`${google ? 'a Google' : 'o OpenRouter'} respondeu HTTP ${response.status}: ${detail}`);
  }
  const body = await response.json() as { data?: Array<{ embedding?: unknown[] }>; embedding?: { values?: unknown[] } };
  const values = google ? body.embedding?.values : body.data?.[0]?.embedding;
  const vector = Array.isArray(values) && values.every((value) => typeof value === 'number') ? values as number[] : [];
  if (vector.length !== IMAGE_EMBEDDING_DIMENSIONS || vector.some((value) => !Number.isFinite(value))) {
    throw configuredError(`o modelo retornou um vetor inválido (esperado: ${IMAGE_EMBEDDING_DIMENSIONS} dimensões).`);
  }
  return vector;
}

export function vectorLiteral(vector: number[]): string {
  if (vector.length !== IMAGE_EMBEDDING_DIMENSIONS || vector.some((value) => !Number.isFinite(value))) throw new Error('Vetor de imagem inválido.');
  return `[${vector.join(',')}]`;
}
