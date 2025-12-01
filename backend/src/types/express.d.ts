/**
 * Extensão de tipos do Express para suportar AuthenticatedRequest
 */

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination?: string;
        filename?: string;
        path?: string;
        buffer?: Buffer;
      }
    }
    
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        name: string;
      };
      file?: Express.Multer.File;
      files?: {
        [fieldname: string]: Express.Multer.File[];
      } | Express.Multer.File[];
    }
  }
}

export {};
