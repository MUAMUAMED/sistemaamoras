declare module "cors";
declare module "swagger-ui-express";
declare module "swagger-jsdoc";

// Extender tipos do Express para incluir Multer e user
declare namespace Express {
  interface Request {
    user?: {
      id: string;
      role: string;
      email?: string;
      name?: string;
    };
    file?: Express.Multer.File;
    files?: {
      [fieldname: string]: Express.Multer.File[];
    } | Express.Multer.File[];
  }
}