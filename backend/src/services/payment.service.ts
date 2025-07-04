import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

export interface PaymentGateway {
  id: string;
  name: string;
  type: 'MERCADO_PAGO' | 'PAGARME' | 'ASAAS' | 'GERENCIANET';
  config: any;
  active: boolean;
}

export interface PaymentRequest {
  amount: number;
  description: string;
  customer: {
    name: string;
    email?: string;
    phone: string;
    document?: string;
  };
  items?: Array<{
    title: string;
    quantity: number;
    unit_price: number;
  }>;
  external_reference?: string;
  notification_url?: string;
  success_url?: string;
  failure_url?: string;
}

export interface PaymentResponse {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  payment_url?: string;
  qr_code?: string;
  qr_code_base64?: string;
  pix_code?: string;
  barcode?: string;
  due_date?: string;
  external_reference?: string;
  gateway: string;
}

export interface WebhookData {
  id?: string;
  status: string;
  external_reference?: string;
  amount?: number;
  payment_method?: string;
  gateway: string;
  raw_data: any;
}

/**
 * Serviço principal para gerenciar pagamentos com diferentes gateways
 */
export class PaymentService {
  private static gateways: Map<string, PaymentGateway> = new Map();

  /**
   * Inicializa os gateways de pagamento
   */
  static async initialize() {
    try {
      const config = await prisma.systemConfig.findFirst();
      if (config?.paymentGateway && config?.gatewayConfig) {
        const gateway: PaymentGateway = {
          id: config.paymentGateway,
          name: config.paymentGateway,
          type: config.paymentGateway as any,
          config: config.gatewayConfig,
          active: true
        };
        this.gateways.set(gateway.id, gateway);
      }
    } catch (error) {
      console.error('Erro ao inicializar gateways:', error);
    }
  }

  /**
   * Cria um pagamento usando o gateway configurado
   */
  static async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const gateway = this.getActiveGateway();
    if (!gateway) {
      throw new Error('Nenhum gateway de pagamento configurado');
    }

    switch (gateway.type) {
      case 'MERCADO_PAGO':
        return this.createMercadoPagoPayment(request, gateway);
      case 'PAGARME':
        return this.createPagarMePayment(request, gateway);
      case 'ASAAS':
        return this.createAsaasPayment(request, gateway);
      case 'GERENCIANET':
        return this.createGerenciaNetPayment(request, gateway);
      default:
        throw new Error(`Gateway ${gateway.type} não suportado`);
    }
  }

  /**
   * Processa webhook de pagamento
   */
  static async processWebhook(gateway: string, payload: any): Promise<WebhookData | null> {
    try {
      let webhookData: WebhookData | null = null;

      switch (gateway.toUpperCase()) {
        case 'MERCADO_PAGO':
          webhookData = this.processMercadoPagoWebhook(payload);
          break;
        case 'PAGARME':
          webhookData = this.processPagarMeWebhook(payload);
          break;
        case 'ASAAS':
          webhookData = this.processAsaasWebhook(payload);
          break;
        case 'GERENCIANET':
          webhookData = this.processGerenciaNetWebhook(payload);
          break;
        default:
          console.warn(`Gateway ${gateway} não suportado para webhook`);
          return null;
      }

      if (webhookData) {
        // Log do webhook
        await prisma.webhookLog.create({
          data: {
            source: 'mercadopago',
            event: 'payment_webhook',
            data: webhookData.raw_data,
            processed: false
          }
        });

        // Atualizar venda se tiver referência externa
        if (webhookData.external_reference) {
          await this.updateSaleFromWebhook(webhookData);
        }
      }

      return webhookData;
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      
      // Log do erro
      await prisma.webhookLog.create({
        data: {
          source: 'mercadopago',
          event: 'payment_webhook',
          data: payload,
          processed: true
        }
      });

      return null;
    }
  }

  /**
   * Implementação Mercado Pago
   */
  private static async createMercadoPagoPayment(
    request: PaymentRequest, 
    gateway: PaymentGateway
  ): Promise<PaymentResponse> {
    try {
      const { access_token } = gateway.config;
      
      const paymentData = {
        transaction_amount: request.amount,
        description: request.description,
        payment_method_id: 'pix',
        payer: {
          email: request.customer.email,
          first_name: request.customer.name.split(' ')[0],
          last_name: request.customer.name.split(' ').slice(1).join(' '),
          identification: {
            type: 'CPF',
            number: request.customer.document || '11111111111'
          },
          phone: {
            area_code: request.customer.phone.substring(0, 2),
            number: request.customer.phone.substring(2)
          }
        },
        external_reference: request.external_reference,
        notification_url: request.notification_url,
        date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
      };

      const response = await axios.post(
        'https://api.mercadopago.com/v1/payments',
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

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
    } catch (error: any) {
      console.error('Erro Mercado Pago:', error.response?.data || error.message);
      throw new Error('Erro ao criar pagamento no Mercado Pago');
    }
  }

  /**
   * Implementação Pagar.me
   */
  private static async createPagarMePayment(
    request: PaymentRequest, 
    gateway: PaymentGateway
  ): Promise<PaymentResponse> {
    try {
      const { api_key } = gateway.config;
      
      const orderData = {
        amount: Math.round(request.amount * 100), // Centavos
        currency: 'BRL',
        customer: {
          name: request.customer.name,
          email: request.customer.email,
          phone: request.customer.phone,
          document: request.customer.document || '11111111111',
          type: 'individual'
        },
        payments: [{
          payment_method: 'pix',
          pix: {
            expires_in: 1800 // 30 minutos
          }
        }],
        code: request.external_reference,
        items: request.items?.map(item => ({
          amount: Math.round(item.unit_price * 100),
          description: item.title,
          quantity: item.quantity,
          code: item.title.toLowerCase().replace(/\s+/g, '_')
        })) || [{
          amount: Math.round(request.amount * 100),
          description: request.description,
          quantity: 1,
          code: 'default'
        }]
      };

      const response = await axios.post(
        'https://api.pagar.me/core/v5/orders',
        orderData,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(api_key + ':').toString('base64')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const order = response.data;
      const pixPayment = order.charges[0]?.last_transaction;

      return {
        id: order.id,
        status: this.mapPagarMeStatus(order.status),
        qr_code: pixPayment?.qr_code,
        qr_code_base64: pixPayment?.qr_code_url,
        pix_code: pixPayment?.qr_code,
        external_reference: order.code,
        gateway: 'PAGARME'
      };
    } catch (error: any) {
      console.error('Erro Pagar.me:', error.response?.data || error.message);
      throw new Error('Erro ao criar pagamento no Pagar.me');
    }
  }

  /**
   * Implementação Asaas
   */
  private static async createAsaasPayment(
    request: PaymentRequest, 
    gateway: PaymentGateway
  ): Promise<PaymentResponse> {
    try {
      const { api_key, environment } = gateway.config;
      const baseUrl = environment === 'production' 
        ? 'https://www.asaas.com/api/v3' 
        : 'https://sandbox.asaas.com/api/v3';
      
      // Criar ou buscar cliente
      const customerData = {
        name: request.customer.name,
        email: request.customer.email,
        phone: request.customer.phone,
        cpfCnpj: request.customer.document || '11111111111'
      };

      let customer;
      try {
        const customerResponse = await axios.post(
          `${baseUrl}/customers`,
          customerData,
          {
            headers: {
              'access_token': api_key,
              'Content-Type': 'application/json'
            }
          }
        );
        customer = customerResponse.data;
      } catch (error: any) {
        if (error.response?.status === 400) {
          // Cliente já existe, buscar por email
          const searchResponse = await axios.get(
            `${baseUrl}/customers?email=${request.customer.email}`,
            {
              headers: { 'access_token': api_key }
            }
          );
          customer = searchResponse.data.data[0];
        } else {
          throw error;
        }
      }

      // Criar cobrança PIX
      const paymentData = {
        customer: customer.id,
        billingType: 'PIX',
        value: request.amount,
        dueDate: new Date(Date.now() + 30 * 60 * 1000).toISOString().split('T')[0], // Hoje + 30 min
        description: request.description,
        externalReference: request.external_reference
      };

      const response = await axios.post(
        `${baseUrl}/payments`,
        paymentData,
        {
          headers: {
            'access_token': api_key,
            'Content-Type': 'application/json'
          }
        }
      );

      const payment = response.data;

      // Buscar QR Code PIX
      const pixResponse = await axios.get(
        `${baseUrl}/payments/${payment.id}/pixQrCode`,
        {
          headers: { 'access_token': api_key }
        }
      );

      const pixData = pixResponse.data;

      return {
        id: payment.id,
        status: this.mapAsaasStatus(payment.status),
        payment_url: payment.invoiceUrl,
        qr_code: pixData.payload,
        qr_code_base64: pixData.encodedImage,
        pix_code: pixData.payload,
        external_reference: payment.externalReference,
        gateway: 'ASAAS'
      };
    } catch (error: any) {
      console.error('Erro Asaas:', error.response?.data || error.message);
      throw new Error('Erro ao criar pagamento no Asaas');
    }
  }

  /**
   * Implementação Gerencianet
   */
  private static async createGerenciaNetPayment(
    request: PaymentRequest, 
    gateway: PaymentGateway
  ): Promise<PaymentResponse> {
    try {
      const { client_id, client_secret, environment, certificate } = gateway.config;
      const baseUrl = environment === 'production' 
        ? 'https://api-pix.gerencianet.com.br' 
        : 'https://api-pix-h.gerencianet.com.br';

      // Autenticação
      const authResponse = await axios.post(
        `${baseUrl}/oauth/token`,
        {
          grant_type: 'client_credentials'
        },
        {
          auth: {
            username: client_id,
            password: client_secret
          }
        }
      );

      const accessToken = authResponse.data.access_token;

      // Criar cobrança PIX
      const txid = request.external_reference || Date.now().toString();
      const pixData = {
        calendario: {
          expiracao: 1800 // 30 minutos
        },
        devedor: {
          nome: request.customer.name,
          cpf: request.customer.document || '11111111111'
        },
        valor: {
          original: request.amount.toFixed(2)
        },
        chave: gateway.config.pix_key,
        solicitacaoPagador: request.description
      };

      const response = await axios.put(
        `${baseUrl}/v2/cob/${txid}`,
        pixData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const cob = response.data;

      // Buscar QR Code
      const qrResponse = await axios.get(
        `${baseUrl}/v2/cob/${txid}/qrcode`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      const qrData = qrResponse.data;

      return {
        id: cob.txid,
        status: this.mapGerenciaNetStatus(cob.status),
        qr_code: cob.pixCopiaECola,
        qr_code_base64: qrData.imagemQrcode,
        pix_code: cob.pixCopiaECola,
        external_reference: cob.txid,
        gateway: 'GERENCIANET'
      };
    } catch (error: any) {
      console.error('Erro Gerencianet:', error.response?.data || error.message);
      throw new Error('Erro ao criar pagamento na Gerencianet');
    }
  }

  /**
   * Processamento de webhooks por gateway
   */
  private static processMercadoPagoWebhook(payload: any): WebhookData {
    return {
      id: payload.data?.id?.toString(),
      status: this.mapMercadoPagoStatus(payload.data?.status || payload.status),
      external_reference: payload.data?.external_reference,
      amount: payload.data?.transaction_amount,
      payment_method: 'pix',
      gateway: 'MERCADO_PAGO',
      raw_data: payload
    };
  }

  private static processPagarMeWebhook(payload: any): WebhookData {
    const order = payload.data || payload;
    return {
      id: order.id,
      status: this.mapPagarMeStatus(order.status),
      external_reference: order.code,
      amount: order.amount ? order.amount / 100 : undefined,
      payment_method: 'pix',
      gateway: 'PAGARME',
      raw_data: payload
    };
  }

  private static processAsaasWebhook(payload: any): WebhookData {
    const payment = payload.payment || payload;
    return {
      id: payment.id,
      status: this.mapAsaasStatus(payment.status),
      external_reference: payment.externalReference,
      amount: payment.value,
      payment_method: payment.billingType?.toLowerCase(),
      gateway: 'ASAAS',
      raw_data: payload
    };
  }

  private static processGerenciaNetWebhook(payload: any): WebhookData {
    const pix = payload.pix?.[0] || payload;
    return {
      id: pix.txid,
      status: this.mapGerenciaNetStatus(pix.status || 'pending'),
      external_reference: pix.txid,
      amount: parseFloat(pix.valor),
      payment_method: 'pix',
      gateway: 'GERENCIANET',
      raw_data: payload
    };
  }

  /**
   * Mapeamento de status por gateway
   */
  private static mapMercadoPagoStatus(status: string): 'pending' | 'approved' | 'rejected' | 'cancelled' {
    const statusMap: Record<string, 'pending' | 'approved' | 'rejected' | 'cancelled'> = {
      'pending': 'pending',
      'approved': 'approved',
      'authorized': 'approved',
      'in_process': 'pending',
      'in_mediation': 'pending',
      'rejected': 'rejected',
      'cancelled': 'cancelled',
      'refunded': 'cancelled',
      'charged_back': 'cancelled'
    };
    return statusMap[status] || 'pending';
  }

  private static mapPagarMeStatus(status: string): 'pending' | 'approved' | 'rejected' | 'cancelled' {
    const statusMap: Record<string, 'pending' | 'approved' | 'rejected' | 'cancelled'> = {
      'pending': 'pending',
      'paid': 'approved',
      'canceled': 'cancelled',
      'failed': 'rejected'
    };
    return statusMap[status] || 'pending';
  }

  private static mapAsaasStatus(status: string): 'pending' | 'approved' | 'rejected' | 'cancelled' {
    const statusMap: Record<string, 'pending' | 'approved' | 'rejected' | 'cancelled'> = {
      'PENDING': 'pending',
      'RECEIVED': 'approved',
      'CONFIRMED': 'approved',
      'OVERDUE': 'pending',
      'REFUNDED': 'cancelled',
      'RECEIVED_IN_CASH': 'approved',
      'REFUND_REQUESTED': 'cancelled'
    };
    return statusMap[status] || 'pending';
  }

  private static mapGerenciaNetStatus(status: string): 'pending' | 'approved' | 'rejected' | 'cancelled' {
    const statusMap: Record<string, 'pending' | 'approved' | 'rejected' | 'cancelled'> = {
      'ATIVA': 'pending',
      'CONCLUIDA': 'approved',
      'REMOVIDA_PELO_USUARIO_RECEBEDOR': 'cancelled',
      'REMOVIDA_PELO_PSP': 'cancelled'
    };
    return statusMap[status] || 'pending';
  }

  /**
   * Utilitários
   */
  private static getActiveGateway(): PaymentGateway | null {
    for (const gateway of this.gateways.values()) {
      if (gateway.active) {
        return gateway;
      }
    }
    return null;
  }

  private static async updateSaleFromWebhook(webhookData: WebhookData) {
    try {
      const sale = await prisma.sale.findFirst({
        where: {
          OR: [
            { id: webhookData.external_reference! },
            { paymentReference: webhookData.id }
          ]
        }
      });

      if (sale) {
        const paymentStatus = webhookData.status === 'approved' ? 'PAID' : 
                            webhookData.status === 'rejected' ? 'CANCELLED' :
                            webhookData.status === 'cancelled' ? 'CANCELLED' : 'PENDING';

        await prisma.sale.update({
          where: { id: sale.id },
          data: {
            status: paymentStatus === 'CANCELLED' ? 'CANCELED' : paymentStatus as any,
            paymentReference: webhookData.id,
            gatewayResponse: webhookData.raw_data,
            updatedAt: new Date()
          }
        });

        console.log(`Venda ${sale.id} atualizada para status ${paymentStatus}`);
      }
    } catch (error) {
      console.error('Erro ao atualizar venda do webhook:', error);
    }
  }

  /**
   * Buscar status de pagamento
   */
  static async getPaymentStatus(paymentId: string, gatewayType: string): Promise<PaymentResponse | null> {
    const gateway = this.getActiveGateway();
    if (!gateway || gateway.type !== gatewayType) {
      return null;
    }

    try {
      switch (gateway.type) {
        case 'MERCADO_PAGO':
          return this.getMercadoPagoPaymentStatus(paymentId, gateway);
        case 'ASAAS':
          return this.getAsaasPaymentStatus(paymentId, gateway);
        default:
          return null;
      }
    } catch (error) {
      console.error('Erro ao buscar status do pagamento:', error);
      return null;
    }
  }

  private static async getMercadoPagoPaymentStatus(
    paymentId: string, 
    gateway: PaymentGateway
  ): Promise<PaymentResponse> {
    const { access_token } = gateway.config;
    
    const response = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      }
    );

    const payment = response.data;

    return {
      id: payment.id.toString(),
      status: this.mapMercadoPagoStatus(payment.status),
      external_reference: payment.external_reference,
      gateway: 'MERCADO_PAGO'
    };
  }

  private static async getAsaasPaymentStatus(
    paymentId: string, 
    gateway: PaymentGateway
  ): Promise<PaymentResponse> {
    const { api_key, environment } = gateway.config;
    const baseUrl = environment === 'production' 
      ? 'https://www.asaas.com/api/v3' 
      : 'https://sandbox.asaas.com/api/v3';
    
    const response = await axios.get(
      `${baseUrl}/payments/${paymentId}`,
      {
        headers: {
          'access_token': api_key
        }
      }
    );

    const payment = response.data;

    return {
      id: payment.id,
      status: this.mapAsaasStatus(payment.status),
      external_reference: payment.externalReference,
      gateway: 'ASAAS'
    };
  }
} 