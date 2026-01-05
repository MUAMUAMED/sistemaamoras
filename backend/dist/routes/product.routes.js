"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const qrcode_1 = __importDefault(require("qrcode"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
function generateBarcode(sizeCode, categoryCode, subcategoryCode, patternCode) {
    const subCode = subcategoryCode || '00';
    return `${sizeCode}${categoryCode}${subCode}${patternCode}`;
}
async function generateQRCode(data) {
    try {
        const qrCodeDataURL = await qrcode_1.default.toDataURL(data);
        return qrCodeDataURL;
    }
    catch (error) {
        throw new Error('Erro ao gerar QR Code');
    }
}
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        console.log('🔍 [PRODUCT LIST] Iniciando busca de produtos');
        console.log('🔌 [PRODUCT LIST] Testando conexão com banco...');
        try {
            await database_1.prisma.$queryRaw `SELECT 1`;
            console.log('✅ [PRODUCT LIST] Conexão com banco OK');
        }
        catch (connError) {
            console.error('💥 [PRODUCT LIST] Erro de conexão:', connError.message);
            return res.status(500).json({
                error: 'Erro de conexão com banco de dados',
                message: 'Não foi possível conectar ao banco de dados'
            });
        }
        const { search, barcode, category, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        const where = {
            active: true,
        };
        if (search) {
            where.OR = [
                {
                    name: {
                        contains: search,
                        mode: 'insensitive',
                    },
                },
                {
                    barcode: {
                        contains: search,
                    },
                },
            ];
        }
        if (barcode) {
            where.barcode = barcode;
        }
        if (category) {
            where.categoryId = category;
        }
        console.log('📊 [PRODUCT LIST] Buscando produtos no banco...');
        let productsBase = [];
        let total = 0;
        try {
            const [products, count] = await Promise.all([
                database_1.prisma.product.findMany({
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
                database_1.prisma.product.count({ where }),
            ]);
            productsBase = products;
            total = count;
            console.log(`✅ [PRODUCT LIST] Encontrados ${total} produtos, retornando ${productsBase.length}`);
        }
        catch (dbError) {
            console.error('💥 [PRODUCT LIST] Erro ao buscar produtos no banco:', dbError.message);
            console.error('Stack trace:', dbError.stack);
            throw dbError;
        }
        const productIds = productsBase.map((p) => p.id);
        let imagesByProduct = {};
        if (productIds.length > 0) {
            console.log(`🖼️ [PRODUCT LIST] Buscando imagens para ${productIds.length} produtos...`);
            try {
                const allImages = await database_1.prisma.productImage.findMany({
                    where: { productId: { in: productIds } },
                    orderBy: { position: 'asc' },
                });
                imagesByProduct = allImages.reduce((acc, img) => {
                    (acc[img.productId] = acc[img.productId] || []).push(img);
                    return acc;
                }, {});
                console.log(`✅ [PRODUCT LIST] Encontradas imagens para ${Object.keys(imagesByProduct).length} produtos`);
            }
            catch (error) {
                console.warn('⚠️ [PRODUCT LIST] ProductImage table not found, returning empty images arrays:', error.message);
            }
        }
        const products = productsBase.map((p) => ({
            ...p,
            images: imagesByProduct[p.id] || [],
        }));
        console.log(`🎯 [PRODUCT LIST] Retornando ${products.length} produtos com imagens`);
        if (products.length > 0) {
            const sample = products.slice(0, 3);
            sample.forEach(p => {
                if (p.images && p.images.length > 0) {
                    console.log(`🖼️ [BACKEND IMAGE DEBUG] Produto ${p.id} (${p.name}):`, p.images.map((i) => i.url));
                }
            });
        }
        res.json({
            data: products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    }
    catch (error) {
        console.error('💥 [PRODUCT LIST] Erro geral:', error.message);
        console.error('💥 [PRODUCT LIST] Stack:', error.stack);
        return next(error);
    }
    return;
});
router.get('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const productBase = await database_1.prisma.product.findUnique({
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
        let images = [];
        try {
            images = await database_1.prisma.productImage.findMany({ where: { productId: id }, orderBy: { position: 'asc' } });
        }
        catch (error) {
            console.warn('⚠️ ProductImage table not found in product details, returning empty images array:', error.message);
        }
        const product = { ...productBase, images };
        if (images.length > 0) {
            console.log(`🖼️ [BACKEND IMAGE DEBUG] Detalhes do produto ${id}:`, images.map((i) => i.url));
        }
        return res.json(product);
    }
    catch (error) {
        return next(error);
    }
    return;
});
router.post('/', auth_1.authenticateToken, upload_1.uploadProductImage.array('files', 6), async (req, res, next) => {
    try {
        const { name, categoryId, subcategoryId, sizeId, patternId, price, cost, stock, description, initialLocation, } = req.body;
        const sanitizedCategoryId = categoryId === '' || categoryId === 'undefined' || categoryId === 'null' ? null : categoryId;
        const sanitizedSubcategoryId = subcategoryId === '' || subcategoryId === 'undefined' || subcategoryId === 'null' ? null : subcategoryId;
        const sanitizedPatternId = patternId === '' || patternId === 'undefined' || patternId === 'null' ? null : patternId;
        const sanitizedName = name === '' ? null : name;
        const sanitizedDescription = description === '' || description === 'undefined' || description === 'null' ? null : description;
        const parseOptionalFloat = (val) => {
            if (!val)
                return null;
            const strVal = val.toString();
            if (strVal === 'undefined' || strVal === 'null' || strVal.trim() === '')
                return null;
            const parsed = parseFloat(strVal.replace(',', '.'));
            return isNaN(parsed) ? null : parsed;
        };
        const parseOptionalInt = (val, defaultVal = 0) => {
            if (!val)
                return defaultVal;
            const strVal = val.toString();
            if (strVal === 'undefined' || strVal === 'null' || strVal.trim() === '')
                return defaultVal;
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
        if (!sizeId) {
            console.log('❌ [PRODUTO CREATE] SizeId obrigatório faltando');
            return res.status(400).json({
                error: 'Dados obrigatórios',
                message: 'Tamanho é obrigatório',
            });
        }
        const files = req.files;
        if (!files || files.length === 0) {
            console.log('❌ [PRODUTO CREATE] Foto obrigatória faltando');
            return res.status(400).json({
                error: 'Dados obrigatórios',
                message: 'Pelo menos uma foto é obrigatória',
            });
        }
        const categoryPromise = sanitizedCategoryId ? database_1.prisma.category.findUnique({ where: { id: sanitizedCategoryId } }).catch((e) => {
            console.error('❌ [PRODUTO CREATE] Erro ao buscar categoria:', e.message);
            return null;
        }) : Promise.resolve(null);
        const subcategoryPromise = sanitizedSubcategoryId ? database_1.prisma.subcategory.findUnique({ where: { id: sanitizedSubcategoryId } }).catch((e) => {
            console.error('❌ [PRODUTO CREATE] Erro ao buscar subcategoria:', e.message);
            return null;
        }) : Promise.resolve(null);
        const sizePromise = database_1.prisma.size.findUnique({ where: { id: sizeId } }).catch((e) => {
            console.error('❌ [PRODUTO CREATE] Erro ao buscar tamanho:', e.message);
            return null;
        });
        const patternPromise = sanitizedPatternId ? database_1.prisma.pattern.findUnique({ where: { id: sanitizedPatternId } }).catch((e) => {
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
        const generateRandomCode = () => {
            let result = '';
            for (let i = 0; i < 12; i++) {
                result += Math.floor(Math.random() * 10);
            }
            return result;
        };
        const randomCode = generateRandomCode();
        const finalName = sanitizedName || randomCode;
        const barcode = randomCode;
        const existingProduct = null;
        if (existingProduct) {
            console.log('⚠️ [PRODUTO CREATE] Produto já existe, adicionando estoque:', {
                existingProductId: existingProduct.id,
                existingProductName: existingProduct.name,
                currentStock: existingProduct.stock,
                addingStock: sanitizedStock,
                newStock: existingProduct.stock + sanitizedStock
            });
            const newStock = existingProduct.stock + sanitizedStock;
            const updatedProduct = await database_1.prisma.product.update({
                where: { id: existingProduct.id },
                data: {
                    stock: newStock,
                    stockLoja: initialLocation === 'LOJA' ? (existingProduct.stockLoja || 0) + sanitizedStock : existingProduct.stockLoja,
                    stockArmazem: initialLocation === 'ARMAZEM' ? (existingProduct.stockArmazem || 0) + sanitizedStock : existingProduct.stockArmazem,
                    price: sanitizedPrice !== null ? sanitizedPrice : existingProduct.price,
                    cost: sanitizedCost !== null ? sanitizedCost : existingProduct.cost,
                    description: sanitizedDescription || existingProduct.description,
                },
                include: {
                    category: true,
                    subcategory: true,
                    size: true,
                    pattern: true,
                },
            });
            if (sanitizedStock > 0) {
                await database_1.prisma.stockMovement.create({
                    data: {
                        productId: existingProduct.id,
                        type: 'ENTRY',
                        quantity: sanitizedStock,
                        reason: 'Adição de estoque via criação de produto',
                        location: initialLocation || 'LOJA',
                        userId: req.user.id,
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
        const qrcodeUrl = await generateQRCode(barcode);
        console.log('📱 [PRODUTO CREATE] QR Code gerado');
        const createData = {
            name: finalName,
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
            inProduction: true,
            status: 'PROCESSANDO',
        };
        console.log('💾 [PRODUTO CREATE] Dados que serão criados:', createData);
        try {
            console.log('🚀 [PRODUTO CREATE] Tentando criar produto no banco...');
            const product = await database_1.prisma.product.create({
                data: createData,
                include: {
                    category: true,
                    subcategory: true,
                    size: true,
                    pattern: true,
                },
            });
            if (files && files.length > 0) {
                console.log('📸 [PRODUTO CREATE] Salvando imagens:', files.length);
                const imagesData = files.map((file, index) => ({
                    productId: product.id,
                    url: `/uploads/products/${file.filename}`,
                    isMain: index === 0,
                    type: client_1.ProductImageType.ROUPA,
                    position: index
                }));
                console.log('📸 [PRODUTO CREATE] Dados das imagens:', imagesData);
                await database_1.prisma.productImage.createMany({
                    data: imagesData
                });
                await database_1.prisma.product.update({
                    where: { id: product.id },
                    data: { imageUrl: `/uploads/products/${files[0].filename}` }
                });
            }
            console.log('✅ [PRODUTO CREATE] Produto criado no banco com sucesso:', product.id);
        }
        catch (createError) {
            console.error('💥 [PRODUTO CREATE] Erro ao criar no banco:', {
                error: createError,
                message: createError?.message,
                code: createError?.code,
                meta: createError?.meta,
            });
            throw createError;
        }
        const foundProduct = await database_1.prisma.product.findUnique({
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
        if (sanitizedStock > 0) {
            await database_1.prisma.stockMovement.create({
                data: {
                    productId: foundProduct.id,
                    type: 'ENTRY',
                    quantity: sanitizedStock,
                    reason: 'Estoque inicial',
                    location: initialLocation || 'LOJA',
                    userId: req.user.id,
                },
            });
            console.log(`📦 [PRODUTO CREATE] Movimentação de estoque inicial registrada na ${initialLocation || 'LOJA'}`);
        }
        return res.status(201).json({
            ...foundProduct,
            message: 'Produto criado com sucesso',
        });
    }
    catch (error) {
        console.error('💥 [PRODUTO CREATE] Erro fatal:', error);
        return res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message || 'Algo deu errado',
            details: process.env.NODE_ENV === 'production' ? error.message : error.stack
        });
    }
});
router.put('/:id', auth_1.authenticateToken, upload_1.uploadProductImage.array('files', 6), async (req, res, next) => {
    try {
        const { id } = req.params;
        let { name, price, description, active, categoryId, subcategoryId, sizeId, patternId, stock, minStock, cost } = req.body;
        const sanitizeId = (val) => {
            if (val === undefined)
                return undefined;
            if (val === null || val === 'null' || val === 'undefined' || val === '')
                return null;
            return val;
        };
        const parseNumber = (val) => {
            if (val === undefined)
                return undefined;
            if (val === null || val === 'null' || val === 'undefined' || val === '')
                return null;
            const strVal = val.toString();
            const parsed = parseFloat(strVal.replace(',', '.'));
            return isNaN(parsed) ? undefined : parsed;
        };
        const parseIntVal = (val) => {
            if (val === undefined)
                return undefined;
            if (val === null || val === 'null' || val === 'undefined' || val === '')
                return null;
            const strVal = val.toString();
            const parsed = parseInt(strVal, 10);
            return isNaN(parsed) ? undefined : parsed;
        };
        categoryId = sanitizeId(categoryId);
        subcategoryId = sanitizeId(subcategoryId);
        sizeId = sanitizeId(sizeId);
        patternId = sanitizeId(patternId);
        price = parseNumber(price);
        cost = parseNumber(cost);
        stock = parseIntVal(stock);
        minStock = parseIntVal(minStock);
        if (active === 'true')
            active = true;
        if (active === 'false')
            active = false;
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
        const product = await database_1.prisma.product.findUnique({
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
            const [category, subcategory, size, pattern] = await Promise.all([
                finalCategoryId ? database_1.prisma.category.findUnique({ where: { id: finalCategoryId } }) : null,
                finalSubcategoryId ? database_1.prisma.subcategory.findUnique({ where: { id: finalSubcategoryId } }) : null,
                finalSizeId ? database_1.prisma.size.findUnique({ where: { id: finalSizeId } }) : null,
                finalPatternId ? database_1.prisma.pattern.findUnique({ where: { id: finalPatternId } }) : null,
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
            const existingProduct = await database_1.prisma.product.findFirst({
                where: {
                    barcode: newBarcode,
                    id: { not: id }
                }
            });
            if (existingProduct) {
                console.log('⚠️ [PRODUTO UPDATE] Código de barras já existe em outro produto. Iniciando MERGE...');
                console.log('🔄 [MERGE] Produto Rascunho:', { id, name: product.name, barcode: product.barcode });
                console.log('🔄 [MERGE] Produto Destino:', { id: existingProduct.id, name: existingProduct.name, barcode: existingProduct.barcode });
                const draftImages = await database_1.prisma.productImage.findMany({ where: { productId: id } });
                const existingImagesCount = await database_1.prisma.productImage.count({ where: { productId: existingProduct.id } });
                console.log(`📸 [MERGE] Movendo ${draftImages.length} imagens...`);
                for (let i = 0; i < draftImages.length; i++) {
                    await database_1.prisma.productImage.update({
                        where: { id: draftImages[i].id },
                        data: {
                            productId: existingProduct.id,
                            position: existingImagesCount + i
                        }
                    });
                }
                if (!existingProduct.imageUrl && product.imageUrl) {
                    await database_1.prisma.product.update({
                        where: { id: existingProduct.id },
                        data: { imageUrl: product.imageUrl }
                    });
                }
                const mergeUpdateData = {
                    ...(name && { name }),
                    ...(price !== undefined && { price }),
                    ...(cost !== undefined && { cost }),
                    ...(stock !== undefined && { stock: existingProduct.stock + stock }),
                    ...(minStock !== undefined && { minStock }),
                    ...(description !== undefined && { description }),
                    ...(active !== undefined && { active }),
                    categoryId: finalCategoryId,
                    subcategoryId: finalSubcategoryId,
                    sizeId: finalSizeId,
                    patternId: finalPatternId,
                };
                const mergedProduct = await database_1.prisma.product.update({
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
                console.log('🗑️ [MERGE] Deletando produto rascunho:', id);
                await database_1.prisma.product.delete({ where: { id } });
                console.log('✅ [MERGE] Merge concluído com sucesso!');
                return res.json({
                    ...mergedProduct,
                    message: 'Produto mesclado com sucesso ao existente.',
                    merged: true
                });
            }
        }
        const files = req.files;
        if (files && files.length > 0) {
            console.log('📸 [PRODUTO UPDATE] Processando novas imagens:', files.length);
            const existingImagesCount = await database_1.prisma.productImage.count({ where: { productId: id } });
            const imagesData = files.map((file, index) => ({
                productId: id,
                url: `/uploads/products/${file.filename}`,
                isMain: existingImagesCount === 0 && index === 0,
                type: client_1.ProductImageType.ROUPA,
                position: existingImagesCount + index
            }));
            await database_1.prisma.productImage.createMany({
                data: imagesData
            });
            if (!product.imageUrl) {
                await database_1.prisma.product.update({
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
        const updatedProduct = await database_1.prisma.product.update({
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
    }
    catch (error) {
        console.error('💥 [PRODUTO UPDATE] Erro:', error);
        return next(error);
    }
});
router.patch('/:id/stock', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { quantity, reason } = req.body;
        if (!quantity || !reason) {
            return res.status(400).json({
                error: 'Dados obrigatórios',
                message: 'Quantidade e motivo são obrigatórios',
            });
        }
        const product = await database_1.prisma.product.findUnique({
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
        const [updatedProduct] = await database_1.prisma.$transaction([
            database_1.prisma.product.update({
                where: { id },
                data: { stock: newStock },
                include: {
                    category: true,
                    subcategory: true,
                    size: true,
                    pattern: true,
                },
            }),
            database_1.prisma.stockMovement.create({
                data: {
                    productId: id,
                    type: quantity > 0 ? 'ENTRY' : 'EXIT',
                    quantity: Math.abs(quantity),
                    reason,
                    userId: req.user.id,
                },
            }),
        ]);
        return res.json(updatedProduct);
    }
    catch (error) {
        return next(error);
    }
    return;
});
router.delete('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const force = req.query.force === 'true';
        console.log(`🗑️ [PRODUTO DELETE] Iniciando exclusão do produto ${id} (force=${force})`);
        const product = await database_1.prisma.product.findUnique({ where: { id } });
        if (!product) {
            console.log('❌ [PRODUTO DELETE] Produto não encontrado');
            return res.status(404).json({
                error: 'Produto não encontrado',
                message: 'O produto solicitado não foi encontrado',
            });
        }
        const [salesCount, movementsCount, imagesCount] = await Promise.all([
            database_1.prisma.saleItem.count({ where: { productId: id } }),
            database_1.prisma.stockMovement.count({ where: { productId: id } }),
            database_1.prisma.productImage.count({ where: { productId: id } })
        ]);
        console.log('📊 [PRODUTO DELETE] Dependências encontradas:', {
            sales: salesCount,
            movements: movementsCount,
            images: imagesCount
        });
        if ((salesCount > 0 || movementsCount > 0) && !force) {
            console.log('⚠️ [PRODUTO DELETE] Produto tem vínculos, pedindo confirmação');
            return res.status(409).json({
                error: 'Produto vinculado',
                message: 'Este produto está vinculado a vendas ou movimentações. Deseja apagar mesmo assim?',
                canForce: true
            });
        }
        try {
            await database_1.prisma.$transaction(async (tx) => {
                if (imagesCount > 0) {
                    console.log(`🗑️ [PRODUTO DELETE] Deletando ${imagesCount} imagens...`);
                    await tx.productImage.deleteMany({ where: { productId: id } });
                }
                if (movementsCount > 0) {
                    console.log(`🗑️ [PRODUTO DELETE] Deletando ${movementsCount} movimentações...`);
                    await tx.stockMovement.deleteMany({ where: { productId: id } });
                }
                if (salesCount > 0) {
                    console.log(`🗑️ [PRODUTO DELETE] Deletando ${salesCount} itens de venda...`);
                    await tx.saleItem.deleteMany({ where: { productId: id } });
                }
                console.log('🗑️ [PRODUTO DELETE] Deletando produto...');
                await tx.product.delete({ where: { id } });
            });
            console.log('✅ [PRODUTO DELETE] Produto excluído com sucesso');
            return res.json({ message: 'Produto excluído com sucesso' });
        }
        catch (txError) {
            console.error('💥 [PRODUTO DELETE] Erro na transação:', txError.message);
            throw txError;
        }
    }
    catch (error) {
        console.error('💥 [PRODUTO DELETE] Erro geral:', error.message);
        if (error.code === 'P2003' || error.message?.includes('Foreign key constraint failed')) {
            return res.status(409).json({
                error: 'Produto vinculado',
                message: 'Não é possível excluir este produto porque ele está vinculado a outros registros.',
                canForce: true
            });
        }
        return next(error);
    }
});
router.post('/:id/image', auth_1.authenticateToken, upload_1.uploadProductImage.any(), async (req, res, next) => {
    try {
        const { id } = req.params;
        console.log('📸 [PRODUTO IMAGE UPLOAD] Iniciando upload para produto:', id);
        const files = req.files;
        if (!files || files.length === 0) {
            console.log('❌ [PRODUTO IMAGE UPLOAD] Nenhuma imagem recebida');
            return res.status(400).json({
                error: 'Nenhuma imagem enviada',
                message: 'É necessário enviar pelo menos uma imagem',
            });
        }
        console.log(`📸 [PRODUTO IMAGE UPLOAD] Recebidos ${files.length} arquivos`);
        const product = await database_1.prisma.product.findUnique({
            where: { id },
        });
        if (!product) {
            console.log('❌ [PRODUTO IMAGE UPLOAD] Produto não encontrado');
            files.forEach(f => {
                try {
                    fs_1.default.unlinkSync(f.path);
                }
                catch (e) { }
            });
            return res.status(404).json({
                error: 'Produto não encontrado',
                message: 'O produto solicitado não foi encontrado',
            });
        }
        const setAsMain = req.query.main === 'true';
        const typeParam = req.query.type?.toUpperCase();
        const imageType = typeParam === 'IA' ? 'IA' : 'ROUPA';
        const existingCount = await database_1.prisma.productImage.count({ where: { productId: id } });
        const createdImages = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const imageUrl = `/uploads/products/${file.filename}`;
            const isFirst = i === 0;
            try {
                const newImage = await database_1.prisma.productImage.create({
                    data: {
                        productId: id,
                        url: imageUrl,
                        type: imageType,
                        position: existingCount + i,
                        isMain: (existingCount === 0 && isFirst) || (setAsMain && isFirst)
                    }
                });
                createdImages.push(newImage);
                if ((existingCount === 0 && isFirst) || (setAsMain && isFirst)) {
                    await database_1.prisma.product.update({
                        where: { id },
                        data: { imageUrl }
                    });
                }
            }
            catch (error) {
                console.error('❌ [PRODUTO IMAGE UPLOAD] Erro ao salvar imagem no banco:', error.message);
            }
        }
        const allImages = await database_1.prisma.productImage.findMany({
            where: { productId: id },
            orderBy: { position: 'asc' }
        });
        const updatedProduct = await database_1.prisma.product.findUnique({
            where: { id },
            include: { category: true, pattern: true },
        });
        return res.json({
            message: 'Imagens carregadas com sucesso',
            product: { ...updatedProduct, images: allImages },
            images: createdImages,
            count: createdImages.length
        });
    }
    catch (error) {
        console.error('💥 [PRODUTO IMAGE UPLOAD] Erro fatal:', error);
        return next(error);
    }
});
router.get('/:id/images', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const product = await database_1.prisma.product.findUnique({ where: { id }, select: { id: true } });
        if (!product)
            return res.status(404).json({ error: 'Produto não encontrado' });
        let images = [];
        try {
            images = await database_1.prisma.productImage.findMany({
                where: { productId: id },
                orderBy: { position: 'asc' },
            });
        }
        catch (error) {
            console.warn('⚠️ ProductImage table not found in images list, returning empty array:', error.message);
        }
        return res.json({ images });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/:id/images', auth_1.authenticateToken, upload_1.uploadProductImage.array('images', 6), async (req, res, next) => {
    try {
        const { id } = req.params;
        const typeParam = req.query.type?.toUpperCase();
        const imageType = typeParam === 'IA' ? 'IA' : 'ROUPA';
        if (!req.files || !req.files.length) {
            return res.status(400).json({ error: 'Nenhuma imagem enviada' });
        }
        const product = await database_1.prisma.product.findUnique({ where: { id } });
        if (!product)
            return res.status(404).json({ error: 'Produto não encontrado' });
        const files = req.files || [];
        let currentImageCount = 0;
        try {
            currentImageCount = await database_1.prisma.productImage.count({ where: { productId: id } });
        }
        catch (error) {
            console.warn('⚠️ ProductImage table not found, allowing all uploads:', error.message);
        }
        const remainingSlots = Math.max(0, 6 - currentImageCount);
        const filesToProcess = files.slice(0, remainingSlots);
        if (filesToProcess.length < files.length) {
            return res.status(400).json({
                error: 'Limite de imagens excedido',
                message: `Máximo de 6 imagens por produto. Espaços disponíveis: ${remainingSlots}`
            });
        }
        let created = [];
        try {
            created = await database_1.prisma.$transaction(filesToProcess.map((file, index) => database_1.prisma.productImage.create({
                data: {
                    productId: id,
                    url: `/uploads/products/${file.filename}`,
                    type: imageType,
                    position: currentImageCount + index,
                },
            })));
        }
        catch (error) {
            console.warn('⚠️ ProductImage table not found, skipping image record creation:', error.message);
            return res.json({ message: 'Imagens enviadas com sucesso (modo compatibilidade)', created: [], images: [] });
        }
        let images = [];
        try {
            images = await database_1.prisma.productImage.findMany({ where: { productId: id }, orderBy: { position: 'asc' } });
        }
        catch (error) {
            console.warn('⚠️ ProductImage table not found, returning empty images array:', error.message);
        }
        return res.json({ message: 'Imagens enviadas com sucesso', created, images });
    }
    catch (error) {
        return next(error);
    }
});
router.delete('/:id/images/:imageId', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id, imageId } = req.params;
        const product = await database_1.prisma.product.findUnique({ where: { id } });
        if (!product)
            return res.status(404).json({ error: 'Produto não encontrado' });
        try {
            await database_1.prisma.productImage.delete({ where: { id: imageId } });
        }
        catch (error) {
            console.warn('⚠️ ProductImage table not found in delete, skipping deletion:', error.message);
            return res.status(404).json({ error: 'Imagem não encontrada ou tabela não existe' });
        }
        let images = [];
        try {
            images = await database_1.prisma.productImage.findMany({ where: { productId: id }, orderBy: { position: 'asc' } });
        }
        catch (error) {
            console.warn('⚠️ ProductImage table not found after delete, returning empty array:', error.message);
        }
        return res.json({ message: 'Imagem removida', images });
    }
    catch (error) {
        return next(error);
    }
});
router.get('/search/:code', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { code } = req.params;
        const product = await database_1.prisma.product.findFirst({
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
    }
    catch (error) {
        return next(error);
    }
    return;
});
router.put('/:id/stock/add', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { quantity, reason = 'Adição manual de estoque' } = req.body;
        if (!quantity || quantity <= 0) {
            return res.status(400).json({
                error: 'Quantidade inválida',
                message: 'A quantidade deve ser maior que zero',
            });
        }
        const product = await database_1.prisma.product.findUnique({
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
        const newStock = product.stock + quantity;
        const updatedProduct = await database_1.prisma.product.update({
            where: { id },
            data: { stock: newStock },
            include: {
                category: true,
                pattern: true,
            },
        });
        await database_1.prisma.stockMovement.create({
            data: {
                productId: id,
                type: 'ENTRY',
                quantity,
                reason,
                userId: req.user.id,
            },
        });
        return res.json({
            message: `Estoque adicionado com sucesso. Novo estoque: ${newStock}`,
            product: updatedProduct,
            stockAdded: quantity,
            previousStock: product.stock,
            newStock,
        });
    }
    catch (error) {
        return next(error);
    }
});
router.put('/:id/stock/remove', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { quantity, reason = 'Retirada manual de estoque' } = req.body;
        if (!quantity || quantity <= 0) {
            return res.status(400).json({
                error: 'Quantidade inválida',
                message: 'A quantidade deve ser maior que zero',
            });
        }
        const product = await database_1.prisma.product.findUnique({
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
        if (product.stock < quantity) {
            return res.status(400).json({
                error: 'Estoque insuficiente',
                message: `Estoque atual: ${product.stock}. Não é possível retirar ${quantity} unidades.`,
                currentStock: product.stock,
                requestedQuantity: quantity,
            });
        }
        const newStock = product.stock - quantity;
        const updatedProduct = await database_1.prisma.product.update({
            where: { id },
            data: { stock: newStock },
            include: {
                category: true,
                pattern: true,
            },
        });
        await database_1.prisma.stockMovement.create({
            data: {
                productId: id,
                type: 'EXIT',
                quantity,
                reason,
                userId: req.user.id,
            },
        });
        return res.json({
            message: `Estoque retirado com sucesso. Novo estoque: ${newStock}`,
            product: updatedProduct,
            stockRemoved: quantity,
            previousStock: product.stock,
            newStock,
        });
    }
    catch (error) {
        return next(error);
    }
});
router.get('/:id/stock/history', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const product = await database_1.prisma.product.findUnique({
            where: { id },
            select: { id: true, name: true, stock: true },
        });
        if (!product) {
            return res.status(404).json({
                error: 'Produto não encontrado',
                message: 'Produto não encontrado',
            });
        }
        const movements = await database_1.prisma.stockMovement.findMany({
            where: { productId: id },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({
            product,
            movements,
            totalMovements: movements.length,
        });
    }
    catch (error) {
        return next(error);
    }
});
router.patch('/:id/stock/add-location', auth_1.authenticateToken, async (req, res, next) => {
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
        const product = await database_1.prisma.product.findUnique({
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
        const [updatedProduct] = await database_1.prisma.$transaction([
            database_1.prisma.product.update({
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
            database_1.prisma.stockMovement.create({
                data: {
                    productId: id,
                    type: 'ENTRY',
                    quantity,
                    reason,
                    location,
                    userId: req.user.id,
                },
            }),
        ]);
        return res.json(updatedProduct);
    }
    catch (error) {
        return next(error);
    }
});
router.patch('/:id/stock/remove-location', auth_1.authenticateToken, async (req, res, next) => {
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
        const product = await database_1.prisma.product.findUnique({
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
        const [updatedProduct] = await database_1.prisma.$transaction([
            database_1.prisma.product.update({
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
            database_1.prisma.stockMovement.create({
                data: {
                    productId: id,
                    type: 'EXIT',
                    quantity,
                    reason,
                    location,
                    userId: req.user.id,
                },
            }),
        ]);
        return res.json(updatedProduct);
    }
    catch (error) {
        return next(error);
    }
});
router.patch('/:id/stock/transfer', auth_1.authenticateToken, async (req, res, next) => {
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
        const product = await database_1.prisma.product.findUnique({
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
        const [updatedProduct] = await database_1.prisma.$transaction([
            database_1.prisma.product.update({
                where: { id },
                data: {
                    [fromStockField]: newFromStock,
                    [toStockField]: newToStock
                },
                include: {
                    category: true,
                    subcategory: true,
                    size: true,
                    pattern: true,
                },
            }),
            database_1.prisma.stockMovement.create({
                data: {
                    productId: id,
                    type: 'TRANSFER',
                    quantity,
                    reason,
                    fromLocation,
                    toLocation,
                    userId: req.user.id,
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
    }
    catch (error) {
        return next(error);
    }
});
router.put('/:id/finish-production', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        console.log(`🏭 [PRODUTO FINISH-PRODUCTION] Finalizando processamento do produto: ${id}`);
        const existingProduct = await database_1.prisma.product.findUnique({
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
        const product = existingProduct;
        console.log('🔍 [DEBUG FINISH] Produto encontrado:', {
            id: product.id,
            name: product.name,
            description: product.description,
            hasInProduction: 'inProduction' in product,
            inProductionValue: product.inProduction,
            hasFinalizadoMark: product.description ? product.description.includes('[FINALIZADO]') : false,
        });
        const isInProduction = product.inProduction !== undefined ? product.inProduction : true;
        console.log('🔍 [DEBUG FINISH] isInProduction:', isInProduction);
        console.log('🔍 [DEBUG FINISH] Descrição atual:', product.description);
        console.log('🔄 [DEBUG FINISH] Tentando atualizar produto...');
        console.log('🔄 [DEBUG FINISH] ID do produto:', id);
        let currentDescription = product.description || '';
        console.log('🔄 [DEBUG FINISH] Descrição original:', JSON.stringify(currentDescription));
        if (!currentDescription.includes('[FINALIZADO]')) {
            const newDescription = currentDescription + ' [FINALIZADO]';
            console.log('🔄 [DEBUG FINISH] Nova descrição calculada:', JSON.stringify(newDescription));
            try {
                console.log('🔄 [DEBUG FINISH] Executando UPDATE no banco...');
                const updatedProduct = await database_1.prisma.product.update({
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
                const verificacao = await database_1.prisma.product.findUnique({
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
            }
            catch (updateError) {
                console.error('💥 [DEBUG FINISH] Erro no UPDATE:', updateError);
                throw updateError;
            }
        }
        else {
            console.log('⚠️ [DEBUG FINISH] Produto já tinha marca [FINALIZADO], não atualizando');
            const updatedProduct = await database_1.prisma.product.findUnique({
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
    }
    catch (error) {
        console.error('💥 [PRODUTO FINISH-PRODUCTION] Erro:', error);
        return next(error);
    }
});
router.get('/debug/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const product = await database_1.prisma.product.findUnique({
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
    }
    catch (error) {
        console.error('💥 [DEBUG] Erro:', error);
        return next(error);
    }
});
exports.default = router;
//# sourceMappingURL=product.routes.js.map