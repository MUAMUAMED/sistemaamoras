import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import QRCode from 'qrcode';
import { prisma } from '../config/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { uploadProductImage } from '../middleware/upload';
import { ProductImageType } from '@prisma/client';

const router = Router();

// Função para gerar código de barras com subcategoria opcional
function generateBarcode(sizeCode: string, categoryCode: string, subcategoryCode: string | null, patternCode: string): string {
  const subCode = subcategoryCode || '00'; // Usar '00' como padrão quando não há subcategoria
  return `${sizeCode}${categoryCode}${subCode}${patternCode}`;
}

// Função para gerar QR Code
async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data);
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

    const { search, barcode, category, page = 1, limit = 20 } = req.query;
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {
      active: true,
    };

    if (search) {
      where.OR = [
        {
          name: {
        contains: search as string,
        mode: 'insensitive',
          },
        },
        {
          barcode: {
            contains: search as string,
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
      images = await (prisma as any).productImage.findMany({ where: { productId: id }, orderBy: { position: 'asc' } });
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
 *               - sizeId
 *             properties:
 *               name:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               sizeId:
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
router.post('/', authenticateToken, uploadProductImage.array('files', 6), async (req: AuthenticatedRequest, res, next) => {
  try {
    const {
      name,
      categoryId,
      subcategoryId,
      sizeId,
      patternId,
      price,
      cost,
      stock,
      description,
      initialLocation,
    } = req.body;

    // Sanitizar campos opcionais que podem vir como string vazia do frontend
    // Isso evita erro de Foreign Key Constraint no Prisma
    const sanitizedCategoryId = categoryId === '' || categoryId === 'undefined' || categoryId === 'null' ? null : categoryId;
    const sanitizedSubcategoryId = subcategoryId === '' || subcategoryId === 'undefined' || subcategoryId === 'null' ? null : subcategoryId;
    const sanitizedPatternId = patternId === '' || patternId === 'undefined' || patternId === 'null' ? null : patternId;
    const sanitizedName = name === '' ? null : name;
    const sanitizedDescription = description === '' || description === 'undefined' || description === 'null' ? null : description;
    
    // Converter campos numéricos (multer retorna strings)
    const parseOptionalFloat = (val: any) => {
      if (!val) return null;
      const strVal = val.toString();
      if (strVal === 'undefined' || strVal === 'null' || strVal.trim() === '') return null;
      const parsed = parseFloat(strVal.replace(',', '.'));
      return isNaN(parsed) ? null : parsed;
    };

    const parseOptionalInt = (val: any, defaultVal = 0) => {
      if (!val) return defaultVal;
      const strVal = val.toString();
      if (strVal === 'undefined' || strVal === 'null' || strVal.trim() === '') return defaultVal;
      const parsed = parseInt(strVal, 10);
      return isNaN(parsed) ? defaultVal : parsed;
    };

    const sanitizedPrice = parseOptionalFloat(price);
    const sanitizedCost = parseOptionalFloat(cost);
    const sanitizedStock = parseOptionalInt(stock, 0);

    console.log('🆕 [PRODUTO CREATE] Dados recebidos:', {
      name,
      categoryId,
      subcategoryId,
      sizeId,
      patternId,
      price,
      stock,
      description,
      bodyCompleto: req.body
    });

    // Validar dados obrigatórios
    // Apenas sizeId é obrigatório para criação inicial (regra de negócio relaxada)
    if (!sizeId) {
      console.log('❌ [PRODUTO CREATE] SizeId obrigatório faltando');
      return res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Tamanho é obrigatório',
      });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      console.log('❌ [PRODUTO CREATE] Foto obrigatória faltando');
      return res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Pelo menos uma foto é obrigatória',
      });
    }

    // Buscar categoria, subcategoria (se informada), tamanho e estampa para gerar código de barras
    // Adicionamos .catch(() => null) para evitar erros 500 caso o ID seja inválido (ex: "waddwa")
    const categoryPromise = sanitizedCategoryId ? prisma.category.findUnique({ where: { id: sanitizedCategoryId } }).catch((e) => {
      console.error('❌ [PRODUTO CREATE] Erro ao buscar categoria:', e.message);
      return null;
    }) : Promise.resolve(null);
    
    const subcategoryPromise = sanitizedSubcategoryId ? prisma.subcategory.findUnique({ where: { id: sanitizedSubcategoryId } }).catch((e) => {
      console.error('❌ [PRODUTO CREATE] Erro ao buscar subcategoria:', e.message);
      return null;
    }) : Promise.resolve(null);
    
    const sizePromise = prisma.size.findUnique({ where: { id: sizeId } }).catch((e) => {
      console.error('❌ [PRODUTO CREATE] Erro ao buscar tamanho:', e.message);
      return null;
    });
    
    const patternPromise = sanitizedPatternId ? prisma.pattern.findUnique({ where: { id: sanitizedPatternId } }).catch((e) => {
      console.error('❌ [PRODUTO CREATE] Erro ao buscar estampa:', e.message);
      return null;
    }) : Promise.resolve(null);

    const [category, subcategory, size, pattern] = await Promise.all([
      categoryPromise,
      subcategoryPromise,
      sizePromise,
      patternPromise,
    ]);

    console.log('📋 [PRODUTO CREATE] Dados encontrados:', {
      category: category ? { id: category.id, name: category.name, code: category.code } : null,
      subcategory: subcategory ? { id: subcategory.id, name: subcategory.name, code: subcategory.code } : null,
      size: size ? { id: size.id, name: size.name, code: size.code } : null,
      pattern: pattern ? { id: pattern.id, name: pattern.name, code: pattern.code } : null
    });

    if (!size) {
      console.log('❌ [PRODUTO CREATE] Tamanho não encontrado');
      return res.status(400).json({
        error: 'Tamanho inválido',
        message: 'Tamanho não encontrado',
      });
    }

    // Se subcategoria foi informada, verificar se ela existe e pertence à categoria
    if (sanitizedSubcategoryId && sanitizedCategoryId) {
      if (!subcategory) {
        console.log('❌ [PRODUTO CREATE] Subcategoria não encontrada:', sanitizedSubcategoryId);
        return res.status(400).json({
          error: 'Subcategoria inválida',
          message: 'Subcategoria não encontrada',
        });
      }

      if (subcategory.categoryId !== sanitizedCategoryId) {
        console.log('❌ [PRODUTO CREATE] Subcategoria não pertence à categoria:', {
          subcategoryId: subcategory.id,
          subcategoryCategoryId: subcategory.categoryId,
          categoryId: sanitizedCategoryId
        });
        return res.status(400).json({
          error: 'Subcategoria inválida',
          message: 'A subcategoria não pertence à categoria especificada',
        });
      }
    }

    // Gerar código aleatório de 12 dígitos para nome e barcode
    // Isso garante que sempre será criado um novo produto, evitando o fluxo de "produto já existe"
    const generateRandomCode = () => {
      let result = '';
      for (let i = 0; i < 12; i++) {
        result += Math.floor(Math.random() * 10);
      }
      return result;
    };

    const randomCode = generateRandomCode();
    // Usar o código aleatório como nome e barcode
    const finalName = sanitizedName || randomCode;
    const barcode = randomCode; // Ignorar a geração baseada em atributos
    
    // Ignorar busca por produto existente já que o barcode é aleatório e único
    const existingProduct = null;

    /* 
    // Lógica antiga de geração de barcode baseada em atributos (desativada temporariamente)
    const categoryCode = category?.code || '00';
    const patternCode = pattern?.code || '0000';
    const barcode = generateBarcode(size.code, categoryCode, subcategory?.code || null, patternCode);
    
    const existingProduct = await prisma.product.findUnique({
      where: { barcode },
      include: {
        category: true,
        pattern: true,
      },
    });
    */

    if (existingProduct) {
      console.log('⚠️ [PRODUTO CREATE] Produto já existe, adicionando estoque:', {
        existingProductId: existingProduct.id,
        existingProductName: existingProduct.name,
        currentStock: existingProduct.stock,
        addingStock: sanitizedStock,
        newStock: existingProduct.stock + sanitizedStock
      });
      // Se produto já existe, adicionar ao estoque existente
      const newStock = existingProduct.stock + sanitizedStock;
      
      const updatedProduct = await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          stock: newStock,
          stockLoja: initialLocation === 'LOJA' ? (existingProduct.stockLoja || 0) + sanitizedStock : existingProduct.stockLoja,
          stockArmazem: initialLocation === 'ARMAZEM' ? (existingProduct.stockArmazem || 0) + sanitizedStock : existingProduct.stockArmazem,
          price: sanitizedPrice !== null ? sanitizedPrice : existingProduct.price, // Atualizar preço se fornecido
          cost: sanitizedCost !== null ? sanitizedCost : (existingProduct as any).cost, // Atualizar custo se fornecido
          description: sanitizedDescription || existingProduct.description, // Manter descrição existente se não informada
        },
        include: {
          category: true,
          subcategory: true,
          size: true,
          pattern: true,
        },
      });

      // Registrar movimentação de entrada de estoque
      if (sanitizedStock > 0) {
        await prisma.stockMovement.create({
          data: {
            productId: existingProduct.id,
            type: 'ENTRY',
            quantity: sanitizedStock,
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
        stockAdded: sanitizedStock,
      });
    }

    // Gerar QR Code
    const qrcodeUrl = await generateQRCode(barcode);
    console.log('📱 [PRODUTO CREATE] QR Code gerado');

    const createData: any = {
        name: finalName,
        // Usar IDs validados (null se não encontrado ou inválido) para evitar erro de Foreign Key
        categoryId: category ? category.id : null,
        subcategoryId: subcategory ? subcategory.id : null,
        sizeId,
        patternId: pattern ? pattern.id : null,
        price: sanitizedPrice,
        cost: sanitizedCost,
        stock: sanitizedStock,
        stockLoja: initialLocation === 'LOJA' ? sanitizedStock : 0,
        stockArmazem: initialLocation === 'ARMAZEM' ? sanitizedStock : 0,
        barcode,
        qrcodeUrl,
        description: sanitizedDescription,
        inProduction: true, // Produto recém criado está em produção
        status: 'PROCESSANDO', // Status inicial de produto incompleto
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

      // Salvar imagens
      if (files && files.length > 0) {
        console.log('📸 [PRODUTO CREATE] Salvando imagens:', files.length);
        const imagesData = files.map((file, index) => ({
          productId: product.id,
          url: `/uploads/products/${file.filename}`,
          isMain: index === 0,
          type: ProductImageType.ROUPA,
          position: index
        }));

        console.log('📸 [PRODUTO CREATE] Dados das imagens:', imagesData);

        await prisma.productImage.createMany({
          data: imagesData
        });

        // Atualizar imagem principal (compatibilidade)
        await prisma.product.update({
          where: { id: product.id },
          data: { imageUrl: `/uploads/products/${files[0].filename}` }
        });
      }
      
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
    if (sanitizedStock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: foundProduct.id,
          type: 'ENTRY',
          quantity: sanitizedStock,
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
  } catch (error: any) {
    console.error('💥 [PRODUTO CREATE] Erro fatal:', error);
    // Retornar erro detalhado para debug em produção temporariamente
    return res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message || 'Algo deu errado',
      details: process.env.NODE_ENV === 'production' ? error.message : error.stack
    });
  }
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
 *               cost:
 *                 type: number
 *     responses:
 *       200:
 *         description: Produto atualizado com sucesso
 *       404:
 *         description: Produto não encontrado
 */
router.put('/:id', authenticateToken, uploadProductImage.array('files', 6), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    let { 
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
      cost
    } = req.body;

    // Funções de sanitização para PUT (lidar com multipart/form-data)
    const sanitizeId = (val: any) => {
      if (val === undefined) return undefined;
      if (val === null || val === 'null' || val === 'undefined' || val === '') return null;
      return val;
    };

    const parseNumber = (val: any) => {
      if (val === undefined) return undefined;
      if (val === null || val === 'null' || val === 'undefined' || val === '') return null;
      const strVal = val.toString();
      const parsed = parseFloat(strVal.replace(',', '.'));
      return isNaN(parsed) ? undefined : parsed;
    };

    const parseIntVal = (val: any) => {
      if (val === undefined) return undefined;
      if (val === null || val === 'null' || val === 'undefined' || val === '') return null;
      const strVal = val.toString();
      const parsed = parseInt(strVal, 10);
      return isNaN(parsed) ? undefined : parsed;
    };

    // Aplicar sanitização
    categoryId = sanitizeId(categoryId);
    subcategoryId = sanitizeId(subcategoryId);
    sizeId = sanitizeId(sizeId);
    patternId = sanitizeId(patternId);
    price = parseNumber(price);
    cost = parseNumber(cost);
    stock = parseIntVal(stock);
    minStock = parseIntVal(minStock);
    
    if (active === 'true') active = true;
    if (active === 'false') active = false;

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
      cost,
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

    // Se estiver alterando categoria, tamanho ou estampa, validar e gerar novo código de barras
    let newBarcode = product.barcode;
    if (categoryId || sizeId || patternId || subcategoryId !== undefined) {
      console.log('🔄 [PRODUTO UPDATE] Alterando categoria/tamanho/estampa, validando...');
      
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

      if (!size) {
        console.log('❌ [PRODUTO UPDATE] Tamanho não encontrado');
        return res.status(400).json({
          error: 'Tamanho inválido',
          message: 'Tamanho não encontrado',
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

        if (finalCategoryId && subcategory.categoryId !== finalCategoryId) {
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
      const categoryCode = category?.code || '00';
      const patternCode = pattern?.code || '0000';
      newBarcode = generateBarcode(size.code, categoryCode, subcategory?.code || null, patternCode);
      console.log('🏷️ [PRODUTO UPDATE] Novo código de barras gerado:', {
        sizeCode: size.code,
        categoryCode,
        subcategoryCode: subcategory?.code || null,
        patternCode,
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
        console.log('⚠️ [PRODUTO UPDATE] Código de barras já existe em outro produto. Iniciando MERGE...');
        console.log('🔄 [MERGE] Produto Rascunho:', { id, name: product.name, barcode: product.barcode });
        console.log('🔄 [MERGE] Produto Destino:', { id: existingProduct.id, name: existingProduct.name, barcode: existingProduct.barcode });

        // 1. Mover imagens do rascunho para o produto existente
        const draftImages = await prisma.productImage.findMany({ where: { productId: id } });
        const existingImagesCount = await prisma.productImage.count({ where: { productId: existingProduct.id } });
        
        console.log(`📸 [MERGE] Movendo ${draftImages.length} imagens...`);
        
        for (let i = 0; i < draftImages.length; i++) {
            await prisma.productImage.update({
                where: { id: draftImages[i].id },
                data: { 
                    productId: existingProduct.id,
                    position: existingImagesCount + i
                }
            });
        }

        // 2. Se o produto existente não tiver imagem principal e o rascunho tiver, atualizar
        if (!existingProduct.imageUrl && product.imageUrl) {
             await prisma.product.update({
                where: { id: existingProduct.id },
                data: { imageUrl: product.imageUrl }
             });
        }

        // 3. Atualizar dados do produto existente com os novos dados do form
        const mergeUpdateData = {
            ...(name && { name }),
            ...(price !== undefined && { price }),
            ...(cost !== undefined && { cost }),
            ...(stock !== undefined && { stock: existingProduct.stock + stock }), // Somar estoque
            ...(minStock !== undefined && { minStock }),
            ...(description !== undefined && { description }),
            ...(active !== undefined && { active }),
            // Manter IDs de categoria/tamanho/estampa do rascunho (que agora são os corretos)
            categoryId: finalCategoryId,
            subcategoryId: finalSubcategoryId,
            sizeId: finalSizeId,
            patternId: finalPatternId,
        };

        const mergedProduct = await prisma.product.update({
            where: { id: existingProduct.id },
            data: mergeUpdateData,
            include: {
                category: true,
                subcategory: true,
                size: true,
                pattern: true,
                images: true
            }
        });

        // 4. Deletar o produto rascunho
        console.log('🗑️ [MERGE] Deletando produto rascunho:', id);
        await prisma.product.delete({ where: { id } });

        console.log('✅ [MERGE] Merge concluído com sucesso!');
        return res.json({
            ...mergedProduct,
            message: 'Produto mesclado com sucesso ao existente.',
            merged: true
        });
      }
    }

    // Processar novas imagens
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      console.log('📸 [PRODUTO UPDATE] Processando novas imagens:', files.length);
      
      const existingImagesCount = await prisma.productImage.count({ where: { productId: id } });
      
      const imagesData = files.map((file, index) => ({
        productId: id,
        url: `/uploads/products/${file.filename}`,
        isMain: existingImagesCount === 0 && index === 0,
        type: ProductImageType.ROUPA,
        position: existingImagesCount + index
      }));

      await prisma.productImage.createMany({
        data: imagesData
      });

      // Se o produto não tinha imagem principal, atualizar
      if (!product.imageUrl) {
        await prisma.product.update({
          where: { id },
          data: { imageUrl: `/uploads/products/${files[0].filename}` }
        });
      }
    }

    const updateData = {
        ...(name && { name }),
      ...(price !== undefined && { price }),
      ...(cost !== undefined && { cost }),
      ...(stock !== undefined && { stock }),
      ...(minStock !== undefined && { minStock }),
      ...(description !== undefined && { description }),
        ...(active !== undefined && { active }),
      ...(categoryId && { categoryId }),
      ...(subcategoryId !== undefined && { subcategoryId }),
      ...(sizeId && { sizeId }),
      ...(patternId && { patternId }),
      ...(newBarcode !== product.barcode && { barcode: newBarcode }),
    };

    console.log('💾 [PRODUTO UPDATE] Dados que serão atualizados:', updateData);

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
      barcode: updatedProduct.barcode
    });

    return res.json(updatedProduct);
  } catch (error) {
    console.error('💥 [PRODUTO UPDATE] Erro:', error);
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
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({
        error: 'Produto não encontrado',
        message: 'O produto solicitado não foi encontrado',
      });
    }
    try {
      await prisma.product.delete({ where: { id } });
      return res.json({ message: 'Produto excluído com sucesso' });
    } catch (error) {
      const err = error as any;
      // Se for erro de integridade e não for forçado, retorna mensagem de confirmação
      if ((err.code === 'P2003' || err.message?.includes('Foreign key constraint failed')) && !force) {
        return res.status(409).json({
          error: 'Produto vinculado',
          message: 'Este produto está vinculado a vendas ou movimentações. Deseja apagar mesmo assim?',
          canForce: true
        });
      }
      // Se for forçado, apaga os vínculos e depois o produto
      if (force) {
        // Apaga movimentações de estoque
        await prisma.stockMovement.deleteMany({ where: { productId: id } });
        // Apaga itens de venda
        await prisma.saleItem.deleteMany({ where: { productId: id } });
        // Agora apaga o produto
        await prisma.product.delete({ where: { id } });
        return res.json({ message: 'Produto e vínculos excluídos com sucesso' });
      }
      throw error;
    }
  } catch (error) {
    const err = error as any;
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
router.post('/:id/image', authenticateToken, uploadProductImage.any(), async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('📸 [PRODUTO IMAGE UPLOAD] Iniciando upload para produto:', id);
    
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      console.log('❌ [PRODUTO IMAGE UPLOAD] Nenhuma imagem recebida');
      return res.status(400).json({
        error: 'Nenhuma imagem enviada',
        message: 'É necessário enviar pelo menos uma imagem',
      });
    }

    console.log(`📸 [PRODUTO IMAGE UPLOAD] Recebidos ${files.length} arquivos`);

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      console.log('❌ [PRODUTO IMAGE UPLOAD] Produto não encontrado');
      // Apagar arquivos enviados se produto não existe
      files.forEach(f => {
         try { fs.unlinkSync(f.path); } catch(e) {} 
      });
      return res.status(404).json({
        error: 'Produto não encontrado',
        message: 'O produto solicitado não foi encontrado',
      });
    }

    // Compat: se vier query main=true, salvar também em imageUrl
    const setAsMain = (req.query.main as string) === 'true';
    const typeParam = (req.query.type as string)?.toUpperCase();
    const imageType = typeParam === 'IA' ? 'IA' : 'ROUPA';

    // Determinar posição inicial
    const existingCount = await prisma.productImage.count({ where: { productId: id } });

    // Salvar todas as imagens
    const createdImages = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageUrl = `/uploads/products/${file.filename}`;
        const isFirst = i === 0;
        
        // Criar registro
        try {
            const newImage = await prisma.productImage.create({
                data: {
                    productId: id,
                    url: imageUrl,
                    type: imageType as any,
                    position: existingCount + i,
                    isMain: (existingCount === 0 && isFirst) || (setAsMain && isFirst) // Define como main se for a primeira do produto ou se solicitado
                }
            });
            createdImages.push(newImage);
            
            // Se for main, atualizar produto
            if ((existingCount === 0 && isFirst) || (setAsMain && isFirst)) {
                await prisma.product.update({
                    where: { id },
                    data: { imageUrl }
                });
            }
        } catch (error: any) {
             console.error('❌ [PRODUTO IMAGE UPLOAD] Erro ao salvar imagem no banco:', error.message);
        }
    }

    // Retornar estado atualizado
    const allImages = await prisma.productImage.findMany({ 
        where: { productId: id }, 
        orderBy: { position: 'asc' } 
    });

    const updatedProduct = await prisma.product.findUnique({
        where: { id },
        include: { category: true, pattern: true },
    });

    return res.json({
      message: 'Imagens carregadas com sucesso',
      product: { ...updatedProduct, images: allImages },
      images: createdImages,
      count: createdImages.length
    });

  } catch (error) {
    console.error('💥 [PRODUTO IMAGE UPLOAD] Erro fatal:', error);
    return next(error);
  }
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
router.post('/:id/images', authenticateToken, uploadProductImage.array('images', 6), async (req, res, next) => {
  try {
    const { id } = req.params;
    const typeParam = (req.query.type as string)?.toUpperCase();
    const imageType = typeParam === 'IA' ? 'IA' : 'ROUPA';

    if (!req.files || !(req.files as any[]).length) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

    const files = (req.files as Express.Multer.File[]) || [];
    
    // Verificar limite atual de imagens do produto
    let currentImageCount = 0;
    try {
      currentImageCount = await (prisma as any).productImage.count({ where: { productId: id } });
    } catch (error: any) {
      console.warn('⚠️ ProductImage table not found, allowing all uploads:', error.message);
    }

    const remainingSlots = Math.max(0, 6 - currentImageCount);
    const filesToProcess: Express.Multer.File[] = files.slice(0, remainingSlots);

    if (filesToProcess.length < files.length) {
      return res.status(400).json({ 
        error: 'Limite de imagens excedido', 
        message: `Máximo de 6 imagens por produto. Espaços disponíveis: ${remainingSlots}` 
      });
    }

    let created: any[] = [];
    try {
      created = await prisma.$transaction(filesToProcess.map((file: Express.Multer.File, index) =>
        (prisma as any).productImage.create({
          data: {
            productId: id,
            url: `/uploads/products/${file.filename}`,
            type: imageType as any,
            position: currentImageCount + index,
          },
        })
      ));
    } catch (error: any) {
      console.warn('⚠️ ProductImage table not found, skipping image record creation:', error.message);
      return res.json({ message: 'Imagens enviadas com sucesso (modo compatibilidade)', created: [], images: [] });
    }

    let images: any[] = [];
    try {
      images = await (prisma as any).productImage.findMany({ where: { productId: id }, orderBy: { position: 'asc' } });
    } catch (error: any) {
      console.warn('⚠️ ProductImage table not found, returning empty images array:', error.message);
    }

    return res.json({ message: 'Imagens enviadas com sucesso', created, images });
  } catch (error) {
    return next(error);
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

    try {
      await (prisma as any).productImage.delete({ where: { id: imageId } });
    } catch (error: any) {
      console.warn('⚠️ ProductImage table not found in delete, skipping deletion:', error.message);
      return res.status(404).json({ error: 'Imagem não encontrada ou tabela não existe' });
    }

    let images: any[] = [];
    try {
      images = await (prisma as any).productImage.findMany({ where: { productId: id }, orderBy: { position: 'asc' } });
    } catch (error: any) {
      console.warn('⚠️ ProductImage table not found after delete, returning empty array:', error.message);
    }

    return res.json({ message: 'Imagem removida', images });
  } catch (error) {
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
    const { quantity, reason = 'Adição manual de estoque' } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        error: 'Quantidade inválida',
        message: 'A quantidade deve ser maior que zero',
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

    // Atualizar estoque
    const newStock = product.stock + quantity;
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { stock: newStock },
      include: {
        category: true,
        pattern: true,
      },
    });

    // Registrar movimentação
    await prisma.stockMovement.create({
      data: {
        productId: id,
        type: 'ENTRY',
        quantity,
        reason,
        userId: req.user!.id,
      },
    });

    return res.json({
      message: `Estoque adicionado com sucesso. Novo estoque: ${newStock}`,
      product: updatedProduct,
      stockAdded: quantity,
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
    const { quantity, reason = 'Retirada manual de estoque' } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        error: 'Quantidade inválida',
        message: 'A quantidade deve ser maior que zero',
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

    // Verificar se há estoque suficiente
    if (product.stock < quantity) {
      return res.status(400).json({
        error: 'Estoque insuficiente',
        message: `Estoque atual: ${product.stock}. Não é possível retirar ${quantity} unidades.`,
        currentStock: product.stock,
        requestedQuantity: quantity,
      });
    }

    // Atualizar estoque
    const newStock = product.stock - quantity;
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { stock: newStock },
      include: {
        category: true,
        pattern: true,
      },
    });

    // Registrar movimentação
    await prisma.stockMovement.create({
      data: {
        productId: id,
        type: 'EXIT',
        quantity,
        reason,
        userId: req.user!.id,
      },
    });

    return res.json({
      message: `Estoque retirado com sucesso. Novo estoque: ${newStock}`,
      product: updatedProduct,
      stockRemoved: quantity,
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
            description: newDescription
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
      const updatedProduct = await prisma.product.findUnique({
        where: { id },
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