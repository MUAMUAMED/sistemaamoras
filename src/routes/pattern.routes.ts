import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Normalização para comparação textual
function normalizeText(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Remove termos comuns de estampas para encontrar o radical
function extractPrintRoot(value: string): string {
  const normalized = normalizeText(value);
  return normalized
    .replace(/\b(estampa|estampado|estampada|padrao|padroes|cor|cores|de|da|do|com|em)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Cálculo de similaridade Dice (Bigramas de caracteres)
function stringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  if (s1.length < 2 || s2.length < 2) return s1 === s2 ? 1.0 : 0.0;

  const bigrams1 = new Map<string, number>();
  for (let i = 0; i < s1.length - 1; i++) {
    const bigram = s1.substring(i, i + 2);
    bigrams1.set(bigram, (bigrams1.get(bigram) || 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < s2.length - 1; i++) {
    const bigram = s2.substring(i, i + 2);
    const count = bigrams1.get(bigram) || 0;
    if (count > 0) {
      bigrams1.set(bigram, count - 1);
      intersection++;
    }
  }

  return (2.0 * intersection) / (s1.length - 1 + s2.length - 1);
}

// Estrutura Union-Find para agrupar estampas similares
class DisjointSet {
  private parent = new Map<string, string>();

  find(item: string): string {
    if (!this.parent.has(item)) {
      this.parent.set(item, item);
      return item;
    }
    const p = this.parent.get(item)!;
    if (p === item) return item;
    const root = this.find(p);
    this.parent.set(item, root);
    return root;
  }

  union(a: string, b: string) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parent.set(rootA, rootB);
    }
  }
}

// ==========================================
// 1. Listar estampas (ativas por padrão)
// ==========================================
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const patterns = await prisma.pattern.findMany({
      where: includeInactive ? {} : { active: true },
      include: {
        _count: {
          select: { products: true, mergedPatterns: true }
        },
        canonicalPattern: {
          select: { id: true, name: true, code: true }
        }
      },
      orderBy: { name: 'asc' },
    });

    return res.json(patterns);
  } catch (error) {
    return next(error);
  }
});

// ==========================================
// 2. Detecção e Agrupamento de Estampas Semelhantes (Clusters)
// ==========================================
router.get('/clusters', authenticateToken, async (req, res, next) => {
  try {
    // Buscar todas as estampas ativas com contagem de produtos e até 4 fotos de amostra
    const patterns = await prisma.pattern.findMany({
      where: { active: true },
      include: {
        _count: {
          select: { products: true }
        },
        products: {
          take: 4,
          where: { active: true },
          select: {
            id: true,
            name: true,
            images: {
              take: 1,
              where: { type: 'ROUPA' },
              select: { url: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' },
    });

    if (patterns.length < 2) {
      return res.json({ clusters: [], totalDuplicatesFound: 0 });
    }

    const uf = new DisjointSet();
    const pairwiseMatches = new Map<string, { reason: string; score: number }>();

    // A. Comparação Textual (Nome exato, fonético e similaridade de bigramas)
    for (let i = 0; i < patterns.length; i++) {
      for (let j = i + 1; j < patterns.length; j++) {
        const p1 = patterns[i];
        const p2 = patterns[j];

        const norm1 = normalizeText(p1.name);
        const norm2 = normalizeText(p2.name);
        const root1 = extractPrintRoot(p1.name);
        const root2 = extractPrintRoot(p2.name);

        let matchReason = '';
        let score = 0;

        if (norm1 === norm2) {
          matchReason = 'Nome idêntico (diferença apenas de maiúsculas/acentos)';
          score = 1.0;
        } else if (root1 && root2 && root1 === root2) {
          matchReason = 'Radical do nome idêntico';
          score = 0.95;
        } else {
          const sim = stringSimilarity(p1.name, p2.name);
          if (sim >= 0.75) {
            matchReason = `Nome com alta similaridade (${Math.round(sim * 100)}%)`;
            score = sim;
          }
        }

        if (score > 0) {
          uf.union(p1.id, p2.id);
          const pairKey = [p1.id, p2.id].sort().join(':');
          pairwiseMatches.set(pairKey, { reason: matchReason, score });
        }
      }
    }

    // B. Comparação Visual por Vetores (pgvector) das fotos de roupas associadas
    try {
      const visualPairs = await prisma.$queryRaw<
        Array<{ id1: string; id2: string; similarity: number }>
      >(Prisma.sql`
        SELECT
          p1."patternId" AS id1,
          p2."patternId" AS id2,
          MAX(1 - (pie1.embedding <=> pie2.embedding))::float AS similarity
        FROM product_image_embeddings pie1
        INNER JOIN product_images pi1 ON pi1.id = pie1."productImageId"
        INNER JOIN products p1 ON p1.id = pi1."productId"
        INNER JOIN patterns pat1 ON pat1.id = p1."patternId"
        INNER JOIN product_image_embeddings pie2 ON pie1."productImageId" < pie2."productImageId"
        INNER JOIN product_images pi2 ON pi2.id = pie2."productImageId"
        INNER JOIN products p2 ON p2.id = pi2."productId"
        INNER JOIN patterns pat2 ON pat2.id = p2."patternId"
        WHERE p1."patternId" != p2."patternId"
          AND pat1.active = true AND pat2.active = true
        GROUP BY p1."patternId", p2."patternId"
        HAVING MAX(1 - (pie1.embedding <=> pie2.embedding)) >= 0.82
      `);

      for (const pair of visualPairs) {
        uf.union(pair.id1, pair.id2);
        const pairKey = [pair.id1, pair.id2].sort().join(':');
        const existing = pairwiseMatches.get(pairKey);
        const visualScore = Number(pair.similarity);
        const visualReason = `Similaridade visual por foto (${Math.round(visualScore * 100)}%)`;

        if (existing) {
          pairwiseMatches.set(pairKey, {
            reason: `${existing.reason} + ${visualReason}`,
            score: Math.max(existing.score, visualScore)
          });
        } else {
          pairwiseMatches.set(pairKey, {
            reason: visualReason,
            score: visualScore
          });
        }
      }
    } catch (e: any) {
      // Caso pgvector não esteja populado ou tabela vazia, a similaridade textual continua operando
      console.warn('Busca visual de clusters não retornou dados vetoriais:', e?.message || e);
    }

    // Agrupar elementos pelo representante da floresta
    const groupMap = new Map<string, typeof patterns>();
    for (const p of patterns) {
      const rootId = uf.find(p.id);
      if (!groupMap.has(rootId)) {
        groupMap.set(rootId, []);
      }
      groupMap.get(rootId)!.push(p);
    }

    // Filtrar apenas grupos com 2 ou mais estampas semelhantes
    const clusters: Array<{
      id: string;
      title: string;
      primaryReason: string;
      averageSimilarity: number;
      suggestedPrincipalId: string;
      patterns: Array<{
        id: string;
        name: string;
        code: string;
        description: string | null;
        active: boolean;
        createdAt: Date;
        productsCount: number;
        sampleImages: string[];
      }>;
    }> = [];

    let clusterIndex = 1;
    for (const [, groupPatterns] of groupMap.entries()) {
      if (groupPatterns.length < 2) continue;

      // Escolher a estampa sugerida como principal:
      // Prioridade: maior número de produtos cadastrados > data de criação mais antiga
      const sortedByWeight = [...groupPatterns].sort((a, b) => {
        const prodDiff = b._count.products - a._count.products;
        if (prodDiff !== 0) return prodDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      const suggestedPrincipal = sortedByWeight[0];

      // Calcular o motivo predominante no grupo
      let primaryReason = 'Semelhança de nome e características';
      let highestScore = 0.8;

      for (let i = 0; i < groupPatterns.length; i++) {
        for (let j = i + 1; j < groupPatterns.length; j++) {
          const key = [groupPatterns[i].id, groupPatterns[j].id].sort().join(':');
          const match = pairwiseMatches.get(key);
          if (match && match.score > highestScore) {
            highestScore = match.score;
            primaryReason = match.reason;
          }
        }
      }

      clusters.push({
        id: `cluster-${clusterIndex++}`,
        title: `Grupo de estampas: ${suggestedPrincipal.name}`,
        primaryReason,
        averageSimilarity: Math.round(highestScore * 100),
        suggestedPrincipalId: suggestedPrincipal.id,
        patterns: groupPatterns.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          description: p.description,
          active: p.active,
          createdAt: p.createdAt,
          productsCount: p._count.products,
          sampleImages: p.products
            .flatMap((prod) => prod.images.map((img) => img.url))
            .filter(Boolean)
            .slice(0, 4),
        })),
      });
    }

    return res.json({
      clusters,
      totalDuplicatesFound: clusters.reduce((acc, c) => acc + c.patterns.length, 0)
    });
  } catch (error) {
    return next(error);
  }
});

// ==========================================
// 3. Unificar Estampas (Merge) com Redirecionamento
// ==========================================
router.post('/merge', authenticateToken, async (req, res, next) => {
  try {
    const { principalPatternId, mergedPatternIds } = req.body as {
      principalPatternId?: string;
      mergedPatternIds?: string[];
    };

    if (!principalPatternId || !Array.isArray(mergedPatternIds) || mergedPatternIds.length === 0) {
      return res.status(400).json({
        error: 'Parâmetros inválidos',
        message: 'Informe a estampa principal e ao menos uma estampa a ser unificada.'
      });
    }

    if (mergedPatternIds.includes(principalPatternId)) {
      return res.status(400).json({
        error: 'Operação inválida',
        message: 'A estampa principal não pode estar inclusa na lista de estampas a serem mescladas.'
      });
    }

    // Executar transação de mesclagem e redirecionamento
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obter e validar a estampa principal
      const principal = await tx.pattern.findUnique({
        where: { id: principalPatternId }
      });

      if (!principal) {
        throw new Error('A estampa principal selecionada não foi encontrada.');
      }

      // 2. Obter as estampas a serem mescladas
      const secondaryPatterns = await tx.pattern.findMany({
        where: { id: { in: mergedPatternIds } }
      });

      if (secondaryPatterns.length !== mergedPatternIds.length) {
        throw new Error('Uma ou mais estampas selecionadas para unificação não foram encontradas.');
      }

      // 3. Para cada estampa secundária:
      //    a) Desativar e apontar canonicalPatternId para a principal
      //    b) Criar/atualizar registro de redirecionamento de código na tabela pattern_redirects
      for (const sec of secondaryPatterns) {
        await tx.pattern.update({
          where: { id: sec.id },
          data: {
            canonicalPatternId: principal.id,
            active: false,
          }
        });

        // Gravar redirecionamento do código antigo para o código da principal
        await tx.patternRedirect.upsert({
          where: { sourcePatternCode: sec.code },
          create: {
            sourcePatternId: sec.id,
            sourcePatternCode: sec.code,
            sourcePatternName: sec.name,
            targetPatternId: principal.id,
            targetPatternCode: principal.code,
            targetPatternName: principal.name,
          },
          update: {
            targetPatternId: principal.id,
            targetPatternCode: principal.code,
            targetPatternName: principal.name,
          }
        });

        // Aplanar redirecionamentos anteriores que apontavam para esta secundária
        await tx.patternRedirect.updateMany({
          where: { targetPatternId: sec.id },
          data: {
            targetPatternId: principal.id,
            targetPatternCode: principal.code,
            targetPatternName: principal.name,
          }
        });
      }

      // 4. Localizar todos os produtos que usavam as estampas secundárias
      const affectedProducts = await tx.product.findMany({
        where: { patternId: { in: mergedPatternIds } },
        select: { id: true, barcode: true, name: true, patternId: true }
      });

      // 5. Para cada produto afetado:
      //    a) Gravar o código de barras atual em product_barcode_aliases (garantindo que qualquer etiqueta impressa resolva)
      //    b) Atualizar o patternId para a estampa principal
      for (const prod of affectedProducts) {
        if (prod.barcode) {
          await tx.productBarcodeAlias.upsert({
            where: { barcode: prod.barcode },
            create: {
              barcode: prod.barcode,
              productId: prod.id,
            },
            update: {
              productId: prod.id,
            }
          });
        }

        await tx.product.update({
          where: { id: prod.id },
          data: { patternId: principal.id }
        });
      }

      return {
        principalPattern: principal,
        secondaryPatternsCount: secondaryPatterns.length,
        productsUpdatedCount: affectedProducts.length,
        redirectedCodes: secondaryPatterns.map(p => ({
          fromCode: p.code,
          fromName: p.name,
          toCode: principal.code,
          toName: principal.name
        }))
      };
    });

    return res.json({
      success: true,
      message: `Estampa "${result.principalPattern.name}" definida como principal com sucesso. ${result.secondaryPatternsCount} estampas foram unificadas e ${result.productsUpdatedCount} produtos foram transferidos. Códigos de barras e QR Codes impressos foram redirecionados.`,
      result
    });
  } catch (error: any) {
    return next(error);
  }
});

// ==========================================
// 4. Histórico de Redirecionamentos Ativos
// ==========================================
router.get('/redirects', authenticateToken, async (req, res, next) => {
  try {
    const redirects = await prisma.patternRedirect.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        sourcePattern: {
          select: { id: true, name: true, code: true, active: true }
        },
        targetPattern: {
          select: { id: true, name: true, code: true, active: true }
        }
      }
    });

    return res.json(redirects);
  } catch (error) {
    return next(error);
  }
});

// ==========================================
// 5. Criar padrão individual
// ==========================================
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { name, code, description } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Nome e código são obrigatórios',
      });
    }

    if (!/^\d{1,4}$/.test(code)) {
      return res.status(400).json({
        error: 'Código inválido',
        message: 'O código deve ter 1 a 4 dígitos numéricos (ex: 0001, 0032)',
      });
    }

    const existingPattern = await prisma.pattern.findFirst({
      where: {
        OR: [
          { name },
          { code }
        ]
      }
    });

    if (existingPattern) {
      return res.status(409).json({
        error: 'Estampa já existe',
        message: existingPattern.name === name 
          ? 'Já existe uma estampa com este nome'
          : 'Já existe uma estampa com este código'
      });
    }

    const pattern = await prisma.pattern.create({
      data: { name, code, description },
    });

    return res.status(201).json(pattern);
  } catch (error) {
    return next(error);
  }
});

// ==========================================
// 6. Atualizar estampa
// ==========================================
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, active } = req.body;

    const pattern = await prisma.pattern.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(active !== undefined && { active }),
      }
    });

    return res.json(pattern);
  } catch (error) {
    return next(error);
  }
});

// ==========================================
// 7. Excluir estampa
// ==========================================
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const force = req.query.force === 'true';

    const pattern = await prisma.pattern.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (!pattern) {
      return res.status(404).json({
        error: 'Estampa não encontrada',
        message: 'A estampa solicitada não foi encontrada'
      });
    }

    if (pattern._count.products > 0 && !force) {
      return res.status(409).json({
        error: 'Estampa em uso',
        message: `Esta estampa está sendo usada por ${pattern._count.products} produto(s).`,
        canForce: true
      });
    }

    await prisma.pattern.delete({
      where: { id }
    });

    return res.status(200).json({
      message: 'Estampa excluída com sucesso',
      patternName: pattern.name
    });
  } catch (error) {
    return next(error);
  }
});

export default router;