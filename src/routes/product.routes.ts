import { Router, Request, Response, NextFunction } from 'express';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { uploadProductImage } from '../middleware/upload';

const router = Router();

const productImageSelect = {
  id: true,
  productId: true,
  url: true,
  type: true,
  position: true,
  filename: true,
  mimeType: true,
  size: true,
  createdAt: true,
};

const commercialProductSummarySelect = {
  id: true,
  erpProductId: true,
  title: true,
  slug: true,
  published: true,
  featured: true,
  categoryId: true,
};

const normalizeImagePath = (url?: string | null) => {
  if (!url) return '';
  try {
    return new URL(url).pathname;
  } catch {
    return url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  }
};

// Função para gerar código de barras com subcategoria opcional
function generateBarcode(sizeCode: string, categoryCode: string, subcategoryCode: string | null, patternCode: string): string {
  const subCode = subcategoryCode || '00'; // Usar '00' como padrão quando não há subcategoria
  return `${sizeCode}${categoryCode}${subCode}${patternCode}`;
}

// Função para gerar QR Code
async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 512,
    });
    return qrCodeDataURL;
  } catch (error) {
    throw new Error('Erro ao gerar QR Code');
  }
}

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Listar produtos
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nome do produto
 *       - in: query
 *         name: barcode
 *         schema:
 *           type: string
 *         description: Buscar por código de barras
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrar por categoria
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista de produtos
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    console.log('🔍 [PRODUCT LIST] Iniciando busca de produtos');
    console.log('🔌 [PRODUCT LIST] Testando conexão com banco...');
    
    // Teste de conexão básico
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ [PRODUCT LIST] Conexão com banco OK');
    } catch (connError: any) {
      console.error('💥 [PRODUCT LIST] Erro de conexão:', connError.message);
      return res.status(500).json({
        error: 'Erro de conexão com banco de dados',
        message: 'Não foi possível conectar ao banco de dados'
      });
    }

    const { search, barcode, category, page = 1, limit = 20, isDraft } = req.query;
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};

    // Lógica de filtro por isDraft:
    // - Se isDraft não for especificado: mostrar TODOS os produtos (rascunhos e não rascunhos)
    // - Se isDraft for 'true': mostrar apenas rascunhos
    // - Se isDraft for 'false': mostrar apenas produtos completos (não rascunhos) e ativos
    if (isDraft === 'false') {
      // Apenas produtos completos e ativos
      where.active = true;
      where.isDraft = false;
    } else if (isDraft === 'true') {
      // Apenas rascunhos
      where.isDraft = true;
      // Para rascunhos, não filtrar por active (podem estar ativos ou não)
    } else {
      // Se não especificado, mostrar TODOS (rascunhos e não rascunhos)
      // Não adicionar filtro de isDraft, mas manter filtro de active apenas para produtos não rascunhos
      // Isso mostra: todos os rascunhos + produtos ativos não rascunhos
      where.OR = [
        { isDraft: true }, // Todos os rascunhos
        { isDraft: false, active: true } // Produtos completos e ativos
      ];
    }

    if (search) {
      const searchTerm = String(search).trim();
      where.OR = [
        {
          name: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        {
          barcode: {
            contains: searchTerm,
          },
        },
        {
          description: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        {
          category: {
            name: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        },
        {
          subcategory: {
            name: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        },
        {
          size: {
            name: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        },
        {
          pattern: {
            name: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    if (barcode) {
      where.barcode = barcode as string;
    }

    if (category) {
      where.categoryId = category as string;
    }

    console.log('📊 [PRODUCT LIST] Buscando produtos no banco...');
    let productsBase: any[] = [];
    let total = 0;

    try {
      const [products, count] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            category: true,
            subcategory: true,
            size: true,
            pattern: true,
            commercialProduct: {
              select: commercialProductSummarySelect,
            },
          },
          skip,
          take,
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.product.count({ where }),
      ]);
      
      productsBase = products;
      total = count;
      console.log(`✅ [PRODUCT LIST] Encontrados ${total} produtos, retornando ${productsBase.length}`);
    } catch (dbError: any) {
      console.error('💥 [PRODUCT LIST] Erro ao buscar produtos no banco:', dbError.message);
      console.error('Stack trace:', dbError.stack);
      throw dbError; // Re-lançar para ser capturado pelo error handler
    }

    // Buscar imagens em lote e anexar manualmente (evita tipos até gerar Prisma Client)
    const productIds = productsBase.map((p) => p.id);
    let imagesByProduct: Record<string, any[]> = {};
    
    if (productIds.length > 0) {
      console.log(`🖼️ [PRODUCT LIST] Buscando imagens para ${productIds.length} produtos...`);
      try {
        const allImages = await (prisma as any).productImage.findMany({
          where: { productId: { in: productIds } },
          orderBy: { position: 'asc' },
          select: productImageSelect,
        });
        imagesByProduct = allImages.reduce((acc: Record<string, any[]>, img: any) => {
          (acc[img.productId] = acc[img.productId] || []).push(img);
          return acc;
        }, {});
        console.log(`✅ [PRODUCT LIST] Encontradas imagens para ${Object.keys(imagesByProduct).length} produtos`);
      } catch (error: any) {
        console.warn('⚠️ [PRODUCT LIST] ProductImage table not found, returning empty images arrays:', error.message);
        // Manter imagesByProduct como objeto vazio
      }
    }

    const products = productsBase.map((p) => ({
      ...p,
      images: imagesByProduct[p.id] || [],
    }));

    console.log(`🎯 [PRODUCT LIST] Retornando ${products.length} produtos com imagens`);
    
    res.json({
      data: products,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error: any) {
    console.error('💥 [PRODUCT LIST] Erro geral:', error.message);
    console.error('💥 [PRODUCT LIST] Stack:', error.stack);
    return next(error);
  }
  return;
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Buscar produto por ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Produto encontrado
 *       404:
 *         description: Produto não encontrado
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const productBase = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        subcategory: true,
        size: true,
        pattern: true,
        commercialProduct: {
          select: commercialProductSummarySelect,
        },
        stockMovements: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!productBase) {
      return res.status(404).json({
        error: 'Produto não encontrado',
        message: 'O produto solicitado não foi encontrado',
      });
    }

    let images: any[] = [];
    try {
      images = await (prisma as any).productImage.findMany({ where: { productId: id }, orderBy: { position: 'asc' },         select: productImageSelect,       });
    } catch (error: any) {
      console.warn('⚠️ ProductImage table not found in product details, returning empty images array:', error.message);
    }
    
    const product = { ...productBase, images } as any;
    return res.json(product);
  } catch (error) {
    return next(error);
  }
  return;
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Criar novo produto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - categoryId
 *               - size
 *               - sizeCode
 *               - patternId
 *               - price
 *               - stock
 *             properties:
 *               name:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               size:
 *                 type: string
 *               sizeCode:
 *                 type: string
 *               patternId:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Produto criado com sucesso
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    const {
      name,
      categoryId,
      subcategoryId,
      sizeId,
      patternId,
      price,
      stock,
      description,
      initialLocation,
      saveAsDraft, // Novo parâmetro para salvar como rascunho
      ncm, cest, cfop, fiscalOrigin, unitOfMeasure, icmsCst, icmsRate, pisCst, cofinsCst,
    } = req.body;

    console.log('🆕 [PRODUTO CREATE] Dados recebidos:', {
      name,
      categoryId,
      subcategoryId,
      sizeId,
      patternId,
      price,
      stock,
      description,
      saveAsDraft,
      bodyCompleto: req.body
    });

    // Se for rascunho, não validar campos obrigatórios
    if (saveAsDraft) {
      console.log('📝 [PRODUTO CREATE] Salvando como rascunho - sem validações obrigatórias');
      
      const draftData: any = {
        name: name || null,
        categoryId: categoryId || null,
        subcategoryId: subcategoryId || null,
        sizeId: sizeId || null,
        patternId: patternId || null,
        price: price || null,
        stock: stock || 0,
        stockLoja: initialLocation === 'LOJA' ? (stock || 0) : 0,
        stockArmazem: initialLocation === 'ARMAZEM' ? (stock || 0) : 0,
        description: description || null,
        ncm: ncm || null, cest: cest || null, cfop: cfop || null,
        fiscalOrigin: fiscalOrigin || '0', unitOfMeasure: unitOfMeasure || 'UN',
        icmsCst: icmsCst || null, icmsRate: icmsRate ?? null,
        pisCst: pisCst || null, cofinsCst: cofinsCst || null,
        isDraft: true,
        // Não gerar barcode nem qrcode para rascunhos
        barcode: null,
        qrcodeUrl: null,
      };

      const draftProduct = await prisma.product.create({
        data: draftData,
        include: {
          category: true,
          subcategory: true,
          size: true,
          pattern: true,
        },
      });

      console.log('✅ [PRODUTO CREATE] Rascunho criado com sucesso:', draftProduct.id);

      return res.status(201).json({
        ...draftProduct,
        message: 'Rascunho salvo com sucesso',
      });
    }

    // Validar dados obrigatórios (apenas se não for rascunho)
    if (!name || !categoryId || !sizeId || !patternId || !price || stock === undefined) {
      console.log('❌ [PRODUTO CREATE] Dados obrigatórios faltando:', {
        name: !!name,
        categoryId: !!categoryId,
        sizeId: !!sizeId,
        patternId: !!patternId,
        price: !!price,
        stock: stock !== undefined
      });
      return res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Nome, categoria, tamanho, estampa, preço e estoque são obrigatórios',
      });
    }

    // Buscar categoria, subcategoria (se informada), tamanho e estampa para gerar código de barras
    const [category, subcategory, size, pattern] = await Promise.all([
      prisma.category.findUnique({ where: { id: categoryId } }),
      subcategoryId ? prisma.subcategory.findUnique({ where: { id: subcategoryId } }) : null,
      prisma.size.findUnique({ where: { id: sizeId } }),
      prisma.pattern.findUnique({ where: { id: patternId } }),
    ]);

    console.log('📋 [PRODUTO CREATE] Dados encontrados:', {
      category: category ? { id: category.id, name: category.name, code: category.code } : null,
      subcategory: subcategory ? { id: subcategory.id, name: subcategory.name, code: subcategory.code } : null,
      size: size ? { id: size.id, name: size.name, code: size.code } : null,
      pattern: pattern ? { id: pattern.id, name: pattern.name, code: pattern.code } : null
    });

    if (!category || !size || !pattern) {
      console.log('❌ [PRODUTO CREATE] Dados inválidos - categoria, tamanho ou estampa não encontrada');
      return res.status(400).json({
        error: 'Categoria, tamanho ou estampa inválida',
        message: 'Categoria, tamanho ou estampa não encontrada',
      });
    }

    // Se subcategoria foi informada, verificar se ela existe e pertence à categoria
    if (subcategoryId) {
      if (!subcategory) {
        console.log('❌ [PRODUTO CREATE] Subcategoria não encontrada:', subcategoryId);
        return res.status(400).json({
          error: 'Subcategoria inválida',
          message: 'Subcategoria não encontrada',
        });
      }

      if (subcategory.categoryId !== categoryId) {
        console.log('❌ [PRODUTO CREATE] Subcategoria não pertence à categoria:', {
          subcategoryId: subcategory.id,
          subcategoryCategoryId: subcategory.categoryId,
          categoryId
        });
        return res.status(400).json({
          error: 'Subcategoria inválida',
          message: 'A subcategoria não pertence à categoria especificada',
        });
      }
    }

    // Gerar código de barras
    const barcode = generateBarcode(size.code, category.code, subcategory?.code || null, pattern.code);
    console.log('🏷️ [PRODUTO CREATE] Código de barras gerado:', {
      sizeCode: size.code,
      categoryCode: category.code,
      subcategoryCode: subcategory?.code || null,
      patternCode: pattern.code,
      barcode
    });

    // Verificar se código de barras já existe
    const existingProduct = await prisma.product.findUnique({
      where: { barcode },
      include: {
        category: true,
        pattern: true,
      },
    });

    if (existingProduct) {
      console.log('⚠️ [PRODUTO CREATE] Produto já existe, adicionando estoque:', {
        existingProductId: existingProduct.id,
        existingProductName: existingProduct.name,
        currentStock: existingProduct.stock,
        addingStock: stock,
        newStock: existingProduct.stock + stock
      });
      // Se produto já existe, adicionar ao estoque existente
      const newStock = existingProduct.stock + stock;
      
      const updatedProduct = await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          stock: newStock,
          stockLoja: initialLocation === 'LOJA' ? (existingProduct.stockLoja || 0) + stock : existingProduct.stockLoja,
          stockArmazem: initialLocation === 'ARMAZEM' ? (existingProduct.stockArmazem || 0) + stock : existingProduct.stockArmazem,
          price, // Atualizar preço também
          description: description || existingProduct.description, // Manter descrição existente se não informada
        },
        include: {
          category: true,
          subcategory: true,
          size: true,
          pattern: true,
        },
      });

      // Registrar movimentação de entrada de estoque
      if (stock > 0) {
        await prisma.stockMovement.create({
          data: {
            productId: existingProduct.id,
            type: 'ENTRY',
            quantity: stock,
            reason: 'Adição de estoque via criação de produto',
            location: initialLocation || 'LOJA', // Usar localização escolhida
            userId: req.user!.id,
          },
        });
        console.log('📦 [PRODUTO CREATE] Movimentação de estoque registrada');
      }

      console.log('✅ [PRODUTO CREATE] Estoque adicionado ao produto existente');
      return res.status(200).json({
        ...updatedProduct,
        message: `Estoque adicionado ao produto existente. Novo estoque: ${newStock}`,
        stockAdded: stock,
      });
    }

    // Gerar QR Code
    const qrcodeUrl = await generateQRCode(barcode);
    console.log('📱 [PRODUTO CREATE] QR Code gerado');

    const createData: any = {
        name,
        categoryId,
      subcategoryId,
        sizeId,
        patternId,
        price,
        stock,
        stockLoja: initialLocation === 'LOJA' ? stock : 0,
        stockArmazem: initialLocation === 'ARMAZEM' ? stock : 0,
        barcode,
        qrcodeUrl,
        description,
        ncm: ncm || null,
        cest: cest || null,
        cfop: cfop || null,
        fiscalOrigin: fiscalOrigin || '0',
        unitOfMeasure: unitOfMeasure || 'UN',
        icmsCst: icmsCst || null,
        icmsRate: icmsRate ?? null,
        pisCst: pisCst || null,
        cofinsCst: cofinsCst || null,
        isDraft: false, // Produto normal, não é rascunho
        // inProduction: true, // Temporariamente removido até migration ser aplicada
        // status: 'PROCESSANDO', // Produtos começam sempre como PROCESSANDO (será adicionado após migration)
    };

    console.log('💾 [PRODUTO CREATE] Dados que serão criados:', createData);

    // Criar produto
    try {
      console.log('🚀 [PRODUTO CREATE] Tentando criar produto no banco...');
      
      const product = await prisma.product.create({
        data: createData,
        include: {
          category: true,
          subcategory: true,
          size: true,
          pattern: true,
        },
      });
      
      console.log('✅ [PRODUTO CREATE] Produto criado no banco com sucesso:', product.id);
    } catch (createError: any) {
      console.error('💥 [PRODUTO CREATE] Erro ao criar no banco:', {
        error: createError,
        message: createError?.message,
        code: createError?.code,
        meta: createError?.meta,
      });
      throw createError;
    }

    const foundProduct = await prisma.product.findUnique({
      where: { barcode },
      include: {
        category: true,
        subcategory: true,
        size: true,
        pattern: true,
      },
    });

    if (!foundProduct) {
      throw new Error('Produto criado mas não encontrado ao buscar novamente');
    }

    console.log('✅ [PRODUTO CREATE] Produto criado com sucesso:', {
      id: foundProduct.id,
      name: foundProduct.name,
      categoryId: foundProduct.categoryId,
      categoryName: foundProduct.category?.name,
      subcategoryId: foundProduct.subcategoryId,
      subcategoryName: foundProduct.subcategory?.name,
      sizeId: foundProduct.sizeId,
      sizeName: foundProduct.size?.name,
      patternId: foundProduct.patternId,
      patternName: foundProduct.pattern?.name,
      barcode: foundProduct.barcode,
      stock: foundProduct.stock
    });

    // Registrar movimentação de estoque inicial
    if (stock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: foundProduct.id,
          type: 'ENTRY',
          quantity: stock,
          reason: 'Estoque inicial',
          location: initialLocation || 'LOJA', // Usar localização escolhida
          userId: req.user!.id,
        },
      });
      console.log(`📦 [PRODUTO CREATE] Movimentação de estoque inicial registrada na ${initialLocation || 'LOJA'}`);
    }

    return res.status(201).json({
      ...foundProduct,
      message: 'Produto criado com sucesso',
    });
  } catch (error) {
    console.error('💥 [PRODUTO CREATE] Erro:', error);
    return next(error);
  }
  return;
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Atualizar produto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *               active:
 *                 type: boolean
 *               categoryId:
 *                 type: string
 *               subcategoryId:
 *                 type: string
 *               sizeId:
 *                 type: string
 *               patternId:
 *                 type: string
 *               stock:
 *                 type: integer
 *               minStock:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Produto atualizado com sucesso
 *       404:
 *         description: Produto não encontrado
 */
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    console.log('🔍 [PRODUTO UPDATE] REQUISIÇÃO RECEBIDA:', {
      method: req.method,
      url: req.url,
      params: req.params,
      bodyKeys: Object.keys(req.body),
      contentType: req.headers['content-type']
    });

    const { id } = req.params;
    const { 
      name, 
      price, 
      description, 
      active, 
      categoryId, 
      subcategoryId, 
      sizeId, 
      patternId,
      stock,
      minStock,
      isDraft, // Novo campo para rascunhos
      initialLocation, // Campo para definir localização inicial do estoque ao converter rascunho
      ncm, cest, cfop, fiscalOrigin, unitOfMeasure, icmsCst, icmsRate, pisCst, cofinsCst
    } = req.body;

    console.log('🔍 [PRODUTO UPDATE] Dados recebidos:', {
      id,
      name,
      price,
      description,
      active,
      categoryId,
      subcategoryId,
      sizeId,
      patternId,
      stock,
      minStock,
      isDraft,
      initialLocation,
      bodyCompleto: req.body
    });

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      console.log('❌ [PRODUTO UPDATE] Produto não encontrado:', id);
      return res.status(404).json({
        error: 'Produto não encontrado',
        message: 'O produto solicitado não foi encontrado',
      });
    }

    console.log('📦 [PRODUTO UPDATE] Produto atual:', {
      id: product.id,
      name: product.name,
      categoryId: product.categoryId,
      subcategoryId: product.subcategoryId,
      sizeId: product.sizeId,
      patternId: product.patternId,
      barcode: product.barcode
    });

    // Se for rascunho, não validar campos obrigatórios e não gerar código de barras
    const isUpdatingDraft = isDraft !== undefined ? isDraft : product.isDraft;
    const isConvertingToFinal = !isUpdatingDraft && product.isDraft; // Convertendo rascunho para produto final
    console.log('📝 [PRODUTO UPDATE] É rascunho?', { isDraft, productIsDraft: product.isDraft, isUpdatingDraft, isConvertingToFinal });

    // Se estiver alterando categoria, tamanho ou estampa, validar e gerar novo código de barras
    // OU se estiver convertendo rascunho para produto final (sempre precisa gerar código de barras)
    // MAS apenas se NÃO for rascunho (rascunhos podem ter campos null)
    let newBarcode = product.barcode;
    const needsValidation = !isUpdatingDraft && (
      isConvertingToFinal || // Sempre validar ao converter rascunho para produto final
      categoryId || sizeId || patternId || subcategoryId !== undefined // Ou se estiver alterando campos relevantes
    );
    
    if (needsValidation) {
      if (isConvertingToFinal) {
        console.log('🔄 [PRODUTO UPDATE] Convertendo rascunho para produto final, validando e gerando código de barras...');
      } else {
        console.log('🔄 [PRODUTO UPDATE] Alterando categoria/tamanho/estampa, validando...');
      }
      
      // Ao converter rascunho para produto final, usar os valores enviados OU os valores atuais do produto
      // Mas se estiver convertendo, os valores enviados devem existir (não podem ser null)
      const finalCategoryId = categoryId || product.categoryId;
      const finalSubcategoryId = subcategoryId !== undefined ? subcategoryId : product.subcategoryId;
      const finalSizeId = sizeId || product.sizeId;
      const finalPatternId = patternId || product.patternId;

      console.log('🔍 [PRODUTO UPDATE] IDs finais:', {
        finalCategoryId,
        finalSubcategoryId,
        finalSizeId,
        finalPatternId
      });

      // Buscar dados para validação e geração do código de barras
      const [category, subcategory, size, pattern] = await Promise.all([
        finalCategoryId ? prisma.category.findUnique({ where: { id: finalCategoryId } }) : null,
        finalSubcategoryId ? prisma.subcategory.findUnique({ where: { id: finalSubcategoryId } }) : null,
        finalSizeId ? prisma.size.findUnique({ where: { id: finalSizeId } }) : null,
        finalPatternId ? prisma.pattern.findUnique({ where: { id: finalPatternId } }) : null,
      ]);

      console.log('📋 [PRODUTO UPDATE] Dados encontrados:', {
        category: category ? { id: category.id, name: category.name, code: category.code } : null,
        subcategory: subcategory ? { id: subcategory.id, name: subcategory.name, code: subcategory.code } : null,
        size: size ? { id: size.id, name: size.name, code: size.code } : null,
        pattern: pattern ? { id: pattern.id, name: pattern.name, code: pattern.code } : null
      });

      // Para produtos finais, validar que categoria, tamanho e estampa existem
      if (!category || !size || !pattern) {
        console.log('❌ [PRODUTO UPDATE] Dados inválidos - categoria, tamanho ou estampa não encontrada');
        return res.status(400).json({
          error: 'Categoria, tamanho ou estampa inválida',
          message: 'Categoria, tamanho ou estampa não encontrada',
        });
      }

      // Se subcategoria foi informada, verificar se ela existe e pertence à categoria
      if (finalSubcategoryId) {
        if (!subcategory) {
          console.log('❌ [PRODUTO UPDATE] Subcategoria não encontrada:', finalSubcategoryId);
          return res.status(400).json({
            error: 'Subcategoria inválida',
            message: 'Subcategoria não encontrada',
          });
        }

        if (subcategory.categoryId !== finalCategoryId) {
          console.log('❌ [PRODUTO UPDATE] Subcategoria não pertence à categoria:', {
            subcategoryId: subcategory.id,
            subcategoryCategoryId: subcategory.categoryId,
            finalCategoryId
          });
          return res.status(400).json({
            error: 'Subcategoria inválida',
            message: 'A subcategoria não pertence à categoria especificada',
          });
        }
      }

      // Gerar novo código de barras
      newBarcode = generateBarcode(size.code, category.code, subcategory?.code || null, pattern.code);
      console.log('🏷️ [PRODUTO UPDATE] Novo código de barras gerado:', {
        sizeCode: size.code,
        categoryCode: category.code,
        subcategoryCode: subcategory?.code || null,
        patternCode: pattern.code,
        newBarcode
      });

      // Verificar se o novo código de barras já existe (em outro produto)
      const existingProduct = await prisma.product.findFirst({
        where: { 
          barcode: newBarcode,
          id: { not: id }
        }
      });

      if (existingProduct) {
        console.log('❌ [PRODUTO UPDATE] Código de barras já existe em outro produto:', {
          newBarcode,
          existingProductId: existingProduct.id,
          existingProductName: existingProduct.name
        });
        return res.status(400).json({
          error: 'Código de barras já existe',
          message: 'Já existe um produto com essa combinação de categoria, tamanho e estampa',
        });
      }
    }

    // Construir updateData: para rascunhos, permitir null; para produtos finais, apenas valores válidos
    const updateData: any = {};
    
    if (name !== undefined) {
      updateData.name = isUpdatingDraft ? (name || null) : name;
    }
    if (price !== undefined) {
      updateData.price = isUpdatingDraft ? (price !== null && price !== undefined ? price : null) : price;
    }
    // Nota: campo 'cost' não existe no schema do Prisma, removido
    if (stock !== undefined) {
      updateData.stock = stock;
    }
    if (minStock !== undefined) {
      updateData.minStock = minStock;
    }
    if (description !== undefined) {
      updateData.description = isUpdatingDraft ? (description || null) : description;
    }
    const fiscalFields = { ncm, cest, cfop, fiscalOrigin, unitOfMeasure, icmsCst, icmsRate, pisCst, cofinsCst };
    Object.entries(fiscalFields).forEach(([key, value]) => {
      if (value !== undefined) updateData[key] = value === '' ? null : value;
    });
    if (active !== undefined) {
      updateData.active = active;
    }
    if (categoryId !== undefined) {
      updateData.categoryId = isUpdatingDraft ? (categoryId || null) : categoryId;
    }
    if (subcategoryId !== undefined) {
      updateData.subcategoryId = isUpdatingDraft ? (subcategoryId || null) : subcategoryId;
    }
    if (sizeId !== undefined) {
      updateData.sizeId = isUpdatingDraft ? (sizeId || null) : sizeId;
    }
    if (patternId !== undefined) {
      updateData.patternId = isUpdatingDraft ? (patternId || null) : patternId;
    }
    if (newBarcode !== product.barcode) {
      updateData.barcode = newBarcode;
    }
    if (isDraft !== undefined) {
      // Validar: produtos não-rascunho não podem voltar a ser rascunho
      if (isDraft && !product.isDraft) {
        console.log('❌ [PRODUTO UPDATE] Tentativa de converter produto final em rascunho bloqueada');
        return res.status(400).json({
          error: 'Operação não permitida',
          message: 'Produtos finais não podem ser convertidos em rascunhos. Apenas rascunhos podem ser mantidos como rascunhos.',
        });
      }
      
      updateData.isDraft = isDraft;
      // Se está marcando como rascunho, atualizar status também
      if (isDraft) {
        updateData.status = 'PROCESSANDO';
      } else if (isConvertingToFinal) {
        // Se está convertendo rascunho para produto final, atualizar stockLoja e stockArmazem
        // baseado no initialLocation ou distribuir o estoque total
        const finalStock = stock !== undefined ? stock : product.stock || 0;
        const location = initialLocation || 'LOJA'; // Padrão: LOJA
        
        if (location === 'LOJA') {
          updateData.stockLoja = finalStock;
          updateData.stockArmazem = 0;
        } else if (location === 'ARMAZEM') {
          updateData.stockLoja = 0;
          updateData.stockArmazem = finalStock;
        }
        
        console.log('📦 [PRODUTO UPDATE] Atualizando estoque ao converter rascunho:', {
          location,
          finalStock,
          stockLoja: updateData.stockLoja,
          stockArmazem: updateData.stockArmazem
        });
      }
    }

    console.log('💾 [PRODUTO UPDATE] Dados que serão atualizados:', JSON.stringify(updateData, null, 2));
    console.log('💾 [PRODUTO UPDATE] É rascunho?', isUpdatingDraft);
    console.log('💾 [PRODUTO UPDATE] Produto ID:', id);

    try {
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          subcategory: true,
          size: true,
          pattern: true,
        },
      });
      
      console.log('✅ [PRODUTO UPDATE] Produto atualizado com sucesso no Prisma');

      console.log('✅ [PRODUTO UPDATE] Produto atualizado com sucesso:', {
        id: updatedProduct.id,
        name: updatedProduct.name,
        categoryId: updatedProduct.categoryId,
        categoryName: updatedProduct.category?.name,
        subcategoryId: updatedProduct.subcategoryId,
        subcategoryName: updatedProduct.subcategory?.name,
        sizeId: updatedProduct.sizeId,
        sizeName: updatedProduct.size?.name,
        patternId: updatedProduct.patternId,
        patternName: updatedProduct.pattern?.name,
        barcode: updatedProduct.barcode,
        isDraft: updatedProduct.isDraft,
        status: updatedProduct.status
      });

      return res.json(updatedProduct);
    } catch (prismaError: any) {
      console.error('💥 [PRODUTO UPDATE] Erro no Prisma:', {
        message: prismaError?.message,
        code: prismaError?.code,
        meta: prismaError?.meta,
        stack: prismaError?.stack
      });
      throw prismaError;
    }
  } catch (error) {
    console.error('💥 [PRODUTO UPDATE] Erro:', error);
    return next(error);
  }
});

/**
 * @swagger
 * /api/products/{id}/create:
 *   post:
 *     summary: Converter rascunho em produto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               initialLocation:
 *                 type: string
 *                 enum: [LOJA, ARMAZEM]
 *     responses:
 *       200:
 *         description: Produto criado a partir do rascunho com sucesso
 *       400:
 *         description: Dados obrigatórios faltando ou inválidos
 *       404:
 *         description: Rascunho não encontrado
 */
router.post('/:id/create', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { initialLocation } = req.body;

    console.log('🔄 [PRODUTO CREATE FROM DRAFT] Convertendo rascunho em produto:', id);

    // Buscar o rascunho
    const draft = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        subcategory: true,
        size: true,
        pattern: true,
      },
    });

    if (!draft) {
      console.log('❌ [PRODUTO CREATE FROM DRAFT] Rascunho não encontrado:', id);
      return res.status(404).json({
        error: 'Rascunho não encontrado',
        message: 'O rascunho solicitado não foi encontrado',
      });
    }

    if (!draft.isDraft) {
      console.log('❌ [PRODUTO CREATE FROM DRAFT] Produto já não é mais rascunho:', id);
      return res.status(400).json({
        error: 'Não é um rascunho',
        message: 'Este produto já foi criado e não é mais um rascunho',
      });
    }

    // Validar dados obrigatórios
    if (!draft.name || !draft.categoryId || !draft.sizeId || !draft.patternId || !draft.price || draft.stock === undefined) {
      console.log('❌ [PRODUTO CREATE FROM DRAFT] Dados obrigatórios faltando:', {
        name: !!draft.name,
        categoryId: !!draft.categoryId,
        sizeId: !!draft.sizeId,
        patternId: !!draft.patternId,
        price: !!draft.price,
        stock: draft.stock !== undefined
      });
      return res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Nome, categoria, tamanho, estampa, preço e estoque são obrigatórios para criar o produto',
      });
    }

    // Buscar dados para gerar código de barras
    const [category, subcategory, size, pattern] = await Promise.all([
      prisma.category.findUnique({ where: { id: draft.categoryId! } }),
      draft.subcategoryId ? prisma.subcategory.findUnique({ where: { id: draft.subcategoryId } }) : null,
      prisma.size.findUnique({ where: { id: draft.sizeId! } }),
      prisma.pattern.findUnique({ where: { id: draft.patternId! } }),
    ]);

    if (!category || !size || !pattern) {
      console.log('❌ [PRODUTO CREATE FROM DRAFT] Dados inválidos - categoria, tamanho ou estampa não encontrada');
      return res.status(400).json({
        error: 'Categoria, tamanho ou estampa inválida',
        message: 'Categoria, tamanho ou estampa não encontrada',
      });
    }

    // Gerar código de barras
    const barcode = generateBarcode(size.code, category.code, subcategory?.code || null, pattern.code);
    console.log('🏷️ [PRODUTO CREATE FROM DRAFT] Código de barras gerado:', {
      sizeCode: size.code,
      categoryCode: category.code,
      subcategoryCode: subcategory?.code || null,
      patternCode: pattern.code,
      barcode
    });

    // Verificar se código de barras já existe
    const existingProduct = await prisma.product.findFirst({
      where: { 
        barcode,
        id: { not: id } // Excluir o próprio rascunho
      },
    });

    if (existingProduct) {
      console.log('❌ [PRODUTO CREATE FROM DRAFT] Código de barras já existe:', {
        barcode,
        existingProductId: existingProduct.id,
        existingProductName: existingProduct.name
      });
      return res.status(400).json({
        error: 'Código de barras já existe',
        message: 'Já existe um produto com essa combinação de categoria, tamanho e estampa',
      });
    }

    // Gerar QR Code
    const qrcodeUrl = await generateQRCode(barcode);
    console.log('📱 [PRODUTO CREATE FROM DRAFT] QR Code gerado');

    // Atualizar rascunho para produto
    const product = await prisma.product.update({
      where: { id },
      data: {
        barcode,
        qrcodeUrl,
        isDraft: false,
        stockLoja: initialLocation === 'LOJA' ? (draft.stock || 0) : 0,
        stockArmazem: initialLocation === 'ARMAZEM' ? (draft.stock || 0) : 0,
      },
      include: {
        category: true,
        subcategory: true,
        size: true,
        pattern: true,
      },
    });

    console.log('✅ [PRODUTO CREATE FROM DRAFT] Produto criado com sucesso:', {
      id: product.id,
      name: product.name,
      barcode: product.barcode
    });

    // Registrar movimentação de estoque inicial
    if (draft.stock && draft.stock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: 'ENTRY',
          quantity: draft.stock,
          reason: 'Estoque inicial - produto criado a partir de rascunho',
          location: initialLocation || 'LOJA',
          userId: req.user!.id,
        },
      });
      console.log(`📦 [PRODUTO CREATE FROM DRAFT] Movimentação de estoque inicial registrada na ${initialLocation || 'LOJA'}`);
    }

    return res.status(200).json({
      ...product,
      message: 'Produto criado a partir do rascunho com sucesso',
    });
  } catch (error) {
    console.error('💥 [PRODUTO CREATE FROM DRAFT] Erro:', error);
    return next(error);
  }
});

/**
 * @swagger
 * /api/products/{id}/stock:
 *   patch:
 *     summary: Atualizar estoque do produto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *               - reason
 *             properties:
 *               quantity:
 *                 type: integer
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Estoque atualizado com sucesso
 */
router.patch('/:id/stock', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, reason } = req.body;

    if (!quantity || !reason) {
      return res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Quantidade e motivo são obrigatórios',
      });
    }

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Produto não encontrado',
        message: 'O produto solicitado não foi encontrado',
      });
    }

    const newStock = product.stock + quantity;

    if (newStock < 0) {
      return res.status(400).json({
        error: 'Estoque insuficiente',
        message: 'Não há estoque suficiente para esta operação',
      });
    }

    const [updatedProduct] = await prisma.$transaction([
      prisma.product.update({
        where: { id },
        data: { stock: newStock },
        include: {
          category: true,
          subcategory: true,
          size: true,
          pattern: true,
        },
      }),
      prisma.stockMovement.create({
        data: {
          productId: id,
          type: quantity > 0 ? 'ENTRY' : 'EXIT',
          quantity: Math.abs(quantity),
          reason,
          userId: req.user!.id,
        },
      }),
    ]);

    return res.json(updatedProduct);
  } catch (error) {
    return next(error);
  }
  return;
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Excluir produto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Produto excluído com sucesso
 *       404:
 *         description: Produto não encontrado
 */
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const force = req.query.force === 'true';
    
    console.log(`🗑️ [DELETE PRODUCT] Iniciando exclusão do produto: ${id}, force: ${force}`);
    
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: { select: { saleItems: true } },
        commercialProduct: { select: { id: true } },
      },
    });
    if (!product) {
      console.log(`❌ [DELETE PRODUCT] Produto não encontrado: ${id}`);
      return res.status(404).json({
        error: 'Produto não encontrado',
        message: 'O produto solicitado não foi encontrado',
      });
    }
    
    console.log(`✅ [DELETE PRODUCT] Produto encontrado: ${product.name || 'Sem nome'} (isDraft: ${product.isDraft})`);
    
    if (product._count.saleItems > 0) {
      if (!force) {
        return res.status(409).json({
          error: 'Produto possui histórico de vendas',
          message: 'Este produto já possui vendas. Confirme para desativá-lo e removê-lo da vitrine, preservando vendas e notas fiscais.',
          canForce: true,
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id },
          data: { active: false, stock: 0, stockLoja: 0, stockArmazem: 0 },
        });
        if (product.commercialProduct) {
          await (tx as any).commercialProduct.update({
            where: { id: product.commercialProduct.id },
            data: { published: false, featured: false },
          });
        }
      });

      return res.json({
        message: 'Produto desativado e retirado da vitrine. Histórico de vendas e notas fiscais preservado.',
        archived: true,
      });
    }

    await prisma.$transaction(async (tx) => {
      if (product.commercialProduct) {
        await (tx as any).commercialProductImage.deleteMany({
          where: { commercialProductId: product.commercialProduct.id },
        });
        await (tx as any).commercialProduct.delete({
          where: { id: product.commercialProduct.id },
        });
      }
      await (tx as any).productImage.deleteMany({ where: { productId: id } });
      await tx.stockMovement.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });

    console.log(`✅ [DELETE PRODUCT] Produto excluído com sucesso: ${id}`);
    return res.json({ message: 'Produto excluído com sucesso' });
  } catch (error) {
    const err = error as any;
    console.error(`💥 [DELETE PRODUCT] Erro geral:`, err.message);
    console.error(`💥 [DELETE PRODUCT] Stack:`, err.stack);
    
    if (err.code === 'P2003' || err.message?.includes('Foreign key constraint failed')) {
      return res.status(400).json({
        error: 'Produto vinculado',
        message: 'Não é possível excluir este produto porque ele está vinculado a vendas ou movimentações de estoque.'
      });
    }
    return next(error);
  }
  return;
});

/**
 * @swagger
 * /api/products/{id}/image:
 *   post:
 *     summary: Upload de imagem do produto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Imagem carregada com sucesso
 *       404:
 *         description: Produto não encontrado
 */
router.post('/:id/image', authenticateToken, uploadProductImage.single('image'), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        error: 'Nenhuma imagem enviada',
        message: 'É necessário enviar uma imagem',
      });
    }

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Produto não encontrado',
        message: 'O produto solicitado não foi encontrado',
      });
    }

    // Construir URL da imagem
    const imageUrl = `/uploads/products/${req.file.filename}`;
    const imageData = fs.readFileSync(req.file.path);

    // Compat: se vier query main=true, salvar também em imageUrl
    const setAsMain = (req.query.main as string) === 'true';
    const typeParam = (req.query.type as string)?.toUpperCase();
    const imageType = typeParam === 'IA' ? 'IA' : 'ROUPA';

    // Criar registro em ProductImage (com fallback se tabela não existir)
    let createdImage = null;
    try {
      createdImage = await (prisma as any).productImage.create({
        data: {
          productId: id,
          url: imageUrl,
          type: imageType as any,
          position: 0,
          filename: req.file.filename,
          mimeType: req.file.mimetype,
          size: req.file.size,
          data: imageData,
        },
      });
    } catch (error: any) {
      console.warn('⚠️ ProductImage table not found, skipping image record creation:', error.message);
    }

    // Se desejar setar como principal, atualizar campo legacy imageUrl
    // Para rascunhos, usar include opcional para evitar erros se relações não existirem
    let updatedProduct: any = null;
    if (setAsMain) {
      try {
        updatedProduct = await prisma.product.update({
          where: { id },
          data: { imageUrl },
          include: { category: true, pattern: true },
        });
      } catch (error: any) {
        // Se falhar por causa de relações opcionais em rascunhos, buscar sem include
        updatedProduct = await prisma.product.update({
          where: { id },
          data: { imageUrl },
        });
      }
    } else {
      try {
        updatedProduct = await prisma.product.findUnique({
          where: { id },
          include: { category: true, pattern: true },
        });
      } catch (error: any) {
        // Se falhar por causa de relações opcionais em rascunhos, buscar sem include
        updatedProduct = await prisma.product.findUnique({
          where: { id },
        });
      }
    }

    let images: any[] = [];
    try {
      images = await (prisma as any).productImage.findMany({ where: { productId: id }, orderBy: { position: 'asc' },         select: productImageSelect,       });
    } catch (error: any) {
      console.warn('⚠️ ProductImage table not found, returning empty images array:', error.message);
    }

    return res.json({
      message: 'Imagem carregada com sucesso',
      product: { ...(updatedProduct as any), images },
      image: createdImage,
      imageUrl,
    });
  } catch (error) {
    return next(error);
  }
  return;
});

/**
 * @swagger
 * /api/products/{id}/images:
 *   get:
 *     summary: Listar imagens do produto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de imagens
 */
router.get('/:id/images', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    
    let images: any[] = [];
    try {
      images = await (prisma as any).productImage.findMany({
        where: { productId: id },
        orderBy: { position: 'asc' },
        select: productImageSelect,
      });
    } catch (error: any) {
      console.warn('⚠️ ProductImage table not found in images list, returning empty array:', error.message);
    }
    
    return res.json({ images });
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/products/{id}/images:
 *   post:
 *     summary: Upload de imagens do produto (múltiplas)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [ROUPA, IA]
 *         description: Tipo da imagem
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 */
router.post('/:id/images', authenticateToken, (req, res, next) => {
  // Middleware para capturar erros do Multer
  uploadProductImage.array('images', 6)(req, res, (err: any) => {
    if (err) {
      console.error('❌ [MULTER ERROR] Erro no upload:', err);
      return res.status(400).json({
        error: 'Erro no upload de arquivo',
        message: err.message || 'Erro ao processar arquivo enviado'
      });
    }
    next();
  });
}, async (req, res, next) => {
  try {
    console.log('🖼️ [UPLOAD IMAGES] Após multer:', {
      productId: req.params.id,
      reqFile: req.file,
      reqFiles: req.files,
      filesCount: req.files ? (req.files as any[]).length : 0,
      files: req.files ? (req.files as any[]).map((f: any) => ({ 
        filename: f?.filename, 
        originalname: f?.originalname,
        mimetype: f?.mimetype,
        size: f?.size,
        fieldname: f?.fieldname
      })) : []
    });

    const { id } = req.params;
    const typeParam = (req.query.type as string)?.toUpperCase();
    const imageType = typeParam === 'IA' ? 'IA' : 'ROUPA';

    // Validação melhorada - verificar se há arquivos válidos
    if (!req.files || !(req.files as any[]).length) {
      console.warn('⚠️ [UPLOAD IMAGES] Nenhuma imagem recebida');
      return res.status(400).json({ 
        error: 'Nenhuma imagem enviada',
        message: 'É necessário enviar pelo menos uma imagem válida'
      });
    }

    // Validar que os arquivos têm propriedades válidas
    const files = (req.files as Express.Multer.File[]) || [];
    
    // Verificar se os arquivos foram salvos corretamente
    const validFiles = files.filter(file => {
      if (!file || !file.filename) {
        return false;
      }
      
      // Verificar se o arquivo existe no sistema de arquivos
      // Usar mesmo caminho base que o Multer usa
      const baseDir = process.env.UPLOADS_BASE_DIR || process.cwd();
      const filePath = path.join(baseDir, 'uploads', 'products', file.filename);
      
      if (!fs.existsSync(filePath)) {
        console.error('❌ [UPLOAD IMAGES] Arquivo não encontrado no sistema de arquivos:', filePath);
        return false;
      }
      
      // Verificar tamanho do arquivo no sistema de arquivos
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        console.error('❌ [UPLOAD IMAGES] Arquivo tem tamanho zero:', filePath);
        return false;
      }
      
      // Atualizar file.size com o tamanho real do arquivo
      file.size = stats.size;
      
      return true;
    });
    
    if (validFiles.length === 0) {
      console.error('❌ [UPLOAD IMAGES] Arquivos recebidos são inválidos:', files.map(f => ({
        filename: f?.filename,
        size: f?.size,
        originalname: f?.originalname,
        path: f?.path
      })));
      return res.status(400).json({ 
        error: 'Arquivos inválidos',
        message: 'Os arquivos enviados não são válidos ou não foram salvos corretamente. Verifique se são imagens reais.'
      });
    }

    console.log(`✅ [UPLOAD IMAGES] ${validFiles.length} arquivo(s) válido(s) de ${files.length} recebido(s)`);

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

    // Permitir upload de imagens para rascunhos também
    // Rascunhos podem ter imagens mesmo sem todos os campos preenchidos

    // Verificar limite atual de imagens do produto
    let currentImageCount = 0;
    try {
      currentImageCount = await (prisma as any).productImage.count({ where: { productId: id } });
    } catch (error: any) {
      console.warn('⚠️ ProductImage table not found, allowing all uploads:', error.message);
    }

    const remainingSlots = Math.max(0, 6 - currentImageCount);
    // Usar apenas arquivos válidos e respeitar o limite
    const filesToProcess: Express.Multer.File[] = validFiles.slice(0, remainingSlots);

    if (filesToProcess.length < validFiles.length) {
      return res.status(400).json({ 
        error: 'Limite de imagens excedido', 
        message: `Máximo de 6 imagens por produto. Espaços disponíveis: ${remainingSlots}` 
      });
    }

    let created: any[] = [];
    let errors: string[] = [];
    try {
      // Criar imagens uma por uma para rascunhos (evita problemas com transações)
      for (let index = 0; index < filesToProcess.length; index++) {
        const file = filesToProcess[index];
        if (!file || !file.filename) {
          console.error(`❌ Arquivo ${index + 1} inválido:`, file);
          errors.push(`Arquivo ${index + 1} inválido`);
          continue;
        }
        
        // Verificar onde o arquivo foi salvo
        // Usar mesmo caminho base que o Multer usa
        const baseDir = process.env.UPLOADS_BASE_DIR || process.cwd();
        const expectedPath = path.join(baseDir, 'uploads', 'products', file.filename);
        const fileExists = fs.existsSync(expectedPath);
        const fileStats = fileExists ? fs.statSync(expectedPath) : null;
        
        console.log(`📁 [UPLOAD IMAGES] Verificando arquivo ${index + 1}:`, {
          filename: file.filename,
          expectedPath,
          exists: fileExists,
          size: fileStats?.size || 0,
          multerPath: file.path,
          cwd: process.cwd(),
          baseDir,
          UPLOADS_BASE_DIR: process.env.UPLOADS_BASE_DIR
        });
        
        if (!fileExists) {
          console.error(`❌ [UPLOAD IMAGES] Arquivo não encontrado após upload: ${expectedPath}`);
          errors.push(`Arquivo ${index + 1} não foi salvo corretamente`);
          continue;
        }
        
        try {
          // Construir URL completa da imagem
          // Em produção, usar APP_URL se disponível, senão usar URL relativa
          const imageUrl = process.env.APP_URL 
            ? `${process.env.APP_URL}/uploads/products/${file.filename}`
            : `/uploads/products/${file.filename}`;
          const imageData = fs.readFileSync(expectedPath);
          
          const image = await (prisma as any).productImage.create({
            data: {
              productId: id,
              url: imageUrl,
              type: imageType as any,
              position: currentImageCount + index,
              filename: file.filename,
              mimeType: file.mimetype,
              size: file.size,
              data: imageData,
            },
          });
          
          console.log(`📸 [UPLOAD IMAGES] Imagem criada com URL:`, imageUrl);
          created.push(image);
          console.log(`✅ Imagem ${index + 1} criada no banco:`, image.id);
        } catch (imageError: any) {
          console.error(`❌ Erro ao criar imagem ${index + 1}:`, imageError);
          console.error(`❌ Stack:`, imageError.stack);
          errors.push(`Erro ao criar imagem ${index + 1}: ${imageError.message}`);
          // Continuar com as outras imagens mesmo se uma falhar
        }
      }
      
      if (created.length === 0 && filesToProcess.length > 0) {
        console.warn('⚠️ Nenhuma imagem foi criada no banco, mas arquivos foram salvos');
        // Se nenhuma imagem foi criada, retornar erro 500 com detalhes
        return res.status(500).json({
          error: 'Erro ao registrar imagens no banco',
          message: 'Os arquivos foram salvos, mas houve erro ao registrar no banco de dados',
          details: errors.length > 0 ? errors : ['Erro desconhecido ao criar registros de imagens']
        });
      }
    } catch (error: any) {
      console.error('❌ Erro ao processar imagens:', error);
      console.error('❌ Stack:', error.stack);
      return res.status(500).json({
        error: 'Erro ao processar imagens',
        message: error.message || 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }

    let images: any[] = [];
    try {
      images = await (prisma as any).productImage.findMany({ where: { productId: id }, orderBy: { position: 'asc' },         select: productImageSelect,       });
    } catch (error: any) {
      console.warn('⚠️ ProductImage table not found, returning empty images array:', error.message);
    }

    // Retornar sucesso mesmo se algumas imagens falharam (arquivos já foram salvos)
    return res.json({ 
      message: created.length > 0 
        ? `Imagens enviadas com sucesso (${created.length} de ${filesToProcess.length})`
        : 'Arquivos salvos, mas houve problema ao registrar no banco',
      created, 
      images,
      warnings: created.length < filesToProcess.length 
        ? [`Apenas ${created.length} de ${filesToProcess.length} imagens foram registradas no banco`]
        : []
    });
  } catch (error: any) {
    console.error('❌ Erro geral no upload de imagens:', error);
    console.error('❌ Stack:', error.stack);
    // Retornar erro 500 apenas se for um erro crítico
    return res.status(500).json({ 
      error: 'Erro ao processar imagens',
      message: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * @swagger
 * /api/products/{id}/images/{imageId}:
 *   delete:
 *     summary: Remover uma imagem do produto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Imagem removida
 */
router.delete('/:id/images/:imageId', authenticateToken, async (req, res, next) => {
  try {
    const { id, imageId } = req.params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

    let imageToDelete: any = null;
    try {
      imageToDelete = await (prisma as any).productImage.findFirst({
        where: {
          id: imageId,
          productId: id,
        },
        select: productImageSelect,
      });

      await (prisma as any).productImage.deleteMany({
        where: {
          id: imageId,
          productId: id,
        },
      });
    } catch (error: any) {
      console.warn('⚠️ ProductImage table not found in delete, skipping deletion:', error.message);
      return res.status(404).json({ error: 'Imagem não encontrada ou tabela não existe' });
    }

    let images: any[] = [];
    try {
      images = await (prisma as any).productImage.findMany({ where: { productId: id }, orderBy: { position: 'asc' },         select: productImageSelect,       });
    } catch (error: any) {
      console.warn('⚠️ ProductImage table not found after delete, returning empty array:', error.message);
    }

    const deletedWasMainImage = imageToDelete?.url
      && normalizeImagePath(product.imageUrl) === normalizeImagePath(imageToDelete.url);
    const nextImageUrl = deletedWasMainImage ? (images[0]?.url || null) : product.imageUrl;

    if (deletedWasMainImage) {
      await prisma.product.update({
        where: { id },
        data: { imageUrl: nextImageUrl },
      });
    }

    return res.json({ message: 'Imagem removida', images, imageUrl: nextImageUrl });
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/products/{id}/images/{imageId}/set-main:
 *   put:
 *     summary: Definir imagem como principal do produto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Imagem definida como principal
 */
router.put('/:id/images/:imageId/set-main', authenticateToken, async (req, res, next) => {
  try {
    const { id, imageId } = req.params;
    
    // Verificar se produto existe
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Buscar a imagem
    let image: any = null;
    try {
      image = await (prisma as any).productImage.findUnique({ where: { id: imageId } });
    } catch (error: any) {
      console.warn('⚠️ ProductImage table not found:', error.message);
      return res.status(404).json({ error: 'Imagem não encontrada ou tabela não existe' });
    }

    if (!image) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }

    // Verificar se a imagem pertence ao produto
    if (image.productId !== id) {
      return res.status(400).json({ error: 'A imagem não pertence a este produto' });
    }

    // Atualizar o produto com a URL da imagem como principal
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { imageUrl: image.url },
      include: {
        category: true,
        subcategory: true,
        size: true,
        pattern: true,
      },
    });

    // Buscar todas as imagens do produto
    let images: any[] = [];
    try {
      images = await (prisma as any).productImage.findMany({ 
        where: { productId: id }, 
        orderBy: { position: 'asc' }, 
              select: productImageSelect, 
            });
    } catch (error: any) {
      console.warn('⚠️ ProductImage table not found after update, returning empty array:', error.message);
    }

    return res.json({ 
      message: 'Imagem definida como principal com sucesso',
      product: { ...updatedProduct, images }
    });
  } catch (error) {
    console.error('❌ Erro ao definir imagem principal:', error);
    return next(error);
  }
});

/**
 * @swagger
 * /api/products/search/{code}:
 *   get:
 *     summary: Buscar produto por código de barras ou SKU
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Produto encontrado
 *       404:
 *         description: Produto não encontrado
 */
router.get('/search/:code', authenticateToken, async (req, res, next) => {
  try {
    const { code } = req.params;
    // Busca apenas por código de barras
    const product = await prisma.product.findFirst({
      where: {
        barcode: code
      },
      include: {
        category: true,
        pattern: true,
      },
    });
    if (!product) {
      return res.status(404).json({
        error: 'Produto não encontrado',
        message: 'Nenhum produto encontrado com este código',
      });
    }
    return res.json(product);
  } catch (error) {
    return next(error);
  }
  return;
});

/**
 * @swagger
 * /api/products/{id}/stock/add:
 *   put:
 *     summary: Adicionar estoque a um produto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do produto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 description: Quantidade a adicionar
 *               reason:
 *                 type: string
 *                 description: Motivo da adição
 *     responses:
 *       200:
 *         description: Estoque adicionado com sucesso
 */
router.put('/:id/stock/add', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, location = 'LOJA', reason = 'Adição manual de estoque' } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        error: 'Quantidade inválida',
        message: 'A quantidade deve ser maior que zero',
      });
    }

    if (!['LOJA', 'ARMAZEM'].includes(location)) {
      return res.status(400).json({
        error: 'Localização inválida',
        message: 'Localização deve ser LOJA ou ARMAZEM',
      });
    }

    // Buscar produto
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        pattern: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Produto não encontrado',
        message: 'Produto não encontrado',
      });
    }

    const stockField = location === 'LOJA' ? 'stockLoja' : 'stockArmazem';
    const newStock = product.stock + quantity;
    const newLocationStock = product[stockField] + quantity;
    const [updatedProduct] = await prisma.$transaction([
      prisma.product.update({
        where: { id },
        data: {
          stock: newStock,
          [stockField]: newLocationStock,
        },
        include: {
          category: true,
          pattern: true,
        },
      }),
      prisma.stockMovement.create({
        data: {
          productId: id,
          type: 'ENTRY',
          quantity,
          location,
          reason,
          userId: req.user!.id,
        },
      }),
    ]);

    return res.json({
      message: `Estoque adicionado com sucesso. Novo estoque: ${newStock}`,
      product: updatedProduct,
      stockAdded: quantity,
      location,
      previousStock: product.stock,
      newStock,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/products/{id}/stock/remove:
 *   put:
 *     summary: Retirar estoque de um produto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do produto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 description: Quantidade a retirar
 *               reason:
 *                 type: string
 *                 description: Motivo da retirada
 *     responses:
 *       200:
 *         description: Estoque retirado com sucesso
 */
router.put('/:id/stock/remove', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, location = 'LOJA', reason = 'Retirada manual de estoque' } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        error: 'Quantidade inválida',
        message: 'A quantidade deve ser maior que zero',
      });
    }

    if (!['LOJA', 'ARMAZEM'].includes(location)) {
      return res.status(400).json({
        error: 'Localização inválida',
        message: 'Localização deve ser LOJA ou ARMAZEM',
      });
    }

    // Buscar produto
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        pattern: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Produto não encontrado',
        message: 'Produto não encontrado',
      });
    }

    const stockField = location === 'LOJA' ? 'stockLoja' : 'stockArmazem';
    const currentLocationStock = product[stockField];

    if (currentLocationStock < quantity) {
      return res.status(400).json({
        error: 'Estoque insuficiente',
        message: `Estoque atual na ${location}: ${currentLocationStock}. Não é possível retirar ${quantity} unidades.`,
        currentStock: currentLocationStock,
        requestedQuantity: quantity,
      });
    }

    const newStock = product.stock - quantity;
    const newLocationStock = currentLocationStock - quantity;
    const [updatedProduct] = await prisma.$transaction([
      prisma.product.update({
        where: { id },
        data: {
          stock: newStock,
          [stockField]: newLocationStock,
        },
        include: {
          category: true,
          pattern: true,
        },
      }),
      prisma.stockMovement.create({
        data: {
          productId: id,
          type: 'EXIT',
          quantity,
          location,
          reason,
          userId: req.user!.id,
        },
      }),
    ]);

    return res.json({
      message: `Estoque retirado com sucesso. Novo estoque: ${newStock}`,
      product: updatedProduct,
      stockRemoved: quantity,
      location,
      previousStock: product.stock,
      newStock,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/products/{id}/stock/history:
 *   get:
 *     summary: Consultar histórico de movimentações de estoque
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do produto
 *     responses:
 *       200:
 *         description: Histórico de movimentações
 */
router.get('/:id/stock/history', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;

    // Verificar se produto existe
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, stock: true },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Produto não encontrado',
        message: 'Produto não encontrado',
      });
    }

    // Buscar movimentações
    const movements = await prisma.stockMovement.findMany({
      where: { productId: id },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      product,
      movements,
      totalMovements: movements.length,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/products/{id}/stock/add-location:
 *   patch:
 *     summary: Adicionar estoque em localização específica
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *               - location
 *               - reason
 *             properties:
 *               quantity:
 *                 type: integer
 *               location:
 *                 type: string
 *                 enum: [LOJA, ARMAZEM]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Estoque adicionado com sucesso
 */
router.patch('/:id/stock/add-location', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, location, reason } = req.body;

    if (!quantity || !location || !reason) {
      return res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Quantidade, localização e motivo são obrigatórios',
      });
    }

    if (!['LOJA', 'ARMAZEM'].includes(location)) {
      return res.status(400).json({
        error: 'Localização inválida',
        message: 'Localização deve ser LOJA ou ARMAZEM',
      });
    }

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Produto não encontrado',
        message: 'O produto solicitado não foi encontrado',
      });
    }

    const stockField = location === 'LOJA' ? 'stockLoja' : 'stockArmazem';
    const newLocationStock = product[stockField] + quantity;
    const newTotalStock = product.stock + quantity;

    const [updatedProduct] = await prisma.$transaction([
      prisma.product.update({
        where: { id },
        data: { 
          [stockField]: newLocationStock,
          stock: newTotalStock
        },
        include: {
          category: true,
          subcategory: true,
          size: true,
          pattern: true,
        },
      }),
      prisma.stockMovement.create({
        data: {
          productId: id,
          type: 'ENTRY',
          quantity,
          reason,
          location,
          userId: req.user!.id,
        },
      }),
    ]);

    return res.json(updatedProduct);
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/products/{id}/stock/remove-location:
 *   patch:
 *     summary: Remover estoque de localização específica
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *               - location
 *               - reason
 *             properties:
 *               quantity:
 *                 type: integer
 *               location:
 *                 type: string
 *                 enum: [LOJA, ARMAZEM]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Estoque removido com sucesso
 */
router.patch('/:id/stock/remove-location', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, location, reason } = req.body;

    if (!quantity || !location || !reason) {
      return res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Quantidade, localização e motivo são obrigatórios',
      });
    }

    if (!['LOJA', 'ARMAZEM'].includes(location)) {
      return res.status(400).json({
        error: 'Localização inválida',
        message: 'Localização deve ser LOJA ou ARMAZEM',
      });
    }

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Produto não encontrado',
        message: 'O produto solicitado não foi encontrado',
      });
    }

    const stockField = location === 'LOJA' ? 'stockLoja' : 'stockArmazem';
    const currentLocationStock = product[stockField];

    if (currentLocationStock < quantity) {
      return res.status(400).json({
        error: 'Estoque insuficiente',
        message: `Não há estoque suficiente na ${location}. Disponível: ${currentLocationStock}`,
      });
    }

    const newLocationStock = currentLocationStock - quantity;
    const newTotalStock = product.stock - quantity;

    const [updatedProduct] = await prisma.$transaction([
      prisma.product.update({
        where: { id },
        data: { 
          [stockField]: newLocationStock,
          stock: newTotalStock
        },
        include: {
          category: true,
          subcategory: true,
          size: true,
          pattern: true,
        },
      }),
      prisma.stockMovement.create({
        data: {
          productId: id,
          type: 'EXIT',
          quantity,
          reason,
          location,
          userId: req.user!.id,
        },
      }),
    ]);

    return res.json(updatedProduct);
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/products/{id}/stock/transfer:
 *   patch:
 *     summary: Transferir estoque entre localizações
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *               - fromLocation
 *               - toLocation
 *               - reason
 *             properties:
 *               quantity:
 *                 type: integer
 *               fromLocation:
 *                 type: string
 *                 enum: [LOJA, ARMAZEM]
 *               toLocation:
 *                 type: string
 *                 enum: [LOJA, ARMAZEM]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transferência realizada com sucesso
 */
router.patch('/:id/stock/transfer', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, fromLocation, toLocation, reason } = req.body;

    if (!quantity || !fromLocation || !toLocation || !reason) {
      return res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Quantidade, localização de origem, destino e motivo são obrigatórios',
      });
    }

    if (!['LOJA', 'ARMAZEM'].includes(fromLocation) || !['LOJA', 'ARMAZEM'].includes(toLocation)) {
      return res.status(400).json({
        error: 'Localização inválida',
        message: 'Localizações devem ser LOJA ou ARMAZEM',
      });
    }

    if (fromLocation === toLocation) {
      return res.status(400).json({
        error: 'Transferência inválida',
        message: 'Localização de origem e destino devem ser diferentes',
      });
    }

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Produto não encontrado',
        message: 'O produto solicitado não foi encontrado',
      });
    }

    const fromStockField = fromLocation === 'LOJA' ? 'stockLoja' : 'stockArmazem';
    const toStockField = toLocation === 'LOJA' ? 'stockLoja' : 'stockArmazem';
    const currentFromStock = product[fromStockField];

    if (currentFromStock < quantity) {
      return res.status(400).json({
        error: 'Estoque insuficiente',
        message: `Não há estoque suficiente na ${fromLocation}. Disponível: ${currentFromStock}`,
      });
    }

    const newFromStock = currentFromStock - quantity;
    const newToStock = product[toStockField] + quantity;

    const [updatedProduct] = await prisma.$transaction([
      prisma.product.update({
        where: { id },
        data: { 
          [fromStockField]: newFromStock,
          [toStockField]: newToStock
          // stock total não muda na transferência
        },
        include: {
          category: true,
          subcategory: true,
          size: true,
          pattern: true,
        },
      }),
      prisma.stockMovement.create({
        data: {
          productId: id,
          type: 'TRANSFER',
          quantity,
          reason,
          fromLocation,
          toLocation,
          userId: req.user!.id,
        },
      }),
    ]);

    return res.json({
      message: `Transferência realizada: ${quantity} unidades de ${fromLocation} para ${toLocation}`,
      product: updatedProduct,
      transferDetails: {
        quantity,
        fromLocation,
        toLocation,
        previousFromStock: currentFromStock,
        newFromStock,
        previousToStock: product[toStockField],
        newToStock
      }
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/products/{id}/finish-production:
 *   put:
 *     summary: Finalizar processamento de um produto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do produto
 *     responses:
 *       200:
 *         description: Processamento finalizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Produto não encontrado
 *       403:
 *         description: Produto não está em processamento
 */
router.put('/:id/finish-production', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;

    console.log(`🏭 [PRODUTO FINISH-PRODUCTION] Finalizando processamento do produto: ${id}`);

    // Verificar se o produto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        subcategory: true,
        size: true,
        pattern: true,
      },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Verificar se produto está em processamento
    // TEMPORÁRIO: Aceitar todos os produtos até migration ser aplicada
    const product = existingProduct as any;
    
    console.log('🔍 [DEBUG FINISH] Produto encontrado:', {
      id: product.id,
      name: product.name,
      description: product.description,
      hasInProduction: 'inProduction' in product,
      inProductionValue: product.inProduction,
      hasFinalizadoMark: product.description ? product.description.includes('[FINALIZADO]') : false,
    });
    
    // Se o campo inProduction não existe no banco, consideramos que o produto está em processamento
    const isInProduction = product.inProduction !== undefined ? product.inProduction : true;
    
    console.log('🔍 [DEBUG FINISH] isInProduction:', isInProduction);
    console.log('🔍 [DEBUG FINISH] Descrição atual:', product.description);
    
    // TEMPORÁRIO: Comentar a validação para permitir finalizar qualquer produto
    // if (!isInProduction) {
    //   return res.status(403).json({ error: 'Produto não está em processamento' });
    // }

    // Atualizar o produto para finalizar produção (muda status para ATIVO)
    console.log('🔄 [DEBUG FINISH] Tentando atualizar produto...');
    console.log('🔄 [DEBUG FINISH] ID do produto:', id);
    
    // SOLUÇÃO TEMPORÁRIA: Usar o campo 'description' para salvar estado de processamento
    // Vamos adicionar uma marca no final da descrição para indicar que foi finalizado
    let currentDescription = product.description || '';
    console.log('🔄 [DEBUG FINISH] Descrição original:', JSON.stringify(currentDescription));
    
    // Verificar se já tem a marca de finalizado
    if (!currentDescription.includes('[FINALIZADO]')) {
      const newDescription = currentDescription + ' [FINALIZADO]';
      console.log('🔄 [DEBUG FINISH] Nova descrição calculada:', JSON.stringify(newDescription));
      
      try {
        console.log('🔄 [DEBUG FINISH] Executando UPDATE no banco...');
        const updatedProduct = await prisma.product.update({
          where: { id },
          data: {
            description: newDescription,
            status: 'ATIVO',
            inProduction: false,
          },
          include: {
            category: true,
            subcategory: true,
            size: true,
            pattern: true,
          },
        });
        
        console.log('✅ [DEBUG FINISH] UPDATE executado com sucesso!');
        console.log('✅ [DEBUG FINISH] Descrição salva no banco:', JSON.stringify(updatedProduct.description));
        console.log('✅ [DEBUG FINISH] Produto atualizado ID:', updatedProduct.id);
        
        // Verificar se realmente foi salvo fazendo uma nova consulta
        const verificacao = await prisma.product.findUnique({
          where: { id },
          select: { description: true, id: true, name: true }
        });
        
        console.log('🔍 [DEBUG FINISH] Verificação pós-update:', {
          id: verificacao?.id,
          name: verificacao?.name,
          description: JSON.stringify(verificacao?.description),
          hasFinalizadoMark: verificacao?.description?.includes('[FINALIZADO]') || false
        });
        
        return res.json({
          ...updatedProduct,
          message: 'Processamento finalizado com sucesso',
        });
        
      } catch (updateError) {
        console.error('💥 [DEBUG FINISH] Erro no UPDATE:', updateError);
        throw updateError;
      }
    } else {
      console.log('⚠️ [DEBUG FINISH] Produto já tinha marca [FINALIZADO], não atualizando');
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
          status: 'ATIVO',
          inProduction: false,
        },
        include: {
          category: true,
          subcategory: true,
          size: true,
          pattern: true,
        },
      });

      console.log(`✅ [PRODUTO FINISH-PRODUCTION] Processamento finalizado para o produto: ${updatedProduct?.name}`);

      return res.json({
        ...updatedProduct,
        message: 'Processamento finalizado com sucesso',
      });
    }
  } catch (error) {
    console.error('💥 [PRODUTO FINISH-PRODUCTION] Erro:', error);
    return next(error);
  }
});

// Endpoint temporário para debug - verificar estrutura dos produtos
router.get('/debug/:id', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    console.log('🔍 [DEBUG] Estrutura do produto:', JSON.stringify(product, null, 2));
    
    return res.json({
      message: 'Debug do produto',
      product,
      hasInProduction: 'inProduction' in product,
      hasStatus: 'status' in product,
    });
  } catch (error) {
    console.error('💥 [DEBUG] Erro:', error);
    return next(error);
  }
});

export default router;

