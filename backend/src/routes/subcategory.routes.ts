import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { authenticateToken } from '../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Subcategorias
 *   description: Gerenciamento de subcategorias de produtos
 */

/**
 * @swagger
 * /api/subcategories:
 *   get:
 *     summary: Listar subcategorias
 *     tags: [Subcategorias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filtrar por categoria
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filtrar por status ativo
 *     responses:
 *       200:
 *         description: Lista de subcategorias
 */
router.get('/', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { categoryId, active } = req.query;

    const where: any = {};

    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    if (active !== undefined) {
      where.active = active === 'true';
    } else {
      where.active = true; // Por padrão, mostrar apenas ativos
    }

    const subcategories = await prisma.subcategory.findMany({
      where,
      include: {
        category: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: [
        { category: { name: 'asc' } },
        { name: 'asc' },
      ],
    });

    res.json(subcategories);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/subcategories/{id}:
 *   get:
 *     summary: Buscar subcategoria por ID
 *     tags: [Subcategorias]
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
 *         description: Subcategoria encontrada
 *       404:
 *         description: Subcategoria não encontrada
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const subcategory = await prisma.subcategory.findUnique({
      where: { id },
      include: {
        category: true,
        products: {
          include: {
            category: true,
            pattern: true,
          },
        },
      },
    });

    if (!subcategory) {
      return res.status(404).json({
        error: 'Subcategoria não encontrada',
        message: 'A subcategoria solicitada não foi encontrada',
      });
    }

    res.json(subcategory);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/subcategories:
 *   post:
 *     summary: Criar nova subcategoria
 *     tags: [Subcategorias]
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
 *               - code
 *               - categoryId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome da subcategoria
 *               code:
 *                 type: string
 *                 description: Código de 2 dígitos da subcategoria
 *               description:
 *                 type: string
 *                 description: Descrição da subcategoria
 *               categoryId:
 *                 type: string
 *                 description: ID da categoria pai
 *     responses:
 *       201:
 *         description: Subcategoria criada com sucesso
 *       400:
 *         description: Dados inválidos
 */
router.post('/', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, code, description, categoryId } = req.body;

    // Validar dados obrigatórios
    if (!name || !code || !categoryId) {
      return res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Nome, código e categoria são obrigatórios',
      });
    }

    // Validar formato do código (2 dígitos)
    if (!/^\d{2}$/.test(code)) {
      return res.status(400).json({
        error: 'Código inválido',
        message: 'O código deve ter exatamente 2 dígitos numéricos',
      });
    }

    // Verificar se a categoria existe
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return res.status(400).json({
        error: 'Categoria não encontrada',
        message: 'A categoria especificada não foi encontrada',
      });
    }

    // Verificar se o nome já existe na categoria
    const existingName = await prisma.subcategory.findUnique({
      where: {
        categoryId_name: {
          categoryId,
          name,
        },
      },
    });

    if (existingName) {
      return res.status(400).json({
        error: 'Nome já existe',
        message: `Já existe uma subcategoria com o nome '${name}' nesta categoria`,
      });
    }

    // Verificar se o código já existe na categoria
    const existingCode = await prisma.subcategory.findUnique({
      where: {
        categoryId_code: {
          categoryId,
          code,
        },
      },
    });

    if (existingCode) {
      return res.status(400).json({
        error: 'Código já existe',
        message: `Já existe uma subcategoria com o código '${code}' nesta categoria`,
      });
    }

    const subcategory = await prisma.subcategory.create({
      data: {
        name,
        code,
        description,
        categoryId,
      },
      include: {
        category: true,
      },
    });

    res.status(201).json(subcategory);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/subcategories/{id}:
 *   put:
 *     summary: Atualizar subcategoria
 *     tags: [Subcategorias]
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
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Subcategoria atualizada
 *       404:
 *         description: Subcategoria não encontrada
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, code, description, active } = req.body;

    // Verificar se a subcategoria existe
    const existingSubcategory = await prisma.subcategory.findUnique({
      where: { id },
    });

    if (!existingSubcategory) {
      return res.status(404).json({
        error: 'Subcategoria não encontrada',
        message: 'A subcategoria solicitada não foi encontrada',
      });
    }

    // Validar código se fornecido
    if (code && !/^\d{2}$/.test(code)) {
      return res.status(400).json({
        error: 'Código inválido',
        message: 'O código deve ter exatamente 2 dígitos numéricos',
      });
    }

    // Verificar conflitos apenas se os valores mudaram
    const updateData: any = {};

    if (name && name !== existingSubcategory.name) {
      const existingName = await prisma.subcategory.findUnique({
        where: {
          categoryId_name: {
            categoryId: existingSubcategory.categoryId,
            name,
          },
        },
      });

      if (existingName) {
        return res.status(400).json({
          error: 'Nome já existe',
          message: `Já existe uma subcategoria com o nome '${name}' nesta categoria`,
        });
      }
      updateData.name = name;
    }

    if (code && code !== existingSubcategory.code) {
      const existingCode = await prisma.subcategory.findUnique({
        where: {
          categoryId_code: {
            categoryId: existingSubcategory.categoryId,
            code,
          },
        },
      });

      if (existingCode) {
        return res.status(400).json({
          error: 'Código já existe',
          message: `Já existe uma subcategoria com o código '${code}' nesta categoria`,
        });
      }
      updateData.code = code;
    }

    if (description !== undefined) updateData.description = description;
    if (active !== undefined) updateData.active = active;

    const subcategory = await prisma.subcategory.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });

    res.json(subcategory);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/subcategories/{id}:
 *   delete:
 *     summary: Excluir subcategoria
 *     tags: [Subcategorias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: force
 *         schema:
 *           type: string
 *         description: Forçar exclusão mesmo com produtos
 *     responses:
 *       200:
 *         description: Subcategoria excluída
 *       400:
 *         description: Subcategoria tem produtos associados
 *       404:
 *         description: Subcategoria não encontrada
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { force } = req.query;

    const subcategory = await prisma.subcategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!subcategory) {
      return res.status(404).json({
        error: 'Subcategoria não encontrada',
        message: 'A subcategoria solicitada não foi encontrada',
      });
    }

    // Verificar se há produtos associados
    if (subcategory._count.products > 0 && force !== 'true') {
      return res.status(400).json({
        error: 'Subcategoria possui produtos',
        message: `Esta subcategoria possui ${subcategory._count.products} produto(s) associado(s). Use force=true para excluir mesmo assim.`,
        productsCount: subcategory._count.products,
      });
    }

    await prisma.subcategory.delete({
      where: { id },
    });

    res.json({
      message: 'Subcategoria excluída com sucesso',
      subcategory: subcategory.name,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/subcategories/category/{categoryId}:
 *   get:
 *     summary: Listar subcategorias de uma categoria específica
 *     tags: [Subcategorias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de subcategorias da categoria
 */
router.get('/category/:categoryId', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { categoryId } = req.params;

    const subcategories = await prisma.subcategory.findMany({
      where: {
        categoryId,
        active: true,
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json(subcategories);
  } catch (error) {
    next(error);
  }
});

export default router; 