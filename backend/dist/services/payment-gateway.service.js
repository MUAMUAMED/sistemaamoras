"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentGatewayService = void 0;
const axios_1 = __importDefault(require("axios"));
const database_1 = require("../config/database");
class PaymentGatewayService {
    static async createPixPayment(request) {
        const config = await database_1.prisma.systemConfig.findFirst();
        if (!config?.paymentGateway || !config?.gatewayConfig) {
            throw new Error('Gateway de pagamento não configurado');
        }
        switch (config.paymentGateway) {
            case 'MERCADO_PAGO':
                return this.createMercadoPagoPayment(request, config.gatewayConfig);
            case 'ASAAS':
                return this.createAsaasPayment(request, config.gatewayConfig);
            default:
                throw new Error(`Gateway ${config.paymentGateway} não suportado`);
        }
    }
    static async processWebhook(gateway, payload) {
        try {
            await database_1.prisma.webhookLog.create({
                data: {
                    source: gateway,
                    event: `payment_webhook`,
                    data: payload,
                    processed: true
                }
            });
            let paymentData = null;
            switch (gateway.toUpperCase()) {
                case 'MERCADO_PAGO':
                    paymentData = this.processMercadoPagoWebhook(payload);
                    break;
                case 'ASAAS':
                    paymentData = this.processAsaasWebhook(payload);
                    break;
                default:
                    console.warn(`Gateway ${gateway} não suportado para webhook`);
                    return null;
            }
            if (paymentData?.external_reference) {
                await this.updateSaleStatus(paymentData);
            }
            return paymentData;
        }
        catch (error) {
            console.error('Erro ao processar webhook:', error);
            throw error;
        }
    }
    static async createMercadoPagoPayment(request, config) {
        try {
            const { access_token } = config;
            const paymentData = {
                transaction_amount: request.amount,
                description: request.description,
                payment_method_id: 'pix',
                payer: {
                    email: request.customer.email || 'cliente@amorascapital.com',
                    first_name: request.customer.name.split(' ')[0],
                    last_name: request.customer.name.split(' ').slice(1).join(' ') || 'Cliente',
                    identification: {
                        type: 'CPF',
                        number: request.customer.document || '11111111111'
                    }
                },
                external_reference: request.external_reference,
                notification_url: request.notification_url,
                date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            };
            const response = await axios_1.default.post('https://api.mercadopago.com/v1/payments', paymentData, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            const payment = response.data;
            return {
                id: payment.id.toString(),
                status: this.mapMercadoPagoStatus(payment.status),
                payment_url: payment.point_of_interaction?.transaction_data?.ticket_url,
                qr_code: payment.point_of_interaction?.transaction_data?.qr_code,
                qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
                pix_code: payment.point_of_interaction?.transaction_data?.qr_code,
                external_reference: payment.external_reference,
                gateway: 'MERCADO_PAGO'
            };
        }
        catch (error) {
            console.error('Erro Mercado Pago:', error.response?.data || error.message);
            throw new Error('Erro ao criar pagamento no Mercado Pago');
        }
    }
    static async createAsaasPayment(request, config) {
        try {
            const { api_key, environment } = config;
            const baseUrl = environment === 'production'
                ? 'https://www.asaas.com/api/v3'
                : 'https://sandbox.asaas.com/api/v3';
            const paymentData = {
                billingType: 'PIX',
                value: request.amount,
                dueDate: new Date().toISOString().split('T')[0],
                description: request.description,
                externalReference: request.external_reference
            };
            const response = await axios_1.default.post(`${baseUrl}/payments`, paymentData, {
                headers: {
                    'access_token': api_key,
                    'Content-Type': 'application/json'
                }
            });
            const payment = response.data;
            let pixData = null;
            try {
                const pixResponse = await axios_1.default.get(`${baseUrl}/payments/${payment.id}/pixQrCode`, {
                    headers: { 'access_token': api_key }
                });
                pixData = pixResponse.data;
            }
            catch (pixError) {
                console.warn('Erro ao buscar QR Code PIX:', pixError);
            }
            return {
                id: payment.id,
                status: this.mapAsaasStatus(payment.status),
                payment_url: payment.invoiceUrl,
                qr_code: pixData?.payload,
                qr_code_base64: pixData?.encodedImage,
                pix_code: pixData?.payload,
                external_reference: payment.externalReference,
                gateway: 'ASAAS'
            };
        }
        catch (error) {
            console.error('Erro Asaas:', error.response?.data || error.message);
            throw new Error('Erro ao criar pagamento no Asaas');
        }
    }
    static processMercadoPagoWebhook(payload) {
        const status = this.mapMercadoPagoStatus(payload.data?.status || payload.status);
        return {
            id: payload.data?.id?.toString(),
            status,
            external_reference: payload.data?.external_reference,
            amount: payload.data?.transaction_amount,
            gateway: 'MERCADO_PAGO'
        };
    }
    static processAsaasWebhook(payload) {
        const payment = payload.payment || payload;
        const status = this.mapAsaasStatus(payment.status);
        return {
            id: payment.id,
            status,
            external_reference: payment.externalReference,
            amount: payment.value,
            gateway: 'ASAAS'
        };
    }
    static mapMercadoPagoStatus(status) {
        const statusMap = {
            'pending': 'pending',
            'approved': 'approved',
            'authorized': 'approved',
            'in_process': 'pending',
            'rejected': 'rejected',
            'cancelled': 'cancelled',
            'refunded': 'cancelled'
        };
        return statusMap[status] || 'pending';
    }
    static mapAsaasStatus(status) {
        const statusMap = {
            'PENDING': 'pending',
            'RECEIVED': 'approved',
            'CONFIRMED': 'approved',
            'OVERDUE': 'pending',
            'REFUNDED': 'cancelled'
        };
        return statusMap[status] || 'pending';
    }
    static async updateSaleStatus(paymentData) {
        try {
            const sale = await database_1.prisma.sale.findFirst({
                where: {
                    OR: [
                        { id: paymentData.external_reference },
                        { paymentReference: paymentData.id }
                    ]
                }
            });
            if (sale) {
                const saleStatus = paymentData.status === 'approved' ? 'PAID' :
                    paymentData.status === 'rejected' ? 'CANCELLED' :
                        paymentData.status === 'cancelled' ? 'CANCELLED' : 'PENDING';
                await database_1.prisma.sale.update({
                    where: { id: sale.id },
                    data: {
                        status: saleStatus === 'CANCELLED' ? 'CANCELED' : saleStatus,
                        paymentReference: paymentData.id,
                        gatewayResponse: paymentData,
                        updatedAt: new Date()
                    }
                });
                console.log(`Venda ${sale.id} atualizada para status ${saleStatus}`);
            }
        }
        catch (error) {
            console.error('Erro ao atualizar venda:', error);
        }
    }
}
exports.PaymentGatewayService = PaymentGatewayService;
//# sourceMappingURL=payment-gateway.service.js.map