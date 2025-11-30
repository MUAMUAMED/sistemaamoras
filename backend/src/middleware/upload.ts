import multer from 'multer';
import path from 'path';
import { Request } from 'express';

type MulterFile = Express.Multer.File;

// Configuração do armazenamento
const storage = multer.diskStorage({
  destination: (req: Request, file: MulterFile, cb: (error: Error | null, destination: string) => void) => {
    cb(null, 'uploads/products/');
  },
  filename: (req: Request, file: MulterFile, cb: (error: Error | null, filename: string) => void) => {
    // Gerar nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `product-${uniqueSuffix}${ext}`);
  }
});

// Filtro para aceitar apenas imagens
const fileFilter = (req: Request, file: MulterFile, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
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