import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Garantir que o diretório de upload existe
const uploadDir = path.join(process.cwd(), 'uploads', 'products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 [MULTER] Diretório de upload criado:', uploadDir);
}

// Configuração do armazenamento
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    try {
      // Garantir que o diretório existe antes de salvar
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('📁 [MULTER] Diretório criado:', uploadDir);
      }
      console.log('📁 [MULTER] Salvando arquivo em:', uploadDir);
      cb(null, uploadDir);
    } catch (error: any) {
      console.error('❌ [MULTER] Erro ao criar diretório:', error);
      cb(error, uploadDir);
    }
  },
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
    size: file.size,
    buffer: file.buffer ? `Buffer(${file.buffer.length} bytes)` : 'undefined'
  });
  
  // Validar que o arquivo tem tamanho válido
  if (!file.size || file.size === 0) {
    console.error('❌ [MULTER] Arquivo sem tamanho válido:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    return cb(new Error('Arquivo inválido: tamanho não pode ser zero ou indefinido'));
  }
  
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