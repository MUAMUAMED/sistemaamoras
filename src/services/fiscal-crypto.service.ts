import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

const getKey = () => {
  const secret = process.env.FISCAL_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error('FISCAL_ENCRYPTION_KEY deve ter pelo menos 32 caracteres');
  }
  return crypto.createHash('sha256').update(secret, 'utf8').digest();
};

export const encryptFiscalSecret = (value: string | Buffer) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.');
};

export const decryptFiscalSecret = (value: string) => {
  const [version, ivValue, tagValue, encryptedValue] = value.split('.');
  if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) {
    throw new Error('Segredo fiscal cifrado em formato invalido');
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivValue, 'base64'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64')),
    decipher.final(),
  ]);
};
