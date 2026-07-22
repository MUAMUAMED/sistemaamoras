import https from "node:https";
import { SOAP_ENVELOPE_NS, NFE_WSDL_NS } from "./constants";
import type { SefazService } from "./types";

/**
 * Options for sending a SOAP request to SEFAZ
 *
 * [pt-BR] Opcoes para envio de requisicao SOAP para a SEFAZ
 */
interface SefazRequestOptions {
  /**
   * Full URL of the SEFAZ web service endpoint
   *
   * [pt-BR] URL completa do endpoint do web service da SEFAZ
   */
  url: string;
  /**
   * SOAP action / service name
   *
   * [pt-BR] Acao SOAP / nome do servico
   */
  service: SefazService;
  /**
   * XML content to send inside the SOAP body
   *
   * [pt-BR] Conteudo XML a ser enviado dentro do corpo SOAP
   */
  xmlContent: string;
  /**
   * PFX certificate buffer for mTLS
   *
   * [pt-BR] Buffer do certificado PFX para mTLS
   */
  pfx: Buffer;
  /**
   * PFX password
   *
   * [pt-BR] Senha do PFX
   */
  passphrase: string;
  /**
   * Request timeout in milliseconds (default: 30000)
   *
   * [pt-BR] Timeout da requisicao em milissegundos (padrao: 30000)
   */
  timeout?: number;
}

/**
 * Raw response from a SEFAZ web service call
 *
 * [pt-BR] Resposta bruta de uma chamada ao web service da SEFAZ
 */
interface SefazRawResponse {
  /**
   * HTTP status code
   *
   * [pt-BR] Codigo de status HTTP
   */
  httpStatus: number;
  /**
   * Raw XML response body
   *
   * [pt-BR] Corpo XML bruto da resposta
   */
  body: string;
  /**
   * Extracted content from SOAP envelope
   *
   * [pt-BR] Conteudo extraido do envelope SOAP
   */
  content: string;
}

/**
 * Send a SOAP 1.2 request to a SEFAZ web service with mutual TLS (client certificate).
 * Uses Node's native HTTPS client with the A1 PFX certificate.
 *
 * [pt-BR] Envia requisicao SOAP 1.2 para o web service da SEFAZ com mTLS (certificado digital).
 * Usa o cliente HTTPS nativo do Node com o certificado A1 PFX.
 */
export async function sefazRequest(options: SefazRequestOptions): Promise<SefazRawResponse> {
  const { url, service, xmlContent, pfx, passphrase, timeout = 30000 } = options;

  const soapEnvelope = buildSoapEnvelope(service, xmlContent);

  return new Promise((resolve, reject) => {
    const endpoint = new URL(url);
    const request = https.request({
      protocol: endpoint.protocol,
      hostname: endpoint.hostname,
      port: endpoint.port || 443,
      path: `${endpoint.pathname}${endpoint.search}`,
      method: "POST",
      pfx,
      passphrase,
      rejectUnauthorized: true,
      minVersion: "TLSv1.2",
      timeout,
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
        "Content-Length": Buffer.byteLength(soapEnvelope),
      },
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      response.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8").trim();
        const httpStatus = response.statusCode || 0;
        if (httpStatus < 200 || httpStatus >= 300) {
          reject(new Error(`SEFAZ returned HTTP ${httpStatus}`));
          return;
        }
        resolve({ httpStatus, body, content: extractSoapContent(body) });
      });
    });

    request.on("timeout", () => request.destroy(new Error(`SEFAZ request timed out after ${timeout}ms`)));
    request.on("error", (error) => reject(new Error(`SEFAZ request failed: ${error.message}`)));
    request.end(soapEnvelope);
  });
}

// ── Private helpers ─────────────────────────────────────────────────────────

/**
 * Build SOAP 1.2 envelope wrapping the NF-e request content.
 */
function buildSoapEnvelope(service: SefazService, xmlContent: string): string {
  const wsdlAction = `${NFE_WSDL_NS}/${service}`;

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<soap12:Envelope xmlns:soap12="${SOAP_ENVELOPE_NS}">`,
    `<soap12:Header/>`,
    `<soap12:Body>`,
    `<nfeDadosMsg xmlns="${wsdlAction}">`,
    xmlContent,
    `</nfeDadosMsg>`,
    `</soap12:Body>`,
    `</soap12:Envelope>`,
  ].join("");
}

/**
 * Extract the meaningful content from a SOAP response envelope.
 * Looks for <nfeResultMsg> or falls back to <soap:Body> content.
 */
function extractSoapContent(soapXml: string): string {
  // Try <nfeResultMsg>
  const resultMatch = soapXml.match(/<nfeResultMsg[^>]*>([\s\S]*?)<\/nfeResultMsg>/);
  if (resultMatch) return resultMatch[1];

  // Try generic Body content
  const bodyMatch = soapXml.match(/<[^:]*:Body[^>]*>([\s\S]*?)<\/[^:]*:Body>/);
  if (bodyMatch) return bodyMatch[1];

  return soapXml;
}
