import multer from 'multer';
import path from 'path';
import { Request } from 'express';

// Configuração do armazenamento
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => {
    console.log('📁 [MULTER] Salvando arquivo em:', 'uploads/products/');
    cb(null, 'uploads/products/');
  }),
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Gerar nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `product-${uniqueSuffix}${ext}`;
    console.log('📝 [MULTER] Nome do arquivo gerado:', filename);
    cb(null, filename);
  }
});

// Filtro para aceitar apenas imagens
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  console.log('🔍 [MULTER] Verificando arquivo:', {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });
  
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    console.error('❌ [MULTER] Tipo de arquivo não permitido:', file.mimetype);
    cb(new Error('Apenas arquivos de imagem são permitidos!'));
  }
};

// Configuração do multer
export const uploadProductImage = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  }
}); 