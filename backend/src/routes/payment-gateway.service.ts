const Router = require('express').Router;
const { MercadoPagoConfig, Payment } = require('mercadopago');
const { authenticateToken } = require('../middleware/auth');

const router = Router();

// Configuração para versão 2.x do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  options: { timeout: 5000 }
});

const payment = new Payment(client);

// Rota para criar pagamento Pix
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
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    res.status(500).json({ error: 'Erro ao criar pagamento' });
  }
});

module.exports = router; 