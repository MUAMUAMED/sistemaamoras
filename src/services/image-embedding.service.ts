import { readFile } from 'fs/promises';
import path from 'path';

const MODEL = process.env.OPENROUTER_EMBEDDING_MODEL || 'google/gemini-embedding-2';
export const IMAGE_EMBEDDING_DIMENSIONS = 768;

type ImageInput = { path: string; mimeType: string };

function configuredError(message: string): Error {
  return new Error(`Busca visual não configurada: ${message}`);
}

function normalizeMimeType(value: string): string {
  if (value === 'image/jpg') return 'image/jpeg';
  if (value === 'image/jpeg' || value === 'image/png' || value === 'image/webp') return value;
  return path.extname(value).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
}

/** Cria um vetor de imagem no mesmo espaço usado pelo catálogo. */
export async function embedImages(inputs: ImageInput[]): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw configuredError('defina OPENROUTER_API_KEY no backend.');
  if (!inputs.length || inputs.length > 6) throw new Error('Envie entre uma e seis imagens para a busca visual.');
  const content = await Promise.all(inputs.map(async (input) => ({
    type: 'image_url',
    image_url: { url: `data:${normalizeMimeType(input.mimeType)};base64,${(await readFile(input.path)).toString('base64')}` },
  })));
  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'Amoras Produção' },
    body: JSON.stringify({ model: MODEL, input: [{ content }], dimensions: IMAGE_EMBEDDING_DIMENSIONS, encoding_format: 'float' }),
  });
  if (!response.ok) throw configuredError(`o OpenRouter respondeu HTTP ${response.status}: ${(await response.text()).slice(0, 220)}`);
  const body = await response.json() as { data?: Array<{ embedding?: unknown[] }> };
  const vector = body.data?.[0]?.embedding?.map(Number) || [];
  if (vector.length !== IMAGE_EMBEDDING_DIMENSIONS || vector.some((value) => !Number.isFinite(value))) {
    throw configuredError(`o modelo retornou um vetor inválido (esperado: ${IMAGE_EMBEDDING_DIMENSIONS} dimensões).`);
  }
  return vector;
}

export function vectorLiteral(vector: number[]): string {
  if (vector.length !== IMAGE_EMBEDDING_DIMENSIONS || vector.some((value) => !Number.isFinite(value))) throw new Error('Vetor de imagem inválido.');
  return `[${vector.join(',')}]`;
}
