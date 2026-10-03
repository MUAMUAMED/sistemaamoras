import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Garantir que o diretório de upload existe
// Usar caminho consistente - no Docker WORKDIR é /src
// Mas também suportar variável de ambiente para customização
const baseDir = process.env.UPLOADS_BASE_DIR || process.cwd();
const uploadDir = path.join(baseDir, 'uploads', 'products');

console.log('📁 [MULTER] Configuração de upload:', {
  baseDir,
  uploadDir,
  cwd: process.cwd(),
  UPLOADS_BASE_DIR: process.env.UPLOADS_BASE_DIR
});

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
    // Nota: file.size pode estar undefined no fileFilter (arquivo ainda não foi completamente recebido)
    size: file.size || 'undefined (será validado após upload)',
    buffer: file.buffer ? `Buffer(${file.buffer.length} bytes)` : 'undefined'
  });
  
  // Validar apenas o tipo MIME (não validar tamanho aqui, pois pode estar undefined)
  // O tamanho será validado após o arquivo ser salvo
  if (file.mimetype && file.mimetype.startsWith('image/')) {
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
    fileSize: 10 * 1024 * 1024, // 10MB por imagem
  }
}); 
