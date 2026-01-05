"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require('express').Router;
const { MercadoPagoConfig, Payment } = require('mercadopago');
const { authenticateToken } = require('../middleware/auth');
const router = Router();
const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    options: { timeout: 5000 }
});
const payment = new Payment(client);
router.post('/pay', authenticateToken, async (req, res) => {
    try {
        const { valor, descricao, email } = req.body;
        const body = {
            transaction_amount: parseFloat(valor),
            description: descricao,
            payment_method_id: 'pix',
            payer: {
                email: email
            }
        };
        const result = await payment.create({ body });
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao criar pagamento:', error);
        res.status(500).json({ error: 'Erro ao criar pagamento' });
    }
});
exports.default = router;
//# sourceMappingURL=payment-gateway.service.js.map