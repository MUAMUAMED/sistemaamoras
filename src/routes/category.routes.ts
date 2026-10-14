import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Listar categorias
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });

    return res.json(categories);
  } catch (error) {
    return next(error);
  }
});

// Criar categoria
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { name, code, description } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Nome e código são obrigatórios',
      });
    }

    // Validar formato do código
    if (!/^\d{1,2}$/.test(code)) {
      return res.status(400).json({
        error: 'Código inválido',
        message: 'O código deve ter 1 ou 2 dígitos numéricos (ex: 10, 50)',
      });
    }

    // Verificar se código já existe
    const existingCategory = await prisma.category.findFirst({
      where: {
        OR: [
          { name },
          { code }
        ]
      }
    });

    if (existingCategory) {
      return res.status(409).json({
        error: 'Categoria já existe',
        message: existingCategory.name === name 
          ? 'Já existe uma categoria com este nome'
          : 'Já existe uma categoria com este código'
      });
    }

    const category = await prisma.category.create({
      data: { name, code, description },
    });

    return res.status(201).json(category);
  } catch (error) {
    return next(error);
  }
});

// Excluir categoria
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { force } = req.query;

    // Verificar se a categoria existe
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
            subcategories: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        error: 'Categoria não encontrada',
        message: 'A categoria solicitada não foi encontrada'
      });
    }

    // Verificar se há dependências (produtos ou subcategorias)
    const hasProducts = category._count.products > 0;
    const hasSubcategories = category._count.subcategories > 0;

    if ((hasProducts || hasSubcategories) && force !== 'true') {
      let message = 'Esta categoria não pode ser excluída porque possui:';
      const dependencies = [];
      
      if (hasProducts) {
        dependencies.push(`${category._count.products} produto(s)`);
      }
      if (hasSubcategories) {
        dependencies.push(`${category._count.subcategories} subcategoria(s)`);
      }
      
      message += ` ${dependencies.join(' e ')}.`;

      return res.status(409).json({
        error: 'Categoria em uso',
        message: message,
        canForce: true,
        details: {
          products: category._count.products,
          subcategories: category._count.subcategories
        }
      });
    }

    // Se for exclusão forçada, deletar dependências primeiro
    if (force === 'true') {
      await prisma.$transaction(async (tx) => {
        // 1. Deletar todos os produtos da categoria
        if (hasProducts) {
          await tx.product.deleteMany({
            where: { categoryId: id }
          });
        }

        // 2. Deletar todas as subcategorias da categoria
        if (hasSubcategories) {
          await tx.subcategory.deleteMany({
            where: { categoryId: id }
          });
        }

        // 3. Deletar a categoria
        await tx.category.delete({
          where: { id }
        });
      });

      return res.status(200).json({
        message: 'Categoria e dependências excluídas com sucesso',
        categoryName: category.name,
        deletedItems: {
          products: category._count.products,
          subcategories: category._count.subcategories
        }
      });
    }

    // Exclusão normal (sem dependências)
    await prisma.category.delete({
      where: { id }
    });

    return res.status(200).json({
      message: 'Categoria excluída com sucesso',
      categoryName: category.name
    });
  } catch (error) {
    return next(error);
  }
});

export default router; 