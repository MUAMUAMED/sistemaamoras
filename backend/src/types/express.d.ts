/**
 * Extensão de tipos do Express para suportar AuthenticatedRequest
 */
declare global {
  namespace Express {
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

