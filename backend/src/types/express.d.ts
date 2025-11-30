/**
 * Extensão de tipos do Express para suportar AuthenticatedRequest
 */
import { Request as ExpressRequest } from 'express';
import * as multer from 'multer';

declare global {
  namespace Express {
    namespace Multer {
      interface File extends multer.File {}
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

