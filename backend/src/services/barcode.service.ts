import QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ProductCodeData {
  sizeId: string;
  categoryId: string;
  subcategoryId?: string;
  patternId: string;
}

export interface GeneratedCodes {
  sku: string;
  barcode: string;
  qrcodeUrl: string;
}

/**
 * Gera código no formato TTCCEEEE
 * TT = Tamanho (2 dígitos)
 * CC = Categoria (2 dígitos) 
 * EEEE = Estampa (4 dígitos)
 */
export class BarcodeService {
  /**
   * Gera SKU, código de barras e QR code para um produto
   */
  static async generateProductCodes(data: ProductCodeData): Promise<GeneratedCodes> {
    try {
      // Buscar códigos do tamanho, categoria, subcategoria (se informada) e estampa
      const promises = [
        prisma.size.findUnique({ where: { id: data.sizeId }, select: { code: true } }),
        prisma.category.findUnique({ where: { id: data.categoryId }, select: { code: true } }),
        prisma.pattern.findUnique({ where: { id: data.patternId }, select: { code: true } })
      ];

      // Adicionar subcategoria se informada
      if (data.subcategoryId) {
        promises.push(
          prisma.subcategory.findUnique({ where: { id: data.subcategoryId }, select: { code: true } })
        );
      }

      const results = await Promise.all(promises);
      const [size, category, pattern, subcategory] = results;

      if (!size || !category || !pattern) {
        throw new Error('Tamanho, categoria ou estampa não encontrados');
      }

      // Se subcategoria foi informada, verificar se ela existe
      if (data.subcategoryId && !subcategory) {
        throw new Error('Subcategoria não encontrada');
      }

      // Validar e formatar códigos
      const sizeCode = this.validateAndFormatCode(size.code, 2, 'Tamanho');
      const categoryCode = this.validateAndFormatCode(category.code, 2, 'Categoria');
      const subcategoryCode = subcategory ? this.validateAndFormatCode(subcategory.code, 2, 'Subcategoria') : '00';
      const patternCode = this.validateAndFormatCode(pattern.code, 4, 'Estampa');

      // Gerar SKU no formato TTCCSSEEEE (adicionando subcategoria)
      const sku = `${sizeCode}${categoryCode}${subcategoryCode}${patternCode}`;

      // Gerar código de barras (EAN-13 baseado no SKU)
      const barcode = this.generateEAN13(sku);

      // Gerar QR Code contendo o SKU
      const qrcodeUrl = await this.generateQRCode(sku);

      return {
        sku,
        barcode,
        qrcodeUrl
      };
    } catch (error) {
      console.error('Erro ao gerar códigos:', error);
      throw error;
    }
  }

  /**
   * Gera código de barras EAN-13 baseado no SKU
   */
  private static generateEAN13(sku: string): string {
    // Prefixo da empresa (pode ser configurável)
    const companyPrefix = '789'; // 3 dígitos
    
    // Usar SKU como base (8 dígitos)
    const productCode = sku.padStart(8, '0');
    
    // Combinar prefixo + código do produto (11 dígitos)
    const partialCode = companyPrefix + productCode;
    
    // Calcular dígito verificador
    const checkDigit = this.calculateEAN13CheckDigit(partialCode);
    
    return partialCode + checkDigit;
  }

  /**
   * Calcula dígito verificador EAN-13
   */
  private static calculateEAN13CheckDigit(code: string): string {
    let sum = 0;
    
    for (let i = 0; i < code.length; i++) {
      const digit = parseInt(code[i]);
      if (i % 2 === 0) {
        sum += digit;
      } else {
        sum += digit * 3;
      }
    }
    
    const remainder = sum % 10;
    const checkDigit = remainder === 0 ? 0 : 10 - remainder;
    
    return checkDigit.toString();
  }

  /**
   * Gera QR Code contendo apenas o código SKU do produto
   */
  private static async generateQRCode(sku: string): Promise<string> {
    try {
      // QR Code contém apenas o código SKU - formato simples para escaneamento
      const qrCodeDataUrl = await QRCode.toDataURL(sku, {
        errorCorrectionLevel: 'M' as const,
        width: 256,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return qrCodeDataUrl;
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      throw new Error('Falha ao gerar QR Code');
    }
  }

  /**
   * Gera QR Code para informações de venda
   */
  static async generateSaleQRCode(saleData: any): Promise<string> {
    try {
      const qrData = {
        saleNumber: saleData.saleNumber,
        total: saleData.total,
        company: 'Amoras Capital',
        date: saleData.createdAt || new Date().toISOString(),
        items: saleData.items?.length || 0
      };

      const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        errorCorrectionLevel: 'M' as const,
        width: 256,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return qrCodeDataUrl;
    } catch (error) {
      console.error('Erro ao gerar QR Code da venda:', error);
      throw new Error('Falha ao gerar QR Code da venda');
    }
  }

  /**
   * Valida se um código de barras é válido
   */
  static validateBarcode(barcode: string): boolean {
    if (barcode.length !== 13) {
      return false;
    }

    const code = barcode.slice(0, 12);
    const checkDigit = barcode.slice(12);
    const calculatedCheckDigit = this.calculateEAN13CheckDigit(code);

    return checkDigit === calculatedCheckDigit;
  }

  /**
   * Extrai informações do SKU
   */
  static parseSkuInfo(sku: string): { sizeCode: string; categoryCode: string; subcategoryCode: string; patternCode: string } | null {
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

  /**
   * Busca produto por código de barras ou SKU
   */
  static async findProductByCode(code: string) {
    try {
      // Tentar encontrar por código de barras primeiro
      let product = await prisma.product.findUnique({
        where: { barcode: code },
        include: {
          category: true,
          pattern: true
        }
      });

      // Se não encontrar, tentar por SKU (formato TTCCSSEEEE)
      if (!product && code.length === 10) {
        const skuInfo = this.parseSkuInfo(code);
        if (skuInfo) {
          // Buscar produto que corresponda ao SKU
          const whereClause: any = {
            sizeCode: skuInfo.sizeCode,
            category: {
              code: skuInfo.categoryCode
            },
            pattern: {
              code: skuInfo.patternCode
            }
          };

          // Adicionar filtro de subcategoria se não for '00'
          if (skuInfo.subcategoryCode !== '00') {
            whereClause.subcategory = {
              code: skuInfo.subcategoryCode
            };
          } else {
            whereClause.subcategoryId = null;
          }

          const products = await prisma.product.findMany({
            where: whereClause,
            include: {
              category: true,
              subcategory: true,
              pattern: true
            }
          });

          // Retornar o primeiro produto encontrado
          if (products.length > 0) {
            product = products[0];
          }
        }
      }

      return product;
    } catch (error) {
      console.error('Erro ao buscar produto por código:', error);
      return null;
    }
  }

  /**
   * Gera código de barras sequencial único
   */
  static async generateUniqueBarcode(sku: string): Promise<string> {
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const barcode = this.generateEAN13(sku + attempts.toString().padStart(2, '0'));
      
      // Verificar se já existe
      const existing = await prisma.product.findUnique({
        where: { barcode }
      });

      if (!existing) {
        return barcode;
      }

      attempts++;
    }

    throw new Error('Não foi possível gerar código de barras único');
  }

  /**
   * Valida e formata um código para o tamanho especificado
   */
  private static validateAndFormatCode(code: string, maxLength: number, type: string): string {
    // Remover caracteres não numéricos
    const cleanCode = code.replace(/\D/g, '');
    
    // Validar se é numérico
    if (!/^\d+$/.test(cleanCode)) {
      throw new Error(`Código de ${type} deve conter apenas números`);
    }
    
    // Validar tamanho máximo
    if (cleanCode.length > maxLength) {
      throw new Error(`Código de ${type} deve ter no máximo ${maxLength} dígitos`);
    }
    
    // Formatar com zeros à esquerda
    return cleanCode.padStart(maxLength, '0');
  }
} 