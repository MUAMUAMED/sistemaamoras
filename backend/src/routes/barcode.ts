import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { BarcodeService } from '../services/barcode.service';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * components:
 *   schemas:
 *     GeneratedCodes:
 *       type: object
 *       properties:
 *         sku:
 *           type: string
 *           description: Código SKU no formato TTCCEEEE
 *         barcode:
 *           type: string
 *           description: Código de barras EAN-13
 *         qrcodeUrl:
 *           type: string
 *           description: QR Code em formato Data URL (Base64)
 */

/**
 * @swagger
 * /api/barcode/generate:
 *   post:
 *     summary: Gerar códigos de barras e QR code para produto
 *     tags: [Códigos]
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
 *               - categoryId
 *               - patternId
 *             properties:
 *               sizeId:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               patternId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Códigos gerados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GeneratedCodes'
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Tamanho, categoria ou estampa não encontrados
 */
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { sizeId, categoryId, subcategoryId, patternId } = req.body;

    // Validar dados obrigatórios
    if (!sizeId || !categoryId || !patternId) {
      return res.status(400).json({ error: 'sizeId, categoryId e patternId são obrigatórios' });
    }

    const codes = await BarcodeService.generateProductCodes({
      sizeId,
      categoryId,
      subcategoryId,
      patternId
    });

    return res.json(codes);
  } catch (error) {
    console.error('Erro ao gerar códigos:', error);
    if (error instanceof Error && error.message.includes('não encontrados')) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
  return;
});

/**
 * @swagger
 * /api/barcode/scan:
 *   post:
 *     summary: Escanear código de barras ou QR code
 *     tags: [Códigos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Código de barras ou SKU escaneado
 *     responses:
 *       200:
 *         description: Produto encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 product:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *                     stock:
 *                       type: integer
 *                     barcode:
 *                       type: string
 *                     category:
 *                       type: object
 *                     pattern:
 *                       type: object
 *                 isValid:
 *                   type: boolean
 *       404:
 *         description: Produto não encontrado
 */
router.post('/scan', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Código é obrigatório' });
    }

    // Buscar produto pelo código
    const product = await BarcodeService.findProductByCode(code);

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Validar código de barras se for um EAN-13
    const isValid = code.length === 13 ? BarcodeService.validateBarcode(code) : true;

    return res.json({
      product,
      isValid
    });
  } catch (error) {
    console.error('Erro ao escanear código:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
  return;
});

/**
 * @swagger
 * /api/barcode/validate:
 *   post:
 *     summary: Validar código de barras
 *     tags: [Códigos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - barcode
 *             properties:
 *               barcode:
 *                 type: string
 *                 description: Código de barras EAN-13
 *     responses:
 *       200:
 *         description: Resultado da validação
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isValid:
 *                   type: boolean
 *                 checkDigit:
 *                   type: string
 */
router.post('/validate', authenticateToken, async (req, res) => {
  try {
    const { barcode } = req.body;

    if (!barcode) {
      return res.status(400).json({ error: 'Código de barras é obrigatório' });
    }

    const isValid = BarcodeService.validateBarcode(barcode);
    const checkDigit = barcode.length === 13 ? barcode.slice(12) : null;

    return res.json({
      isValid,
      checkDigit
    });
  } catch (error) {
    console.error('Erro ao validar código:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
  return;
});

/**
 * @swagger
 * /api/barcode/parse-sku:
 *   post:
 *     summary: Analisar informações do SKU
 *     tags: [Códigos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sku
 *             properties:
 *               sku:
 *                 type: string
 *                 description: SKU no formato TTCCEEEE
 *     responses:
 *       200:
 *         description: Informações do SKU
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 skuInfo:
 *                   type: object
 *                   properties:
 *                     sizeCode:
 *                       type: string
 *                     categoryCode:
 *                       type: string
 *                     patternCode:
 *                       type: string
 *                 details:
 *                   type: object
 *                   properties:
 *                     size:
 *                       type: object
 *                     category:
 *                       type: object
 *                     pattern:
 *                       type: object
 *       400:
 *         description: SKU inválido
 */
router.post('/parse-sku', authenticateToken, async (req, res) => {
  try {
    const { sku } = req.body;

    if (!sku) {
      return res.status(400).json({ error: 'SKU é obrigatório' });
    }

    const skuInfo = BarcodeService.parseSkuInfo(sku);

    if (!skuInfo) {
      return res.status(400).json({ error: 'SKU inválido. Deve ter 8 dígitos no formato TTCCEEEE' });
    }

    // Buscar detalhes do tamanho, categoria e estampa
    const [size, category, pattern] = await Promise.all([
      prisma.size.findFirst({ where: { code: skuInfo.sizeCode } }),
      prisma.category.findFirst({ where: { code: skuInfo.categoryCode } }),
      prisma.pattern.findFirst({ where: { code: skuInfo.patternCode } })
    ]);

    return res.json({
      skuInfo,
      details: {
        size,
        category,
        pattern
      }
    });
  } catch (error) {
    console.error('Erro ao analisar SKU:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
  return;
});

/**
 * @swagger
 * /api/barcode/generate-sale-qr:
 *   post:
 *     summary: Gerar QR Code para venda
 *     tags: [Códigos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - saleId
 *             properties:
 *               saleId:
 *                 type: string
 *                 description: ID da venda
 *     responses:
 *       200:
 *         description: QR Code gerado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qrcodeUrl:
 *                   type: string
 *                   description: QR Code em formato Data URL
 *       404:
 *         description: Venda não encontrada
 */
router.post('/generate-sale-qr', authenticateToken, async (req, res) => {
  try {
    const { saleId } = req.body;

    if (!saleId) {
      return res.status(400).json({ error: 'ID da venda é obrigatório' });
    }

    // Buscar dados da venda
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: true,
        lead: {
          select: {
            name: true,
            phone: true
          }
        }
      }
    });

    if (!sale) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    const qrcodeUrl = await BarcodeService.generateSaleQRCode(sale);

    return res.json({ qrcodeUrl });
  } catch (error) {
    console.error('Erro ao gerar QR Code da venda:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
  return;
});

/**
 * @swagger
 * /api/barcode/test:
 *   get:
 *     summary: Testar geração de códigos com dados de exemplo
 *     tags: [Códigos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Códigos de teste gerados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GeneratedCodes'
 */
router.get('/test', authenticateToken, async (req, res) => {
  try {
    // Buscar dados de exemplo do banco
    const [size, category, pattern] = await Promise.all([
      prisma.size.findFirst({ where: { active: true } }),
      prisma.category.findFirst({ where: { active: true } }),
      prisma.pattern.findFirst({ where: { active: true } })
    ]);

    if (!size || !category || !pattern) {
      return res.status(404).json({ 
        error: 'Dados de exemplo não encontrados',
        message: 'Certifique-se de que existem tamanhos, categorias e estampas cadastrados'
      });
    }

    const codes = await BarcodeService.generateProductCodes({
      sizeId: size.id,
      categoryId: category.id,
      patternId: pattern.id
    });

    return res.json({
      codes,
      example: {
        size: { id: size.id, name: size.name, code: size.code },
        category: { id: category.id, name: category.name, code: category.code },
        pattern: { id: pattern.id, name: pattern.name, code: pattern.code }
      }
    });
  } catch (error) {
    console.error('Erro ao gerar códigos de teste:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
  return;
});

/**
 * @swagger
 * /api/barcode/codes:
 *   get:
 *     summary: Listar todos os códigos disponíveis (tamanhos, categorias, estampas)
 *     tags: [Códigos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de códigos disponíveis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sizes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       code:
 *                         type: string
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       code:
 *                         type: string
 *                 patterns:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       code:
 *                         type: string
 */
router.get('/codes', authenticateToken, async (req, res) => {
  try {
    const [sizes, categories, patterns] = await Promise.all([
      prisma.size.findMany({ 
        where: { active: true }, 
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' }
      }),
      prisma.category.findMany({ 
        where: { active: true }, 
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' }
      }),
      prisma.pattern.findMany({ 
        where: { active: true }, 
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' }
      })
    ]);

    res.json({
      sizes,
      categories,
      patterns,
      format: {
        description: 'Formato do código: TTCCEEEE',
        explanation: {
          TT: 'Tamanho (2 dígitos)',
          CC: 'Categoria (2 dígitos)',
          EEEE: 'Estampa (4 dígitos)'
        },
        example: {
          size: 'M (05)',
          category: 'Vestido (50)',
          pattern: 'Azul Marinho (0032)',
          result: '05500032'
        }
      }
    });
  } catch (error) {
    console.error('Erro ao listar códigos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
  return;
});

/**
 * @swagger
 * /api/barcode/validate-codes:
 *   get:
 *     summary: Validar e corrigir códigos existentes
 *     tags: [Códigos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Relatório de validação dos códigos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: array
 *                   items:
 *                     type: object
 *                 invalid:
 *                   type: array
 *                   items:
 *                     type: object
 *                 corrected:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/validate-codes', authenticateToken, async (req, res) => {
  try {
    // Buscar todos os tamanhos, categorias e estampas
    const [sizes, categories, patterns] = await Promise.all([
      prisma.size.findMany({ select: { id: true, name: true, code: true } }),
      prisma.category.findMany({ select: { id: true, name: true, code: true } }),
      prisma.pattern.findMany({ select: { id: true, name: true, code: true } })
    ]);

    const report = {
      valid: [] as any[],
      invalid: [] as any[],
      corrected: [] as any[]
    };

    // Validar tamanhos (máximo 2 dígitos)
    sizes.forEach(size => {
      const cleanCode = size.code.replace(/\D/g, '');
      if (/^\d{1,2}$/.test(cleanCode)) {
        report.valid.push({ type: 'size', ...size, code: cleanCode.padStart(2, '0') });
      } else {
        report.invalid.push({ type: 'size', ...size, issue: 'Código deve ter 1-2 dígitos numéricos' });
      }
    });

    // Validar categorias (máximo 2 dígitos)
    categories.forEach(category => {
      const cleanCode = category.code.replace(/\D/g, '');
      if (/^\d{1,2}$/.test(cleanCode)) {
        report.valid.push({ type: 'category', ...category, code: cleanCode.padStart(2, '0') });
      } else {
        report.invalid.push({ type: 'category', ...category, issue: 'Código deve ter 1-2 dígitos numéricos' });
      }
    });

    // Validar estampas (máximo 4 dígitos)
    patterns.forEach(pattern => {
      const cleanCode = pattern.code.replace(/\D/g, '');
      if (/^\d{1,4}$/.test(cleanCode)) {
        report.valid.push({ type: 'pattern', ...pattern, code: cleanCode.padStart(4, '0') });
      } else {
        report.invalid.push({ type: 'pattern', ...pattern, issue: 'Código deve ter 1-4 dígitos numéricos' });
      }
    });

    res.json({
      ...report,
      summary: {
        total: sizes.length + categories.length + patterns.length,
        valid: report.valid.length,
        invalid: report.invalid.length,
        corrected: report.corrected.length
      },
      recommendations: report.invalid.length > 0 ? [
        'Corrija os códigos inválidos para garantir compatibilidade com o sistema de códigos de barras',
        'Use apenas números nos códigos',
        'Tamanhos: máximo 2 dígitos',
        'Categorias: máximo 2 dígitos', 
        'Estampas: máximo 4 dígitos'
      ] : ['Todos os códigos estão válidos!']
    });
  } catch (error) {
    console.error('Erro ao validar códigos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
  return;
});

export default router; 