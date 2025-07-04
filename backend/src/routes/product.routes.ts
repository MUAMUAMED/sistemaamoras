import { Router } from 'express';
import QRCode from 'qrcode';
import { prisma } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { uploadProductImage } from '../middleware/upload';

const router = Router();

// Função para gerar código de barras
function generateBarcode(sizeCode: string, categoryCode: string, patternCode: string): string {
  return `${sizeCode}${categoryCode}${patternCode}`;
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
      where.name = {
        contains: search as string,
        mode: 'insensitive',
      };
    }

    if (barcode) {
      where.barcode = barcode as string;
    }

    if (category) {
      where.category = {
        name: {
          contains: category as string,
          mode: 'insensitive',
        },
      };
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
    next(error);
  }
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

    res.json(product);
  } catch (error) {
    next(error);
  }
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
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const {
      name,
      categoryId,
      size,
      sizeCode,
      patternId,
      price,
      stock,
      description,
    } = req.body;

    // Validar dados obrigatórios
    if (!name || !categoryId || !size || !sizeCode || !patternId || !price || stock === undefined) {
      return res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Nome, categoria, tamanho, código do tamanho, estampa, preço e estoque são obrigatórios',
      });
    }

    // Buscar categoria e estampa para gerar código de barras
    const [category, pattern] = await Promise.all([
      prisma.category.findUnique({ where: { id: categoryId } }),
      prisma.pattern.findUnique({ where: { id: patternId } }),
    ]);

    if (!category || !pattern) {
      return res.status(400).json({
        error: 'Categoria ou estampa inválida',
        message: 'Categoria ou estampa não encontrada',
      });
    }

    // Gerar código de barras
    const barcode = generateBarcode(sizeCode, category.code, pattern.code);

    // Verificar se código de barras já existe
    const existingProduct = await prisma.product.findUnique({
      where: { barcode },
    });

    if (existingProduct) {
      return res.status(409).json({
        error: 'Código de barras já existe',
        message: 'Já existe um produto com este código de barras',
      });
    }

    // Gerar QR Code
    const qrcodeUrl = await generateQRCode(barcode);

    // Criar produto
    const product = await prisma.product.create({
      data: {
        name,
        categoryId,
        size,
        sizeCode,
        patternId,
        price,
        stock,
        barcode,
        qrcodeUrl,
        description,
      },
      include: {
        category: true,
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
        },
      });
    }

    res.status(201).json(product);
  } catch (error) {
    next(error);
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

    res.json(updatedProduct);
  } catch (error) {
    next(error);
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
 *               - type
 *               - reason
 *             properties:
 *               quantity:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [ENTRY, EXIT, ADJUSTMENT]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Estoque atualizado com sucesso
 */
router.patch('/:id/stock', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, type, reason } = req.body;

    if (!quantity || !type || !reason) {
      return res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Quantidade, tipo e motivo são obrigatórios',
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

    // Calcular novo estoque
    let newStock = product.stock;
    
    switch (type) {
      case 'ENTRY':
        newStock += quantity;
        break;
      case 'EXIT':
        newStock -= quantity;
        break;
      case 'ADJUSTMENT':
        newStock = quantity;
        break;
    }

    if (newStock < 0) {
      return res.status(400).json({
        error: 'Estoque insuficiente',
        message: 'O estoque não pode ficar negativo',
      });
    }

    // Atualizar estoque e registrar movimentação
    const [updatedProduct] = await Promise.all([
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
          type,
          quantity,
          reason,
        },
      }),
    ]);

    res.json(updatedProduct);
  } catch (error) {
    next(error);
  }
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
    next(error);
  }
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

    res.json({
      message: 'Imagem carregada com sucesso',
      product: updatedProduct,
      imageUrl,
    });
  } catch (error) {
    next(error);
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
    res.json(product);
  } catch (error) {
    next(error);
  }
});

export default router; 