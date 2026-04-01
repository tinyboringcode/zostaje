/**
 * KSeF (Krajowy System e-Faktur) API client
 * Docs: https://www.podatki.gov.pl/ksef/
 */

const KSEF_URLS = {
  test: "https://ksef-test.mf.gov.pl/api",
  prod: "https://ksef.mf.gov.pl/api",
};

export interface KSeFInvoice {
  ksefReferenceNumber: string;
  invoiceNumber: string;
  issuedAt: string;         // ISO date
  acquisitionTimestamp: string;
  sellerName: string;
  sellerNip: string;
  buyerName: string;
  buyerNip: string;
  netValue: number;
  vatValue: number;
  grossValue: number;
  currency: string;
}

/**
 * Step 1: Request authorisation challenge
 */
export async function getChallenge(baseUrl: string, nip: string): Promise<{ challenge: string; timestamp: string }> {
  const res = await fetch(`${baseUrl}/online/Session/AuthorisationChallenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contextIdentifier: { type: "onip", identifier: nip },
    }),
  });
  if (!res.ok) throw new Error(`KSeF challenge failed: ${res.status}`);
  return res.json();
}

/**
 * Step 2: Encrypt challenge with token (AES-256-CBC)
 * The token from e-Urząd Skarbowy is base64-encoded AES key
 */
export async function encryptChallenge(challenge: string, timestamp: string, tokenBase64: string): Promise<string> {
  const { createCipheriv } = await import("crypto");

  const tokenBytes = Buffer.from(tokenBase64, "base64");
  const challengeBytes = Buffer.from(challenge, "utf8");
  const timestampBytes = Buffer.from(timestamp, "utf8");

  // KSeF encryption: AES-256-CBC, IV = first 16 bytes of timestamp
  const iv = Buffer.alloc(16, 0);
  timestampBytes.copy(iv, 0, 0, Math.min(16, timestampBytes.length));

  const cipher = createCipheriv("aes-256-cbc", tokenBytes.slice(0, 32), iv);
  const encrypted = Buffer.concat([cipher.update(challengeBytes), cipher.final()]);
  return encrypted.toString("base64");
}

/**
 * Step 3: Initialize session
 */
export async function initSession(baseUrl: string, nip: string, encryptedChallenge: string): Promise<string> {
  const res = await fetch(`${baseUrl}/online/Session/Initialise`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contextIdentifier: { type: "onip", identifier: nip },
      encryptedToken: encryptedChallenge,
      documentType: { service: "KSeF" },
    }),
  });
  if (!res.ok) throw new Error(`KSeF session init failed: ${res.status}`);
  const data = await res.json();
  return data.sessionToken?.token ?? data.referenceNumber;
}

/**
 * Full auth flow → returns session token
 */
export async function authenticate(env: "test" | "prod", nip: string, tokenBase64: string): Promise<string> {
  const baseUrl = KSEF_URLS[env];
  const { challenge, timestamp } = await getChallenge(baseUrl, nip);
  const encrypted = await encryptChallenge(challenge, timestamp, tokenBase64);
  return initSession(baseUrl, nip, encrypted);
}

/**
 * Fetch invoices (received by buyer — zakupy)
 */
export async function fetchInvoices(
  env: "test" | "prod",
  sessionToken: string,
  from: Date,
  to: Date
): Promise<KSeFInvoice[]> {
  const baseUrl = KSEF_URLS[env];

  const queryRes = await fetch(`${baseUrl}/online/Invoice/GetForBuyer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "SessionToken": sessionToken,
    },
    body: JSON.stringify({
      queryCriteria: {
        subjectType: "subject2",  // buyer
        acquisitionTimestampThresholdFrom: from.toISOString(),
        acquisitionTimestampThresholdTo: to.toISOString(),
      },
    }),
  });

  if (!queryRes.ok) throw new Error(`KSeF query failed: ${queryRes.status}`);
  const data = await queryRes.json();

  const invoiceList = data.invoiceHeaderList ?? [];
  return invoiceList.map((inv: Record<string, unknown>) => ({
    ksefReferenceNumber: inv.ksefReferenceNumber as string,
    invoiceNumber: inv.invoiceReferenceNumber as string ?? "",
    issuedAt: inv.invoicingDate as string ?? "",
    acquisitionTimestamp: inv.acquisitionTimestamp as string ?? "",
    sellerName: ((inv.subjectBy as Record<string,Record<string,unknown>>)?.issuedToIdentifier?.fullName as string) ?? "—",
    sellerNip: ((inv.subjectBy as Record<string,Record<string,unknown>>)?.issuedToIdentifier?.identifier as string) ?? "",
    buyerName: ((inv.subjectTo as Record<string,Record<string,unknown>>)?.issuedToIdentifier?.fullName as string) ?? "—",
    buyerNip: ((inv.subjectTo as Record<string,Record<string,unknown>>)?.issuedToIdentifier?.identifier as string) ?? "",
    netValue: (inv.net as number) ?? 0,
    vatValue: (inv.vat as number) ?? 0,
    grossValue: (inv.gross as number) ?? 0,
    currency: (inv.currency as string) ?? "PLN",
  }));
}

/**
 * Terminate session
 */
export async function terminateSession(env: "test" | "prod", sessionToken: string) {
  const baseUrl = KSEF_URLS[env];
  await fetch(`${baseUrl}/online/Session/Terminate`, {
    method: "GET",
    headers: { "SessionToken": sessionToken },
  }).catch(() => {});
}
