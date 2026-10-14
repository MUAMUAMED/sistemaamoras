import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { env } from '../config/env';

const router = Router();

const paymentMethod = (resource: any) => {
  const alias = resource.transactions?.data?.[0]?.payment?.data?.alias || '';
  if (alias.includes('pix')) return 'PIX';
  if (alias.includes('billet') || alias.includes('boleto')) return 'BANK_SLIP';
  if (alias.includes('debit')) return 'DEBIT_CARD';
  return 'CREDIT_CARD';
};

const validSignature = (req: Request) => {
  const signature = req.header('X-Yampi-Hmac-SHA256') || '';
  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!env.YAMPI_WEBHOOK_SECRET || !signature || !rawBody) return false;
  const expected = crypto.createHmac('sha256', env.YAMPI_WEBHOOK_SECRET).update(rawBody).digest('base64');
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
};

router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  if (!validSignature(req)) return res.status(401).json({ error: 'Assinatura Yampi invalida' });
  if (req.body?.event !== 'order.paid') return res.status(200).json({ ignored: true });

  const resource = req.body.resource || {};
  const orderId = String(resource.id || '');
  const eventKey = `order.paid:${orderId}`;
  if (!orderId) return res.status(400).json({ error: 'Pedido Yampi sem ID' });

  try {
    const previous = await (prisma as any).yampiWebhookEvent.findUnique({ where: { eventKey } });
    if (previous?.status === 'PROCESSED') return res.json({ processed: true, duplicate: true });

    const event = previous || await (prisma as any).yampiWebhookEvent.create({
      data: { eventKey, eventType: req.body.event, yampiOrderId: orderId, payload: req.body },
    });
    const yampiItems = resource.items?.data || [];
    const skuIds = yampiItems.map((item: any) => String(item.sku_id));
    const commercialProducts = await (prisma as any).commercialProduct.findMany({
      where: { yampiSkuId: { in: skuIds } },
      include: { erpProduct: true },
    });
    if (commercialProducts.length !== yampiItems.length) throw new Error('Pedido possui SKU sem vinculo com o ERP');

    const seller = await prisma.user.findFirst({ where: { active: true, role: 'ADMIN' } });
    if (!seller) throw new Error('Nenhum administrador ativo para registrar a venda');
    const customer = resource.customer?.data || {};
    const address = resource.shipping_address?.data;
    const saleNumber = `YAMPI-${resource.number || orderId}`;

    const sale = await prisma.$transaction(async (tx) => {
      const existingSale = await tx.sale.findUnique({ where: { saleNumber } });
      if (existingSale) return existingSale;

      const saleItems = yampiItems.map((item: any) => {
        const commercial = commercialProducts.find((product: any) => product.yampiSkuId === String(item.sku_id));
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.price);
        return { productId: commercial.erpProductId, quantity, unitPrice, total: unitPrice * quantity };
      });

      for (const item of saleItems) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stockLoja: { gte: item.quantity }, stock: { gte: item.quantity } },
          data: { stockLoja: { decrement: item.quantity }, stock: { decrement: item.quantity } },
        });
        if (updated.count !== 1) throw new Error(`Estoque insuficiente para o produto ${item.productId}`);
      }

      const created = await tx.sale.create({
        data: {
          saleNumber,
          leadName: customer.name || customer.generic_name || null,
          leadPhone: customer.phone?.full_number || null,
          sellerId: seller.id,
          subtotal: Number(resource.value_products || resource.value_total || 0),
          discount: Number(resource.value_discount || 0),
          total: Number(resource.value_total || 0),
          status: 'PAID',
          paymentMethod: paymentMethod(resource) as any,
          paymentReference: orderId,
          gatewayResponse: req.body,
          notes: `Venda recebida automaticamente da Yampi`,
          deliveryMethod: address ? 'SHIPPING' : 'PICKUP',
          deliveryAddress: address?.full_address || null,
          deliveryFee: Number(resource.value_shipment || 0),
          paidAt: new Date(),
          items: { create: saleItems },
        },
      });

      await Promise.all(saleItems.map((item) => tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: 'SALE',
          quantity: item.quantity,
          reason: `Venda Yampi ${orderId}`,
          reference: created.id,
          userId: seller.id,
          location: 'LOJA',
        },
      })));
      return created;
    });

    await (prisma as any).yampiWebhookEvent.update({
      where: { id: event.id },
      data: { status: 'PROCESSED', saleId: sale.id, processedAt: new Date(), error: null },
    });
    return res.json({ processed: true, saleId: sale.id });
  } catch (error: any) {
    await (prisma as any).yampiWebhookEvent.updateMany({
      where: { eventKey },
      data: { status: 'FAILED', error: String(error.message).slice(0, 1000) },
    });
    return next(error);
  }
});

export default router;
