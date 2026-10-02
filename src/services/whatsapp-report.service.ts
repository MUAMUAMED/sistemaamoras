import QRCode from 'qrcode';
import P from 'pino';
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  BufferJSON,
  initAuthCreds,
  proto,
  WASocket,
} from '@whiskeysockets/baileys';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

type WhatsappConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'WAITING_QR' | 'CONNECTED' | 'ERROR';

const BRAZIL_TZ = 'America/Sao_Paulo';
const REPORT_KIND = 'DAILY_SALES';
const silentLogger = P({ level: 'silent' });

let socket: WASocket | null = null;
let connectPromise: Promise<void> | null = null;
let connectionStatus: WhatsappConnectionStatus = 'DISCONNECTED';
let lastError: string | null = null;
let qrCodeDataUrl: string | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let schedulerTimer: NodeJS.Timeout | null = null;
let checkingSchedule = false;
let authRegistered = false;

const serializeAuth = (value: unknown) => JSON.parse(JSON.stringify(value, BufferJSON.replacer));
const deserializeAuth = <T>(value: unknown): T => JSON.parse(JSON.stringify(value), BufferJSON.reviver) as T;

// Baileys recomenda um store SQL/NoSQL para produção. O estado não pode ficar
// no filesystem efêmero do container, pois todo deploy perderia a vinculação.
async function useDatabaseAuthState() {
  const savedCredentials = await prisma.whatsappAuthCredential.findUnique({ where: { id: 'default' } });
  const creds = savedCredentials ? deserializeAuth<any>(savedCredentials.data) : initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type: string, ids: string[]) => {
          const rows = await prisma.whatsappAuthKey.findMany({
            where: { category: type, keyId: { in: ids } },
          });
          const found = new Map(rows.map((row) => [row.keyId, row.data]));
          const result: Record<string, any> = {};
          for (const id of ids) {
            const data = found.get(id);
            let value = data ? deserializeAuth<any>(data) : undefined;
            if (type === 'app-state-sync-key' && value) value = proto.Message.AppStateSyncKeyData.fromObject(value);
            result[id] = value;
          }
          return result;
        },
        set: async (data: Record<string, Record<string, unknown | null>>) => {
          await Promise.all(Object.entries(data).flatMap(([category, entries]) => Object.entries(entries).map(async ([keyId, value]) => {
            if (value === null) {
              await prisma.whatsappAuthKey.deleteMany({ where: { category, keyId } });
            } else {
              await prisma.whatsappAuthKey.upsert({
                where: { category_keyId: { category, keyId } },
                update: { data: serializeAuth(value) },
                create: { category, keyId, data: serializeAuth(value) },
              });
            }
          })));
        },
      },
    },
    saveCreds: async () => prisma.whatsappAuthCredential.upsert({
      where: { id: 'default' }, update: { data: serializeAuth(creds) }, create: { id: 'default', data: serializeAuth(creds) },
    }),
  };
}

function brazilDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const lookup = (type: string) => parts.find((part) => part.type === type)?.value || '0';
  return {
    year: Number(lookup('year')),
    month: Number(lookup('month')),
    day: Number(lookup('day')),
    hour: Number(lookup('hour')),
    minute: Number(lookup('minute')),
  };
}

function reportDateForToday(now = new Date()): Date {
  const { year, month, day } = brazilDateParts(now);
  // 03:00 UTC corresponde ao início do dia em Brasília (sem DST desde 2019).
  return new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatPayment(method: string): string {
  return ({ CASH: 'Dinheiro', PIX: 'Pix', CREDIT_CARD: 'Crédito', DEBIT_CARD: 'Débito', BANK_SLIP: 'Boleto', BANK_TRANSFER: 'Transferência' } as Record<string, string>)[method] || method;
}

export function getWhatsappReportStatus() {
  return {
    status: connectionStatus,
    connected: connectionStatus === 'CONNECTED',
    waitingForQr: connectionStatus === 'WAITING_QR',
    qrCodeDataUrl,
    lastError,
    sessionStorage: 'PostgreSQL',
  };
}

export async function connectWhatsapp(): Promise<void> {
  // Não crie dois sockets para a mesma sessão. Dois sockets concorrentes fazem
  // o evento "close" da conexão antiga derrubar a conexão que acabou de abrir.
  if (socket || connectionStatus === 'CONNECTED' || connectPromise) return connectPromise || Promise.resolve();

  connectPromise = (async () => {
    connectionStatus = 'CONNECTING';
    lastError = null;
    const { state, saveCreds } = await useDatabaseAuthState();
    authRegistered = state.creds.registered;
    const { version } = await fetchLatestBaileysVersion();

    const currentSocket = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, silentLogger),
      },
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Amoras Capital Relatórios'),
      logger: silentLogger,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
    });
    socket = currentSocket;

    currentSocket.ev.on('creds.update', saveCreds);
    currentSocket.ev.on('connection.update', async (update) => {
      if (update.qr) {
        qrCodeDataUrl = await QRCode.toDataURL(update.qr, { margin: 1, width: 320 });
        connectionStatus = 'WAITING_QR';
      }

      if (update.connection === 'open') {
        connectionStatus = 'CONNECTED';
        qrCodeDataUrl = null;
        lastError = null;
        logger.info('WhatsApp de relatórios conectado');
      }

      if (update.connection === 'close') {
        // Ignore eventos atrasados de um socket que já foi substituído.
        if (socket !== currentSocket) return;
        const statusCode = (update.lastDisconnect?.error as any)?.output?.statusCode;
        socket = null;
        qrCodeDataUrl = null;
        if (statusCode === DisconnectReason.loggedOut) {
          connectionStatus = 'DISCONNECTED';
          lastError = 'A conta saiu da sessão. Gere e leia um novo QR Code.';
          return;
        }

        connectionStatus = 'ERROR';
        lastError = `Conexão encerrada${statusCode ? ` (código ${statusCode})` : ''}. Reconectando.`;
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connectPromise = null;
            void connectWhatsapp().catch((error) => logger.error('Falha ao reconectar WhatsApp:', error));
          }, 5000);
        }
      }
    });
  })().finally(() => { connectPromise = null; });

  return connectPromise;
}

async function discardIncompleteWhatsappLink() {
  if (connectionStatus === 'CONNECTED' || authRegistered) {
    throw new Error('Já existe um WhatsApp vinculado. Desconecte a sessão atual antes de vincular outro número.');
  }
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  socket?.end(undefined);
  socket = null;
  connectPromise = null;
  connectionStatus = 'DISCONNECTED';
  qrCodeDataUrl = null;
  lastError = null;
  // Uma tentativa não concluída pode conter pre-keys. Não reutilizá-las evita
  // que o WhatsApp rejeite um pairing code de uma conexão anterior.
  await prisma.whatsappAuthKey.deleteMany();
  await prisma.whatsappAuthCredential.deleteMany();
}

export async function beginWhatsappQrLink(): Promise<void> {
  await discardIncompleteWhatsappLink();
  await connectWhatsapp();
}

export async function listWhatsappGroups() {
  if (connectionStatus !== 'CONNECTED' || !socket) {
    throw new Error('WhatsApp ainda não está conectado. Leia o QR Code primeiro.');
  }
  const groups = await socket.groupFetchAllParticipating();
  return Object.values(groups)
    .map((group: any) => ({ jid: group.id, name: group.subject || group.id }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export async function requestWhatsappPairingCode(rawPhoneNumber: string): Promise<string> {
  const phoneNumber = String(rawPhoneNumber || '').replace(/\D/g, '');
  if (phoneNumber.length < 10 || phoneNumber.length > 15) {
    throw new Error('Informe o número completo com DDI e DDD. Exemplo: 5561999999999.');
  }
  await discardIncompleteWhatsappLink();
  await connectWhatsapp();
  if (!socket) throw new Error('Não foi possível iniciar a conexão do WhatsApp. Tente novamente.');

  // O socket precisa concluir o handshake antes de aceitar o pedido de código.
  await new Promise((resolve) => setTimeout(resolve, 3000));
  qrCodeDataUrl = null;
  connectionStatus = 'CONNECTING';
  const code = await socket.requestPairingCode(phoneNumber);
  return code.replace(/(.{4})/g, '$1 ').trim();
}

export async function buildDailySalesReport(now = new Date()): Promise<{ message: string; reportDate: Date }> {
  const reportDate = reportDateForToday(now);
  const nextDay = new Date(reportDate.getTime() + 24 * 60 * 60 * 1000);
  const [sales, lowStock] = await Promise.all([
    prisma.sale.findMany({
      where: {
        createdAt: { gte: reportDate, lt: nextDay },
        // Faturamento é composto apenas por vendas efetivamente pagas ou já
        // encaminhadas. Pedidos pendentes não entram no resumo financeiro.
        status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
      },
      select: { total: true, discount: true, paymentMethod: true, status: true },
    }),
    prisma.product.count({
      where: { status: 'ATIVO', stock: { lte: 2 } },
    }),
  ]);

  const totalsByPayment = new Map<string, number>();
  let total = 0;
  let discounts = 0;
  for (const sale of sales) {
    total += sale.total || 0;
    discounts += sale.discount || 0;
    totalsByPayment.set(sale.paymentMethod, (totalsByPayment.get(sale.paymentMethod) || 0) + (sale.total || 0));
  }

  const label = new Intl.DateTimeFormat('pt-BR', { timeZone: BRAZIL_TZ, dateStyle: 'full' }).format(now);
  const paymentLines = [...totalsByPayment.entries()]
    .map(([method, value]) => `• ${formatPayment(method)}: ${formatCurrency(value)}`)
    .join('\n') || '• Nenhuma venda registrada';

  return {
    reportDate,
    message: [
      '📊 *Relatório diário de vendas — Amoras Capital*',
      `📅 ${label}`,
      '',
      `🛍️ Vendas: *${sales.length}*`,
      `💰 Faturamento: *${formatCurrency(total)}*`,
      `🏷️ Descontos: *${formatCurrency(discounts)}*`,
      '',
      '*Por forma de pagamento*',
      paymentLines,
      '',
      `⚠️ Produtos com estoque baixo (até 2 un.): *${lowStock}*`,
    ].join('\n'),
  };
}

export async function sendDailySalesReport(options: { manual?: boolean } = {}) {
  const config = await prisma.whatsappReportConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  });
  if (!config.enabled && !options.manual) return { skipped: true, reason: 'Automação desativada' };
  if (!config.groupJid) throw new Error('Selecione o grupo que receberá o relatório.');
  if (connectionStatus !== 'CONNECTED' || !socket) throw new Error('WhatsApp não conectado. Leia o QR Code e tente novamente.');

  const { message, reportDate } = await buildDailySalesReport();
  const kind = options.manual ? `DAILY_SALES_TEST_${Date.now()}` : REPORT_KIND;

  if (!options.manual) {
    const previous = await prisma.whatsappReportLog.findUnique({ where: { reportDate_kind: { reportDate, kind } } });
    if (previous) return { skipped: true, reason: `Relatório já processado (${previous.status})`, log: previous };
  }

  let log: any;
  try {
    log = await prisma.whatsappReportLog.create({ data: { reportDate, kind, status: 'SENDING', message } });
  } catch (error: any) {
    if (error.code === 'P2002') return { skipped: true, reason: 'Relatório já processado por outra instância' };
    throw error;
  }

  try {
    await socket.sendMessage(config.groupJid, { text: message });
    const sent = await prisma.whatsappReportLog.update({ where: { id: log.id }, data: { status: 'SENT', sentAt: new Date() } });
    return { sent: true, log: sent, message };
  } catch (error: any) {
    const errorMessage = error?.message || 'Falha desconhecida ao enviar WhatsApp';
    await prisma.whatsappReportLog.update({ where: { id: log.id }, data: { status: 'FAILED', error: errorMessage } });
    throw new Error(errorMessage);
  }
}

async function checkDailySchedule() {
  if (checkingSchedule) return;
  checkingSchedule = true;
  try {
    const config = await prisma.whatsappReportConfig.findUnique({ where: { id: 'default' } });
    if (!config?.enabled) return;
    const now = brazilDateParts();
    if (now.hour < config.scheduledHour) return;
    await sendDailySalesReport();
  } catch (error: any) {
    // A próxima execução não tenta duplicar uma mensagem já registrada.
    logger.error(`Falha na automação de relatório WhatsApp: ${error?.message || error}`);
  } finally {
    checkingSchedule = false;
  }
}

export function startWhatsappReportAutomation() {
  if (schedulerTimer) return;
  schedulerTimer = setInterval(() => void checkDailySchedule(), 30_000);
  void checkDailySchedule();
  // A sessão vinculada fica no Postgres, portanto sobrevive a deploys.
  void prisma.whatsappAuthCredential.findUnique({ where: { id: 'default' } })
    .then((credential) => {
      const credentials = credential ? deserializeAuth<any>(credential.data) : null;
      if (credentials?.registered) {
      void connectWhatsapp().catch((error) => logger.error('Falha ao restaurar WhatsApp:', error));
      }
    })
    .catch((error) => logger.warn(`Não foi possível restaurar a sessão do WhatsApp: ${error}`));
  logger.info('Automação de relatório diário WhatsApp inicializada (18h, America/Sao_Paulo)');
}

export async function closeWhatsappConnection() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  socket?.end(undefined);
  socket = null;
  connectionStatus = 'DISCONNECTED';
  qrCodeDataUrl = null;
}
