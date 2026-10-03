# FinOpenPOS Fiscal (vendored)

Source: https://github.com/JoaoHenriqueBarbosa/FinOpenPOS

Pinned revision: see `UPSTREAM_COMMIT`.

The Amoras backend uses a curated export surface from this MIT-licensed module
for NFC-e XML generation, certificate signing, QR Code generation, SEFAZ
transport, response parsing, status checks, and cancellation events. Local
security changes replace shell-based HTTP transport and unsafe OpenSSL command
interpolation with native TLS and argument-safe process execution.
