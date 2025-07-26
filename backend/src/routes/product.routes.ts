import { Router, Request, Response, NextFunction } from 'express';
import QRCode from 'qrcode';
import { prisma } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { uploadProductImage } from '../middleware/upload';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

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

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
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

    res.json({
      data: products,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
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

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        subcategory: true,
        pattern: true,
        stockMovements: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Produto não encontrado',
        message: 'O produto solicitado não foi encontrado',
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
    } = req.body;

    // Validar dados obrigatórios
    if (!name || !categoryId || !sizeId || !patternId || !price || stock === undefined) {
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

    if (!category || !size || !pattern) {
      return res.status(400).json({
        error: 'Categoria, tamanho ou estampa inválida',
        message: 'Categoria, tamanho ou estampa não encontrada',
      });
    }

    // Se subcategoria foi informada, verificar se ela existe e pertence à categoria
    if (subcategoryId) {
      if (!subcategory) {
        return res.status(400).json({
          error: 'Subcategoria inválida',
          message: 'Subcategoria não encontrada',
        });
      }

      if (subcategory.categoryId !== categoryId) {
        return res.status(400).json({
          error: 'Subcategoria inválida',
          message: 'A subcategoria não pertence à categoria especificada',
        });
      }
    }

    // Gerar código de barras
    const barcode = generateBarcode(size.code, category.code, subcategory?.code || null, pattern.code);

    // Verificar se código de barras já existe
    const existingProduct = await prisma.product.findUnique({
      where: { barcode },
      include: {
        category: true,
        pattern: true,
      },
    });

    if (existingProduct) {
      // Se produto já existe, adicionar ao estoque existente
      const newStock = existingProduct.stock + stock;
      
      const updatedProduct = await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          stock: newStock,
          price, // Atualizar preço também
          description: description || existingProduct.description, // Manter descrição existente se não informada
        },
        include: {
          category: true,
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
            userId: req.user!.id,
          },
        });
      }

      return res.status(200).json({
        ...updatedProduct,
        message: `Estoque adicionado ao produto existente. Novo estoque: ${newStock}`,
        stockAdded: stock,
      });
    }

    // Gerar QR Code
    const qrcodeUrl = await generateQRCode(barcode);

    // Criar produto
    const product = await prisma.product.create({
      data: {
        name,
        categoryId,
        subcategoryId,
        sizeId,
        patternId,
        price,
        stock,
        barcode,
        qrcodeUrl,
        description,
      },
      include: {
        category: true,
        subcategory: true,
        pattern: true,
      },
    });

    // Registrar movimentação de estoque inicial
    if (stock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: 'ENTRY',
          quantity: stock,
          reason: 'Estoque inicial',
          userId: req.user!.id,
        },
      });
    }

    return res.status(201).json({
      ...product,
      message: 'Produto criado com sucesso',
    });
  } catch (error) {
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
 *     responses:
 *       200:
 *         description: Produto atualizado com sucesso
 *       404:
 *         description: Produto não encontrado
 */
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, price, description, active } = req.body;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Produto não encontrado',
        message: 'O produto solicitado não foi encontrado',
      });
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(price && { price }),
        ...(description && { description }),
        ...(active !== undefined && { active }),
      },
      include: {
        category: true,
        pattern: true,
      },
    });

    return res.json(updatedProduct);
  } catch (error) {
    return next(error);
  }
  return;
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

    // Atualizar produto com URL da imagem
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { imageUrl },
      include: {
        category: true,
        pattern: true,
      },
    });

    return res.json({
      message: 'Imagem carregada com sucesso',
      product: updatedProduct,
      imageUrl,
    });
  } catch (error) {
    return next(error);
  }
  return;
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

export default router; 