"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = require("../config/logger");
const errorHandler = (error, req, res, next) => {
    logger_1.logger.error('Erro capturado:', {
        error: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Dados inválidos',
            details: error.message,
        });
    }
    if (error.code === 'P2002') {
        return res.status(409).json({
            error: 'Conflito de dados',
            message: 'Já existe um registro com esses dados',
        });
    }
    if (error.code === 'P2025') {
        return res.status(404).json({
            error: 'Registro não encontrado',
            message: 'O registro solicitado não foi encontrado',
        });
    }
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Token inválido',
            message: 'Token de autenticação inválido',
        });
    }
    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token expirado',
            message: 'Token de autenticação expirado',
        });
    }
    if (error.statusCode) {
        return res.status(error.statusCode).json({
            error: error.message,
        });
    }
    return res.status(500).json({
        error: 'Erro interno do servidor',
        message: error.message || 'Algo deu errado. Tente novamente mais tarde.',
        stack: error.stack,
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map