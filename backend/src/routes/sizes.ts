import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * components:
 *   schemas:
 *     Size:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         code:
 *           type: string
 *         active:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/sizes:
 *   get:
 *     summary: Listar todos os tamanhos
 *     tags: [Tamanhos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filtrar por tamanhos ativos
 *     responses:
 *       200:
 *         description: Lista de tamanhos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Size'
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { active } = req.query;

    const sizes = await prisma.size.findMany({
      where: active !== undefined ? { active: active === 'true' } : {},
      orderBy: { name: 'asc' }
    });

    res.json(sizes);
  } catch (error) {
    console.error('Erro ao listar tamanhos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /api/sizes/{id}:
 *   get:
 *     summary: Buscar tamanho por ID
 *     tags: [Tamanhos]
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
 *         description: Tamanho encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Size'
 *       404:
 *         description: Tamanho não encontrado
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const size = await prisma.size.findUnique({
      where: { id }
    });

    if (!size) {
      return res.status(404).json({ error: 'Tamanho não encontrado' });
    }

    return res.json(size);
  } catch (error) {
    console.error('Erro ao buscar tamanho:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /api/sizes:
 *   post:
 *     summary: Criar novo tamanho
 *     tags: [Tamanhos]
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
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               active:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Tamanho criado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Size'
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: Tamanho já existe
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, code, active = true } = req.body;

    // Validar dados obrigatórios
    if (!name || !code) {
      return res.status(400).json({ error: 'Nome e código são obrigatórios' });
    }

    // Validar formato do código
    if (!/^\d{1,2}$/.test(code)) {
      return res.status(400).json({
        error: 'Código inválido',
        message: 'O código deve ter 1 ou 2 dígitos numéricos (ex: 05, 10)',
      });
    }

    // Verificar se já existe
    const existingSize = await prisma.size.findFirst({
      where: {
        OR: [
          { name },
          { code }
        ]
      }
    });

    if (existingSize) {
      return res.status(409).json({ error: 'Tamanho ou código já existe' });
    }

    const size = await prisma.size.create({
      data: {
        name,
        code,
        active
      }
    });

    return res.status(201).json(size);
  } catch (error) {
    console.error('Erro ao criar tamanho:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /api/sizes/{id}:
 *   put:
 *     summary: Atualizar tamanho
 *     tags: [Tamanhos]
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
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Tamanho atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Size'
 *       404:
 *         description: Tamanho não encontrado
 *       409:
 *         description: Nome ou código já existe
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, active } = req.body;

    // Verificar se o tamanho existe
    const existingSize = await prisma.size.findUnique({
      where: { id }
    });

    if (!existingSize) {
      return res.status(404).json({ error: 'Tamanho não encontrado' });
    }

    // Verificar duplicatas (exceto o próprio registro)
    if (name || code) {
      const duplicate = await prisma.size.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                name ? { name } : {},
                code ? { code } : {}
              ]
            }
          ]
        }
      });

      if (duplicate) {
        return res.status(409).json({ error: 'Nome ou código já existe' });
      }
    }

    const size = await prisma.size.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(active !== undefined && { active })
      }
    });

    return res.json(size);
  } catch (error) {
    console.error('Erro ao atualizar tamanho:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /api/sizes/{id}:
 *   delete:
 *     summary: Deletar tamanho
 *     tags: [Tamanhos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Tamanho deletado
 *       404:
 *         description: Tamanho não encontrado
 *       409:
 *         description: Tamanho em uso
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o tamanho existe
    const existingSize = await prisma.size.findUnique({
      where: { id }
    });

    if (!existingSize) {
      return res.status(404).json({ error: 'Tamanho não encontrado' });
    }

    // Verificar se está em uso (quando implementarmos a relação com produtos)
    // const productsUsingSize = await prisma.product.count({
    //   where: { sizeId: id }
    // });

    // if (productsUsingSize > 0) {
    //   return res.status(409).json({ error: 'Tamanho em uso, não pode ser deletado' });
    // }

    await prisma.size.delete({
      where: { id }
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar tamanho:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router; 