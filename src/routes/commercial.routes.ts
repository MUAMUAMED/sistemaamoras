import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/database';
import { authenticateToken, authorizeRoles, AuthenticatedRequest } from '../middleware/auth';
import { uploadProductImage } from '../middleware/upload';
import { createYampiCheckout, syncCommercialProductWithYampi } from '../services/yampi.service';

const router = Router();
const commercialAdmin = [authenticateToken, authorizeRoles('ADMIN', 'MANAGER')];
const uploadsBaseDir = process.env.UPLOADS_BASE_DIR || process.cwd();

const imageExists = (image: any) => {
  const url = image?.url;
  if (!url) return false;
  if (/^https?:\/\//i.test(url)) return true;
  if (!url.startsWith('/uploads/')) return true;

  const relativePath = url.replace(/^\/uploads\//, '');
  return fs.existsSync(path.join(uploadsBaseDir, 'uploads', relativePath));
};

const filterExistingImages = (images: any[] = []) => images.filter(imageExists);

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `item-${Date.now()}`;

const mapCommercialProduct = (item: any) => {
  const erpProduct = item.erpProduct;
  const availableQuantity = Math.max(0, erpProduct?.stockLoja ?? erpProduct?.stock ?? 0);

  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    description: item.description,
    shortDescription: item.shortDescription,
    published: item.published,
    featured: item.featured,
    position: item.position,
    category: item.category,
    images: filterExistingImages(item.images || []),
    seoTitle: item.seoTitle,
    seoDescription: item.seoDescription,
    material: item.material,
    careInstructions: item.careInstructions,
    colorNotes: item.colorNotes,
    erpProduct: erpProduct
      ? {
          id: erpProduct.id,
          name: erpProduct.name,
          description: erpProduct.description,
          price: erpProduct.price,
          active: erpProduct.active,
          status: erpProduct.status,
          stock: erpProduct.stock,
          stockLoja: erpProduct.stockLoja,
          stockArmazem: erpProduct.stockArmazem,
          availableQuantity,
          size: erpProduct.size,
          pattern: erpProduct.pattern,
          category: erpProduct.category,
          subcategory: erpProduct.subcategory,
          barcode: erpProduct.barcode,
          images: filterExistingImages(erpProduct.images || []),
        }
      : null,
  };
};

const commercialProductInclude = {
  category: true,
  images: {
    orderBy: [{ isCover: 'desc' }, { position: 'asc' }],
  },
  erpProduct: {
    include: {
      category: true,
      subcategory: true,
      size: true,
      pattern: true,
      images: {
        orderBy: { position: 'asc' },
      },
    },
  },
};

router.get('/catalog', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [categories, products] = await Promise.all([
      (prisma as any).commercialCategory.findMany({
        where: { active: true },
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
      }),
      (prisma as any).commercialProduct.findMany({
        where: {
          published: true,
          erpProduct: {
            active: true,
            status: 'ATIVO',
            stockLoja: { gt: 0 },
          },
        },
        include: commercialProductInclude,
        orderBy: [{ featured: 'desc' }, { position: 'asc' }, { updatedAt: 'desc' }],
      }),
    ]);

    return res.json({
      categories,
      products: products.map(mapCommercialProduct),
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length || items.length > 20) {
      return res.status(400).json({ error: 'Sacola invalida' });
    }
    const normalized = items.map((item: any) => ({
      commercialProductId: String(item.commercialProductId || ''),
      quantity: Number(item.quantity || 0),
    }));
    if (normalized.some((item: any) => !item.commercialProductId || item.quantity < 1 || item.quantity > 20)) {
      return res.status(400).json({ error: 'Itens da sacola invalidos' });
    }
    return res.json(await createYampiCheckout(normalized));
  } catch (error) {
    return next(error);
  }
});

router.get('/products/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await (prisma as any).commercialProduct.findUnique({
      where: { slug: req.params.slug },
      include: commercialProductInclude,
    });

    const availableQuantity = Math.max(0, product?.erpProduct?.stockLoja ?? product?.erpProduct?.stock ?? 0);
    if (!product || !product.published || !product.erpProduct?.active || product.erpProduct?.status !== 'ATIVO' || availableQuantity <= 0) {
      return res.status(404).json({ error: 'Produto nao encontrado no site comercial' });
    }

    return res.json(mapCommercialProduct(product));
  } catch (error) {
    return next(error);
  }
});

router.get('/settings', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await (prisma as any).commercialSiteSetting.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    return res.json(settings || {
      brandName: 'Amoras Capital',
      announcement: '10% off na primeira compra com o cupom AMORAS10',
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/admin/categories', commercialAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await (prisma as any).commercialCategory.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });

    return res.json(categories);
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/categories', commercialAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, slug, description, imageUrl, seoTitle, seoDescription, active = true, position = 0 } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome da categoria e obrigatorio' });
    }

    const category = await (prisma as any).commercialCategory.create({
      data: {
        name,
        slug: slug || slugify(name),
        description,
        imageUrl,
        seoTitle,
        seoDescription,
        active,
        position,
      },
    });

    return res.status(201).json(category);
  } catch (error) {
    return next(error);
  }
});

router.put('/admin/categories/:id', commercialAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, slug, description, imageUrl, seoTitle, seoDescription, active, position } = req.body;
    const category = await (prisma as any).commercialCategory.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(seoTitle !== undefined && { seoTitle }),
        ...(seoDescription !== undefined && { seoDescription }),
        ...(active !== undefined && { active }),
        ...(position !== undefined && { position }),
      },
    });

    return res.json(category);
  } catch (error) {
    return next(error);
  }
});

router.get('/admin/products', commercialAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await (prisma as any).commercialProduct.findMany({
      include: commercialProductInclude,
      orderBy: [{ published: 'desc' }, { updatedAt: 'desc' }],
    });

    return res.json(products.map(mapCommercialProduct));
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/products/:id/sync-yampi', commercialAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.json(await syncCommercialProductWithYampi(req.params.id));
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/products/publish/:erpProductId', commercialAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const erpProduct = await prisma.product.findUnique({
      where: { id: req.params.erpProductId },
      include: {
        category: true,
        size: true,
        pattern: true,
      },
    });

    if (!erpProduct) {
      return res.status(404).json({ error: 'Produto ERP nao encontrado' });
    }

    const title = req.body.title || erpProduct.name || 'Produto Amoras';
    const commercialProduct = await (prisma as any).commercialProduct.upsert({
      where: { erpProductId: erpProduct.id },
      create: {
        erpProductId: erpProduct.id,
        title,
        slug: req.body.slug || slugify(`${title}-${erpProduct.size?.name || ''}-${erpProduct.pattern?.name || ''}`),
        description: req.body.description || erpProduct.description,
        shortDescription: req.body.shortDescription,
        seoTitle: req.body.seoTitle,
        seoDescription: req.body.seoDescription,
        material: req.body.material,
        careInstructions: req.body.careInstructions,
        colorNotes: req.body.colorNotes,
        categoryId: req.body.categoryId || null,
        published: true,
        featured: Boolean(req.body.featured),
        position: req.body.position || 0,
      },
      update: {
        published: true,
        ...(req.body.title !== undefined && { title: req.body.title }),
        ...(req.body.slug !== undefined && { slug: req.body.slug }),
        ...(req.body.description !== undefined && { description: req.body.description }),
        ...(req.body.shortDescription !== undefined && { shortDescription: req.body.shortDescription }),
        ...(req.body.seoTitle !== undefined && { seoTitle: req.body.seoTitle }),
        ...(req.body.seoDescription !== undefined && { seoDescription: req.body.seoDescription }),
        ...(req.body.material !== undefined && { material: req.body.material }),
        ...(req.body.careInstructions !== undefined && { careInstructions: req.body.careInstructions }),
        ...(req.body.colorNotes !== undefined && { colorNotes: req.body.colorNotes }),
        ...(req.body.categoryId !== undefined && { categoryId: req.body.categoryId }),
        ...(req.body.featured !== undefined && { featured: req.body.featured }),
        ...(req.body.position !== undefined && { position: req.body.position }),
      },
      include: commercialProductInclude,
    });

    return res.json(mapCommercialProduct(commercialProduct));
  } catch (error) {
    return next(error);
  }
});

router.put('/admin/products/:id', commercialAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, slug, description, shortDescription, seoTitle, seoDescription, material, careInstructions, colorNotes, categoryId, published, featured, position } = req.body;
    const product = await (prisma as any).commercialProduct.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(shortDescription !== undefined && { shortDescription }),
        ...(seoTitle !== undefined && { seoTitle }),
        ...(seoDescription !== undefined && { seoDescription }),
        ...(material !== undefined && { material }),
        ...(careInstructions !== undefined && { careInstructions }),
        ...(colorNotes !== undefined && { colorNotes }),
        ...(categoryId !== undefined && { categoryId }),
        ...(published !== undefined && { published }),
        ...(featured !== undefined && { featured }),
        ...(position !== undefined && { position }),
      },
      include: commercialProductInclude,
    });

    return res.json(mapCommercialProduct(product));
  } catch (error) {
    return next(error);
  }
});

router.put('/admin/products/:id/unpublish', commercialAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await (prisma as any).commercialProduct.update({
      where: { id: req.params.id },
      data: { published: false },
      include: commercialProductInclude,
    });

    return res.json(mapCommercialProduct(product));
  } catch (error) {
    return next(error);
  }
});

router.post(
  '/admin/products/:id/images',
  authenticateToken,
  authorizeRoles('ADMIN', 'MANAGER'),
  uploadProductImage.array('images', 10),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await (prisma as any).commercialProduct.findUnique({
        where: { id: req.params.id },
        include: { images: true },
      });

      if (!product) {
        return res.status(404).json({ error: 'Produto comercial nao encontrado' });
      }

      const files = (req.files as Express.Multer.File[]) || [];
      if (!files.length) {
        return res.status(400).json({ error: 'Nenhuma imagem enviada' });
      }

      const replaceImages = req.query.replace === 'true';
      const currentCount = replaceImages ? 0 : (product.images?.length || 0);
      const operations = [
        ...(replaceImages
          ? [(prisma as any).commercialProductImage.deleteMany({
              where: { commercialProductId: product.id },
            })]
          : []),
        ...files.map((file, index) =>
          (prisma as any).commercialProductImage.create({
            data: {
              commercialProductId: product.id,
              url: `/uploads/products/${file.filename}`,
              alt: product.title,
              isCover: currentCount === 0 && index === 0,
              position: currentCount + index,
            },
          })
        ),
      ];
      const results = await prisma.$transaction(operations);
      const created = replaceImages ? results.slice(1) : results;

      return res.status(201).json({ images: created });
    } catch (error) {
      return next(error);
    }
  }
);

router.delete('/admin/products/:id/images/:imageId', commercialAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const image = await (prisma as any).commercialProductImage.findFirst({
      where: {
        id: req.params.imageId,
        commercialProductId: req.params.id,
      },
    });

    if (!image) {
      return res.status(404).json({ error: 'Imagem comercial nao encontrada' });
    }

    await (prisma as any).commercialProductImage.delete({
      where: { id: image.id },
    });

    if (image.isCover) {
      const nextImage = await (prisma as any).commercialProductImage.findFirst({
        where: { commercialProductId: req.params.id },
        orderBy: { position: 'asc' },
      });

      if (nextImage) {
        await (prisma as any).commercialProductImage.update({
          where: { id: nextImage.id },
          data: { isCover: true },
        });
      }
    }

    return res.json({ message: 'Imagem comercial removida' });
  } catch (error) {
    return next(error);
  }
});

router.put('/admin/products/:id/images/:imageId/cover', commercialAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const image = await (prisma as any).commercialProductImage.findFirst({
      where: {
        id: req.params.imageId,
        commercialProductId: req.params.id,
      },
    });

    if (!image) {
      return res.status(404).json({ error: 'Imagem comercial nao encontrada' });
    }

    const [, cover] = await prisma.$transaction([
      (prisma as any).commercialProductImage.updateMany({
        where: { commercialProductId: req.params.id },
        data: { isCover: false },
      }),
      (prisma as any).commercialProductImage.update({
        where: { id: req.params.imageId },
        data: { isCover: true },
      }),
    ]);

    return res.json(cover);
  } catch (error) {
    return next(error);
  }
});

router.get('/admin/settings', commercialAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await (prisma as any).commercialSiteSetting.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    return res.json(settings || null);
  } catch (error) {
    return next(error);
  }
});

router.put('/admin/settings', commercialAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { brandName, announcement, whatsappUrl, instagramUrl, heroTitle, heroSubtitle, seoTitle, seoDescription } = req.body;
    const existing = await (prisma as any).commercialSiteSetting.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    const data = {
      ...(brandName !== undefined && { brandName }),
      ...(announcement !== undefined && { announcement }),
      ...(whatsappUrl !== undefined && { whatsappUrl }),
      ...(instagramUrl !== undefined && { instagramUrl }),
      ...(heroTitle !== undefined && { heroTitle }),
      ...(heroSubtitle !== undefined && { heroSubtitle }),
      ...(seoTitle !== undefined && { seoTitle }),
      ...(seoDescription !== undefined && { seoDescription }),
    };

    const settings = existing
      ? await (prisma as any).commercialSiteSetting.update({ where: { id: existing.id }, data })
      : await (prisma as any).commercialSiteSetting.create({ data: { brandName: 'Amoras Capital', ...data } });

    return res.json(settings);
  } catch (error) {
    return next(error);
  }
});

export default router;
