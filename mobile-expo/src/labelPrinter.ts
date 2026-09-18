import * as SecureStore from 'expo-secure-store';

const PRINTER_KEY = 'amoras_producao_label_printer';

export type PairedPrinter = { id: string; name: string; address: string };
export type LabelData = { barcode: string; name: string; sizeName: string; price: number };

type BluetoothDevice = PairedPrinter & { connect: () => Promise<boolean>; isConnected: () => Promise<boolean>; write: (data: string, encoding?: 'ascii') => Promise<boolean> };
type BluetoothClient = {
  isBluetoothAvailable: () => Promise<boolean>;
  isBluetoothEnabled: () => Promise<boolean>;
  requestBluetoothEnabled: () => Promise<boolean>;
  getBondedDevices: () => Promise<BluetoothDevice[]>;
};

async function bluetooth(): Promise<BluetoothClient> {
  try {
    // O import é intencionalmente tardio: no Expo Go o módulo nativo não existe. Ele só é carregado
    // quando o usuário aciona a impressão, permitindo que as demais telas continuem utilizáveis.
    const imported = await import('react-native-bluetooth-classic');
    const client = imported.default;
    if (!client) throw new Error('Módulo Bluetooth indisponível.');
    return client;
  } catch {
    throw new Error('A impressão Bluetooth precisa do APK Amoras instalado. O Expo Go não possui o módulo da impressora.');
  }
}

const printable = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/["\\]/g, '').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();

function wrapLabelText(value: string, maxLength = 25) {
  const words = printable(value).split(' ').filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxLength && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

/** Layout equivalente à etiqueta web: 30x40 mm, QR, código, nome, tamanho e preço. */
export function buildAmorasLabel(data: LabelData) {
  const code = printable(data.barcode);
  const productLines = wrapLabelText(data.name);
  const formattedPrice = Number.isFinite(data.price) ? `R$ ${data.price.toFixed(2).replace('.', ',')}` : 'R$ 0,00';
  const lines = [
    'SIZE 30 mm,40 mm',
    'GAP 2 mm,0 mm',
    'DIRECTION 1',
    'DENSITY 8',
    'SPEED 3',
    'CLS',
    'TEXT 50,16,"2",0,1,1,"@amorascapital"',
    `QRCODE 46,42,L,7,A,0,"${code}"`,
    `TEXT 45,205,"2",0,1,1,"${code}"`,
    ...productLines.map((line, index) => `TEXT 20,${232 + index * 20},"2",0,1,1,"${line}"`),
    `TEXT 55,278,"2",0,1,1,"TAM: ${printable(data.sizeName || 'N/A')}"`,
    `TEXT 68,298,"3",0,1,1,"${formattedPrice}"`,
    'PRINT 1,1',
  ];
  return `${lines.join('\r\n')}\r\n`;
}

async function bondedDevices(): Promise<BluetoothDevice[]> {
  const client = await bluetooth();
  if (!(await client.isBluetoothAvailable())) throw new Error('Este celular não possui Bluetooth disponível.');
  if (!(await client.isBluetoothEnabled()) && !(await client.requestBluetoothEnabled())) throw new Error('Ative o Bluetooth para continuar.');
  return client.getBondedDevices();
}

export async function listPairedPrinters(): Promise<PairedPrinter[]> {
  const devices = await bondedDevices();
  return devices.map(({ id, name, address }) => ({ id: id || address, name: name || 'Impressora Bluetooth', address }));
}

export async function getSavedPrinter() {
  const raw = await SecureStore.getItemAsync(PRINTER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as PairedPrinter; } catch { return null; }
}

export async function savePrinter(printer: PairedPrinter) {
  await SecureStore.setItemAsync(PRINTER_KEY, JSON.stringify(printer));
}

export async function printAmorasLabel(printer: PairedPrinter, label: LabelData) {
  const devices = await bondedDevices();
  const device = devices.find((item) => item.address === printer.address);
  if (!device) throw new Error('A impressora não está pareada. Pareie a WKDY-80D nas configurações Bluetooth do Android e tente novamente.');
  if (!(await device.isConnected()) && !(await device.connect())) throw new Error('Não foi possível conectar à impressora selecionada.');
  const written = await device.write(buildAmorasLabel(label), 'ascii');
  if (!written) throw new Error('A impressora não confirmou o recebimento da etiqueta.');
}
