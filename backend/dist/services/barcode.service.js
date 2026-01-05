"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarcodeService = void 0;
const qrcode_1 = __importDefault(require("qrcode"));
const database_1 = require("../config/database");
class BarcodeService {
    static async generateProductCodes(data) {
        try {
            const promises = [
                database_1.prisma.size.findUnique({ where: { id: data.sizeId }, select: { code: true } }),
                database_1.prisma.category.findUnique({ where: { id: data.categoryId }, select: { code: true } }),
                database_1.prisma.pattern.findUnique({ where: { id: data.patternId }, select: { code: true } })
            ];
            if (data.subcategoryId) {
                promises.push(database_1.prisma.subcategory.findUnique({ where: { id: data.subcategoryId }, select: { code: true } }));
            }
            const results = await Promise.all(promises);
            const [size, category, pattern, subcategory] = results;
            if (!size || !category || !pattern) {
                throw new Error('Tamanho, categoria ou estampa não encontrados');
            }
            if (data.subcategoryId && !subcategory) {
                throw new Error('Subcategoria não encontrada');
            }
            const sizeCode = this.validateAndFormatCode(size.code, 2, 'Tamanho');
            const categoryCode = this.validateAndFormatCode(category.code, 2, 'Categoria');
            const subcategoryCode = subcategory ? this.validateAndFormatCode(subcategory.code, 2, 'Subcategoria') : '00';
            const patternCode = this.validateAndFormatCode(pattern.code, 4, 'Estampa');
            const sku = `${sizeCode}${categoryCode}${subcategoryCode}${patternCode}`;
            const barcode = this.generateEAN13(sku);
            const qrcodeUrl = await this.generateQRCode(sku);
            return {
                sku,
                barcode,
                qrcodeUrl
            };
        }
        catch (error) {
            console.error('Erro ao gerar códigos:', error);
            throw error;
        }
    }
    static generateEAN13(sku) {
        const companyPrefix = '789';
        const productCode = sku.padStart(8, '0');
        const partialCode = companyPrefix + productCode;
        const checkDigit = this.calculateEAN13CheckDigit(partialCode);
        return partialCode + checkDigit;
    }
    static calculateEAN13CheckDigit(code) {
        let sum = 0;
        for (let i = 0; i < code.length; i++) {
            const digit = parseInt(code[i]);
            if (i % 2 === 0) {
                sum += digit;
            }
            else {
                sum += digit * 3;
            }
        }
        const remainder = sum % 10;
        const checkDigit = remainder === 0 ? 0 : 10 - remainder;
        return checkDigit.toString();
    }
    static async generateQRCode(sku) {
        try {
            const qrCodeDataUrl = await qrcode_1.default.toDataURL(sku, {
                errorCorrectionLevel: 'M',
                width: 256,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            return qrCodeDataUrl;
        }
        catch (error) {
            console.error('Erro ao gerar QR Code:', error);
            throw new Error('Falha ao gerar QR Code');
        }
    }
    static async generateSaleQRCode(saleData) {
        try {
            const qrData = {
                saleNumber: saleData.saleNumber,
                total: saleData.total,
                company: 'Amoras Capital',
                date: saleData.createdAt || new Date().toISOString(),
                items: saleData.items?.length || 0
            };
            const qrCodeDataUrl = await qrcode_1.default.toDataURL(JSON.stringify(qrData), {
                errorCorrectionLevel: 'M',
                width: 256,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            return qrCodeDataUrl;
        }
        catch (error) {
            console.error('Erro ao gerar QR Code da venda:', error);
            throw new Error('Falha ao gerar QR Code da venda');
        }
    }
    static validateBarcode(barcode) {
        if (barcode.length !== 13) {
            return false;
        }
        const code = barcode.slice(0, 12);
        const checkDigit = barcode.slice(12);
        const calculatedCheckDigit = this.calculateEAN13CheckDigit(code);
        return checkDigit === calculatedCheckDigit;
    }
    static parseSkuInfo(sku) {
        if (sku.length !== 10) {
            return null;
        }
        return {
            sizeCode: sku.substring(0, 2),
            categoryCode: sku.substring(2, 4),
            subcategoryCode: sku.substring(4, 6),
            patternCode: sku.substring(6, 10)
        };
    }
    static async findProductByCode(code) {
        try {
            let product = await database_1.prisma.product.findUnique({
                where: { barcode: code },
                include: {
                    category: true,
                    pattern: true
                }
            });
            if (!product && code.length === 10) {
                const skuInfo = this.parseSkuInfo(code);
                if (skuInfo) {
                    const whereClause = {
                        sizeCode: skuInfo.sizeCode,
                        category: {
                            code: skuInfo.categoryCode
                        },
                        pattern: {
                            code: skuInfo.patternCode
                        }
                    };
                    if (skuInfo.subcategoryCode !== '00') {
                        whereClause.subcategory = {
                            code: skuInfo.subcategoryCode
                        };
                    }
                    else {
                        whereClause.subcategoryId = null;
                    }
                    const products = await database_1.prisma.product.findMany({
                        where: whereClause,
                        include: {
                            category: true,
                            subcategory: true,
                            pattern: true
                        }
                    });
                    if (products.length > 0) {
                        product = products[0];
                    }
                }
            }
            return product;
        }
        catch (error) {
            console.error('Erro ao buscar produto por código:', error);
            return null;
        }
    }
    static async generateUniqueBarcode(sku) {
        let attempts = 0;
        const maxAttempts = 100;
        while (attempts < maxAttempts) {
            const barcode = this.generateEAN13(sku + attempts.toString().padStart(2, '0'));
            const existing = await database_1.prisma.product.findUnique({
                where: { barcode }
            });
            if (!existing) {
                return barcode;
            }
            attempts++;
        }
        throw new Error('Não foi possível gerar código de barras único');
    }
    static validateAndFormatCode(code, maxLength, type) {
        const cleanCode = code.replace(/\D/g, '');
        if (!/^\d+$/.test(cleanCode)) {
            throw new Error(`Código de ${type} deve conter apenas números`);
        }
        if (cleanCode.length > maxLength) {
            throw new Error(`Código de ${type} deve ter no máximo ${maxLength} dígitos`);
        }
        return cleanCode.padStart(maxLength, '0');
    }
}
exports.BarcodeService = BarcodeService;
//# sourceMappingURL=barcode.service.js.map