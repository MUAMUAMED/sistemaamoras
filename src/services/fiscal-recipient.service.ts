import axios from 'axios';
import { STATE_IBGE_CODES } from '../vendor/finopenpos-fiscal/state-codes';

export interface LookupAddress {
  stateCode: string; cityCode: string; cityName: string; street: string;
  streetNumber: string; district: string; zipCode: string; complement: string;
}
const digits = (value: unknown) => String(value || '').replace(/\D/g, '');
const text = (value: unknown) => String(value || '').trim().slice(0, 60);
const cache = new Map<string, { expires: number; value: any }>();
const pending = new Map<string, Promise<any>>();
async function cached<T>(key: string, fetchValue: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  if (pending.has(key)) return pending.get(key)!;
  const request = fetchValue().then(value => {
    if (cache.size >= 300) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + 86400000, value });
    return value;
  }).finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}
function address(raw: Partial<LookupAddress>): LookupAddress {
  const stateCode = text(raw.stateCode).toUpperCase();
  if (!STATE_IBGE_CODES[stateCode]) throw new Error('A consulta não retornou uma UF válida; preencha o endereço manualmente');
  const cityCode = digits(raw.cityCode);
  return {
    stateCode, cityCode: /^\d{7}$/.test(cityCode) && cityCode.startsWith(STATE_IBGE_CODES[stateCode]) ? cityCode : '',
    cityName: text(raw.cityName), street: text(raw.street), streetNumber: text(raw.streetNumber),
    district: text(raw.district), zipCode: digits(raw.zipCode).slice(0, 8), complement: text(raw.complement),
  };
}
export function validCnpj(value: string) {
  if (!/^\d{14}$/.test(value) || /^(\d)\1+$/.test(value)) return false;
  const dv = (base: string, weights: number[]) => {
    const mod = base.split('').reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0) % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  return dv(value.slice(0, 12), [5,4,3,2,9,8,7,6,5,4,3,2]) === Number(value[12])
    && dv(value.slice(0, 13), [6,5,4,3,2,9,8,7,6,5,4,3,2]) === Number(value[13]);
}
export async function lookupFiscalCnpj(input: string) {
  const cnpj = digits(input);
  if (!validCnpj(cnpj)) throw new Error('Informe um CNPJ válido para consultar o endereço');
  return cached(`cnpj:${cnpj}`, async () => {
    try {
      const { data } = await axios.get(`https://publica.cnpj.ws/cnpj/${cnpj}`, { timeout: 10000 });
      const e = data.estabelecimento;
      if (!e || digits(e.cnpj) !== cnpj) throw new Error('CNPJ não localizado');
      return { recipientName: text(data.razao_social), recipientTaxId: cnpj, source: 'CNPJ.ws',
        address: address({ stateCode: e.estado?.sigla, cityCode: e.cidade?.ibge_id, cityName: e.cidade?.nome,
          street: [e.tipo_logradouro, e.logradouro].filter(Boolean).join(' '), streetNumber: e.numero,
          district: e.bairro, zipCode: e.cep, complement: e.complemento }),
      };
    } catch {
      try {
        const { data } = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, { timeout: 8000 });
        if (digits(data.cnpj) !== cnpj) throw new Error('CNPJ não localizado');
        return { recipientName: text(data.razao_social), recipientTaxId: cnpj, source: 'BrasilAPI',
          address: address({ stateCode: data.uf, cityCode: data.codigo_municipio_ibge, cityName: data.municipio,
            street: [data.descricao_tipo_de_logradouro, data.logradouro].filter(Boolean).join(' '), streetNumber: data.numero,
            district: data.bairro, zipCode: data.cep, complement: data.complemento }),
        };
      } catch { throw new Error('Não foi possível consultar o CNPJ agora. Preencha manualmente ou tente novamente.'); }
    }
  });
}
export async function lookupFiscalCep(input: string) {
  const cep = digits(input);
  if (!/^\d{8}$/.test(cep)) throw new Error('Informe um CEP com oito dígitos');
  return cached(`cep:${cep}`, async () => {
    try {
      const { data } = await axios.get(`https://viacep.com.br/ws/${cep}/json/`, { timeout: 8000 });
      if (data.erro) throw new Error('CEP não encontrado');
      return { source: 'ViaCEP', address: address({ stateCode: data.uf, cityCode: data.ibge, cityName: data.localidade,
        street: data.logradouro, district: data.bairro, zipCode: cep }) };
    } catch { throw new Error('CEP não localizado ou consulta indisponível. Revise o CEP ou preencha manualmente.'); }
  });
}
