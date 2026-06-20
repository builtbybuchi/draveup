import { logger } from "./logger";

const API_BASE = process.env.DYNADOT_API_BASE;

function getApiKey(): string {
  const key = process.env.DYNADOT_API_KEY;
  if (!key) throw new Error("DYNADOT_API_KEY environment variable is required");
  return key;
}

async function callDynadot(params: Record<string, string>): Promise<any> {
  const url = new URL(API_BASE);
  url.searchParams.set("key", getApiKey());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { method: "GET" });
  // Always read raw text so we can log non-JSON responses (HTML/XML, error pages, etc.)
  const raw = await res.text().catch(() => "");
  if (!res.ok) {
    logger.error({ command: params.command, status: res.status, body: raw.slice(0, 2000) }, "Dynadot non-2xx response");
    throw new Error(`Dynadot API returned status ${res.status} for command "${params.command}"`);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    logger.error({ command: params.command, body: raw.slice(0, 2000) }, "Dynadot returned non-JSON response");
    throw new Error(`Dynadot returned non-JSON response for command "${params.command}"`);
  }
}

/** Extract the status string from any Dynadot response header object. */
function extractStatus(json: any): "success" | "error" {
  const candidates = [
    json?.ResponseHeader?.Status,
    json?.Header?.Status,
    json?.Status,
  ];
  for (const c of candidates) {
    if (typeof c === "string") return c.toLowerCase() === "success" ? "success" : "error";
  }
  return "error";
}

/** Extract an error message from a Dynadot response. */
function extractError(json: any): string {
  const candidates = [
    json?.ResponseHeader?.Error,
    json?.Header?.Error,
    json?.Error,
    json?.error,
  ];
  for (const c of candidates) {
    if (c && typeof c === "string") return c;
  }
  return "Unknown Dynadot error";
}

export interface DynadotError { ok: false; code: string; message: string }
export interface DynadotOk<T> { ok: true; data: T }
export type DynadotResult<T> = DynadotOk<T> | DynadotError;

function err(code: string, message: string): DynadotError {
  return { ok: false, code, message };
}
function ok<T>(data: T): DynadotOk<T> {
  return { ok: true, data };
}

// ─── DOMAIN AVAILABILITY ──────────────────────────────────────────────────────
export interface AvailabilityResult {
  domain: string;
  available: boolean;
  price?: number;
  currency?: string;
  raw?: any;
}

export async function checkAvailability(
  domains: string[],
  options: { showPrice?: boolean; currency?: string } = {},
): Promise<AvailabilityResult[]> {
  if (!domains.length) return [];
  
  const results: AvailabilityResult[] = [];
  
  // Process domains one at a time (Dynadot search API only accepts one domain per request)
  for (const domain of domains) {
    const params: Record<string, string> = {
      command: "search",
      domain0: domain.toLowerCase(),
      show_price: "1", // Always request pricing (show_price=1)
      currency: options.currency ?? "USD",
    };
    
    try {
      const json = await callDynadot(params);
      
      // Handle both response formats: SearchResponse and Response
      const searchResponse = json?.SearchResponse || json?.Response;
      if (!searchResponse) {
        logger.error({ json, domain }, "Invalid Dynadot search response structure");
        // When API response is invalid, return unknown status rather than unavailable
        results.push({
          domain: domain.toLowerCase(),
          available: false,
          raw: { error: "Invalid response structure" },
        });
        continue;
      }
      
      // Check ResponseCode for success (0 = success, -1 = failure)
      const responseCode = searchResponse.ResponseCode || searchResponse.SuccessCode;
      if (responseCode && responseCode !== "0" && responseCode !== 0) {
        const error = searchResponse.Error || "Unknown error";
        logger.warn({ responseCode, error, domain, ipAddress: json?.Response?.Error }, "Dynadot search API error");
        // On API errors (like IP restrictions), return unknown availability
        results.push({
          domain: domain.toLowerCase(),
          available: false, // Assume unavailable when we can't verify
          raw: { error, responseCode },
        });
        continue;
      }
      
      // SearchResults can be an array or a single object
      const searchResults = searchResponse.SearchResults || [];
      const arr = Array.isArray(searchResults) ? searchResults : [searchResults].filter(Boolean);
      
      for (const result of arr) {
        const resultDomain = String(result.DomainName || "").toLowerCase();
        if (!resultDomain) continue;
        
        // Available field should be "yes" or "no" according to Dynadot docs
        const availableStr = String(result.Available || "").toLowerCase().trim();
        const available = availableStr === "yes";
        
        // Parse price from Price string like "77.00 in USD"
        let price: number | undefined;
        if (result.Price) {
          const priceStr = String(result.Price);
          // Extract the numeric value before "in" or at the start
          const match = priceStr.match(/^([\d.]+)/);
          if (match) {
            const parsed = parseFloat(match[1]);
            price = Number.isFinite(parsed) ? parsed : undefined;
          }
        }
        
        results.push({
          domain: resultDomain,
          available,
          price,
          currency: result.Currency || options.currency || "USD",
          raw: result,
        });
      }
    } catch (e) {
      logger.error({ err: e, domain }, "Dynadot search API call failed");
      // When network/API fails, mark as unavailable but still return the domain
      results.push({
        domain: domain.toLowerCase(),
        available: false,
        raw: { error: String(e) },
      });
    }
  }
  
  return results;
}

// ─── TLD PRICING ──────────────────────────────────────────────────────────────
export interface DynadotTldPrice {
  tld: string;
  registration?: number;
  renewal?: number;
  transfer?: number;
  restore?: number;
  currency: string;
  raw?: any;
}

export async function getTldPrices(currency = "USD"): Promise<DynadotTldPrice[]> {
  const json = await callDynadot({ command: "tld_price", currency });
  const resp = json?.TldPriceResponse ?? json;
  if (extractStatus(resp) !== "success") {
    const message = extractError(resp);
    logger.error({ resp }, "Dynadot tld_price reported error");
    throw new Error(`Dynadot tld_price failed: ${message}`);
  }

  // Try multiple possible container shapes used by Dynadot JSON/XML->JSON conversions
  let list: any[] = [];
  if (Array.isArray(resp?.TldPrice)) list = resp.TldPrice;
  else if (Array.isArray(resp?.TldPriceList?.TldPrice)) list = resp.TldPriceList.TldPrice;
  else if (Array.isArray(resp?.TldPriceContent?.TldContent)) list = resp.TldPriceContent.TldContent;
  else if (Array.isArray(json?.TldPrice)) list = json.TldPrice;
  else if (resp?.TldPrice) list = Array.isArray(resp.TldPrice) ? resp.TldPrice : [resp.TldPrice];
  else if (resp?.TldPriceContent?.TldContent) list = Array.isArray(resp.TldPriceContent.TldContent) ? resp.TldPriceContent.TldContent : [resp.TldPriceContent.TldContent];

  if (!list || list.length === 0) {
    logger.error({ resp }, "Dynadot returned no TLDs");
    throw new Error("Dynadot returned no TLDs");
  }

  const out: DynadotTldPrice[] = [];
  const num = (v: any) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(String(v).replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : undefined;
  };

  for (const item of list as any[]) {
    // Item may either be a direct TldPrice object or a TldContent element
    const tldRaw = String(item.Tld || item.TLD || item.Name || "").toLowerCase().replace(/^\./, "");
    if (!tldRaw) continue;
    const priceObj = item.Price ?? item?.price ?? undefined;
    const registration = num(priceObj?.Register ?? item?.Registration ?? item?.Register ?? item?.RegistrationPrice ?? priceObj?.Register);
    const renewal = num(priceObj?.Renew ?? item?.Renewal ?? item?.Renew ?? item?.RenewalPrice ?? priceObj?.Renew);
    const transfer = num(priceObj?.Transfer ?? item?.Transfer ?? item?.TransferPrice ?? priceObj?.Transfer);
    const restore = num(priceObj?.Restore ?? item?.Restore ?? item?.RestorePrice ?? item?.Redemption ?? priceObj?.Restore);
    out.push({
      tld: tldRaw,
      registration: registration as any,
      renewal: renewal as any,
      transfer: transfer as any,
      restore: restore as any,
      currency: String(item?.Currency ?? resp?.Currency ?? currency).toUpperCase(),
      raw: item,
    });
  }
  return out;
}

// ─── WHOIS ────────────────────────────────────────────────────────────────────
export interface WhoisResult {
  found: boolean;
  domain: string;
  registrar?: string;
  status?: string[] | string;
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  nameservers?: string[];
  registrant?: { name?: string; organization?: string; country?: string };
  raw?: any;
  message?: string;
}

export async function whoisLookup(domain: string): Promise<WhoisResult> {
  const d = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*/, "");
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(d)}`, {
      headers: { Accept: "application/rdap+json" },
    });
    if (res.status === 404) return { found: false, domain: d, message: "Domain not found — likely available." };
    if (!res.ok) return { found: false, domain: d, message: `RDAP HTTP ${res.status}` };
    const json: any = await res.json();
    const events: any[] = json.events || [];
    const findEvent = (a: string) => events.find((e) => e.eventAction === a)?.eventDate;
    const ns: string[] = (json.nameservers || []).map((n: any) => String(n.ldhName || n.unicodeName || "").toLowerCase()).filter(Boolean);
    const registrarEntity = (json.entities || []).find((e: any) => Array.isArray(e.roles) && e.roles.includes("registrar"));
    const registrar = registrarEntity?.vcardArray?.[1]?.find?.((f: any) => f[0] === "fn")?.[3];
    return { found: true, domain: d, registrar: registrar || undefined, status: json.status, createdAt: findEvent("registration"), updatedAt: findEvent("last changed"), expiresAt: findEvent("expiration"), nameservers: ns, raw: json };
  } catch (e) {
    return { found: false, domain: d, message: `WHOIS lookup failed: ${String(e)}` };
  }
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────
export interface RegisterParams {
  domain: string;
  years: number;
  nameservers?: string[];  // defaults to Dynadot parking NS
  privacy?: boolean;
}
export interface RegisterResult {
  domain: string;
  expiresAt: string;  // ISO date string from Dynadot
  raw?: any;
}

export async function registerDomain(p: RegisterParams): Promise<DynadotResult<RegisterResult>> {
  try {
    const params: Record<string, string> = {
      command: "register",
      domain: p.domain,
      duration: String(Math.max(1, Math.min(10, p.years))),
    };
    const ns = p.nameservers?.length ? p.nameservers : ["ns1.dynadot.com", "ns2.dynadot.com"];
    ns.forEach((n, i) => { params[`ns${i}`] = n; });
    if (p.privacy) params["privacy"] = "1";
    const json = await callDynadot(params);
    const resp = json?.RegisterResponse ?? json;
    if (extractStatus(resp) !== "success") {
      return err("REGISTER_FAILED", extractError(resp));
    }
    const content = resp?.RegisterContent ?? resp?.Content ?? resp;
    const rawExp = content?.Expiration ?? content?.ExpirationDate;
    const expiry = rawExp ? String(rawExp).trim() : "";
    let expiresAt: string;
    try {
      expiresAt = expiry ? new Date(expiry.replace(/\//g, "-")).toISOString() : new Date(Date.now() + p.years * 365.25 * 86400_000).toISOString();
    } catch (err) {
      expiresAt = new Date(Date.now() + p.years * 365.25 * 86400_000).toISOString();
    }
    return ok({ domain: p.domain, expiresAt, raw: resp });
  } catch (e) {
    return err("REGISTER_ERROR", (e as Error).message);
  }
}

// ─── RENEW ────────────────────────────────────────────────────────────────────
export interface RenewResult {
  domain: string;
  expiresAt: string;
  raw?: any;
}

export async function renewDomain(domain: string, years: number): Promise<DynadotResult<RenewResult>> {
  try {
    const json = await callDynadot({ command: "renew", domain, duration: String(Math.max(1, Math.min(10, years))) });
    const resp = json?.RenewResponse ?? json;
    if (extractStatus(resp) !== "success") return err("RENEW_FAILED", extractError(resp));
    const content = resp?.RenewContent ?? resp?.Content ?? resp;
    const rawExp = content?.Expiration ?? content?.ExpirationDate;
    const expiry = rawExp ? String(rawExp).trim() : "";
    let expiresAt: string;
    try {
      expiresAt = expiry ? new Date(expiry.replace(/\//g, "-")).toISOString() : new Date(Date.now() + years * 365.25 * 86400_000).toISOString();
    } catch (err) {
      expiresAt = new Date(Date.now() + years * 365.25 * 86400_000).toISOString();
    }
    return ok({ domain, expiresAt, raw: resp });
  } catch (e) {
    return err("RENEW_ERROR", (e as Error).message);
  }
}

// ─── TRANSFER ─────────────────────────────────────────────────────────────────
export interface TransferResult {
  domain: string;
  transferId?: string;
  raw?: any;
}

export async function transferDomain(domain: string, authCode: string): Promise<DynadotResult<TransferResult>> {
  try {
    const json = await callDynadot({ command: "transfer", domain, auth_code: authCode });
    const resp = json?.TransferResponse ?? json;
    if (extractStatus(resp) !== "success") return err("TRANSFER_FAILED", extractError(resp));
    const content = resp?.TransferContent ?? resp?.Content ?? resp;
    return ok({ domain, transferId: content?.TransferId ?? content?.transferId, raw: resp });
  } catch (e) {
    return err("TRANSFER_ERROR", (e as Error).message);
  }
}

// ─── TRANSFER STATUS ──────────────────────────────────────────────────────────
export interface TransferStatus {
  domain: string;
  status: string;
  createdAt?: string;
  raw?: any;
}

export async function getTransferStatus(domain: string): Promise<DynadotResult<TransferStatus>> {
  try {
    const json = await callDynadot({ command: "get_transfer_status", domain });
    const resp = json?.GetTransferStatusResponse ?? json?.TransferStatusResponse ?? json;
    if (extractStatus(resp) !== "success") return err("TRANSFER_STATUS_FAILED", extractError(resp));
    const content = resp?.TransferContent ?? resp?.Content ?? resp;
    return ok({ domain, status: String(content?.Status ?? content?.TransferStatus ?? "unknown"), createdAt: content?.CreatedDate, raw: resp });
  } catch (e) {
    return err("TRANSFER_STATUS_ERROR", (e as Error).message);
  }
}

// ─── NAMESERVERS ──────────────────────────────────────────────────────────────
export interface NameserverResult {
  domain: string;
  nameservers: string[];
  raw?: any;
}

export async function getNameservers(domain: string): Promise<DynadotResult<NameserverResult>> {
  try {
    const json = await callDynadot({ command: "get_ns", domain });
    const resp = json?.GetNsResponse ?? json?.NsResponse ?? json;
    if (extractStatus(resp) !== "success") return err("GET_NS_FAILED", extractError(resp));
    const content = resp?.NsContent ?? resp?.GetNsContent ?? resp?.Content ?? resp;
    const nsList: string[] = [];
    for (let i = 0; i < 13; i++) {
      const ns = content?.[`Ns${i}`] ?? content?.[`ns${i}`];
      if (ns && typeof ns === "string" && ns.trim()) nsList.push(ns.trim().toLowerCase());
    }
    return ok({ domain, nameservers: nsList, raw: resp });
  } catch (e) {
    return err("GET_NS_ERROR", (e as Error).message);
  }
}

export async function setNameservers(domain: string, nameservers: string[]): Promise<DynadotResult<NameserverResult>> {
  try {
    if (!nameservers.length || nameservers.length < 2) return err("INVALID_NS", "At least 2 nameservers required");
    const params: Record<string, string> = { command: "set_ns", domain, ns_option: "ns" };
    nameservers.slice(0, 13).forEach((ns, i) => { params[`ns${i}`] = ns; });
    const json = await callDynadot(params);
    const resp = json?.SetNsResponse ?? json?.NsResponse ?? json;
    if (extractStatus(resp) !== "success") return err("SET_NS_FAILED", extractError(resp));
    return ok({ domain, nameservers, raw: resp });
  } catch (e) {
    return err("SET_NS_ERROR", (e as Error).message);
  }
}

// ─── CONTACTS ─────────────────────────────────────────────────────────────────
export interface ContactData {
  firstName: string;
  lastName: string;
  organization?: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface ContactResult {
  domain: string;
  contactType: string;
  contact?: ContactData;
  raw?: any;
}

export async function getContact(domain: string, contactType = "registrant"): Promise<DynadotResult<ContactResult>> {
  try {
    const json = await callDynadot({ command: "get_contact", domain, contact_type: contactType });
    const resp = json?.GetContactResponse ?? json?.ContactResponse ?? json;
    if (extractStatus(resp) !== "success") return err("GET_CONTACT_FAILED", extractError(resp));
    const c = resp?.Contact ?? resp?.ContactContent ?? resp?.Content ?? {};
    return ok({
      domain, contactType,
      contact: {
        firstName: c.FirstName ?? c.first_name ?? "",
        lastName: c.LastName ?? c.last_name ?? "",
        organization: c.Organization ?? c.organization,
        email: c.Email ?? c.email ?? "",
        phone: c.Phone ?? c.phone ?? "",
        address1: c.Address1 ?? c.address1 ?? "",
        address2: c.Address2 ?? c.address2,
        city: c.City ?? c.city ?? "",
        state: c.State ?? c.state,
        postalCode: c.ZipCode ?? c.PostalCode ?? c.postalCode ?? c.zip ?? "",
        country: c.Country ?? c.country ?? "",
      },
      raw: resp,
    });
  } catch (e) {
    return err("GET_CONTACT_ERROR", (e as Error).message);
  }
}

export async function setContact(domain: string, contactType: string, contact: ContactData): Promise<DynadotResult<ContactResult>> {
  try {
    const params: Record<string, string> = {
      command: "set_contact",
      domain,
      contact_type: contactType,
      first_name: contact.firstName,
      last_name: contact.lastName,
      email: contact.email,
      phone_num: contact.phone,
      address1: contact.address1,
      city: contact.city,
      country: contact.country,
      zip_code: contact.postalCode,
    };
    if (contact.organization) params["organization"] = contact.organization;
    if (contact.address2) params["address2"] = contact.address2;
    if (contact.state) params["state"] = contact.state;
    const json = await callDynadot(params);
    const resp = json?.SetContactResponse ?? json?.ContactResponse ?? json;
    if (extractStatus(resp) !== "success") return err("SET_CONTACT_FAILED", extractError(resp));
    return ok({ domain, contactType, contact, raw: resp });
  } catch (e) {
    return err("SET_CONTACT_ERROR", (e as Error).message);
  }
}

// ─── LOCK / UNLOCK ────────────────────────────────────────────────────────────
export interface LockResult { domain: string; locked: boolean; raw?: any }

export async function lockDomain(domain: string): Promise<DynadotResult<LockResult>> {
  try {
    const json = await callDynadot({ command: "lock", domain });
    const resp = json?.LockResponse ?? json;
    if (extractStatus(resp) !== "success") return err("LOCK_FAILED", extractError(resp));
    return ok({ domain, locked: true, raw: resp });
  } catch (e) {
    return err("LOCK_ERROR", (e as Error).message);
  }
}

export async function unlockDomain(domain: string): Promise<DynadotResult<LockResult>> {
  try {
    const json = await callDynadot({ command: "unlock", domain });
    const resp = json?.UnlockResponse ?? json;
    if (extractStatus(resp) !== "success") return err("UNLOCK_FAILED", extractError(resp));
    return ok({ domain, locked: false, raw: resp });
  } catch (e) {
    return err("UNLOCK_ERROR", (e as Error).message);
  }
}

// ─── AUTH CODE (EPP) ──────────────────────────────────────────────────────────
export interface AuthCodeResult { domain: string; authCode: string; raw?: any }

export async function getAuthCode(domain: string): Promise<DynadotResult<AuthCodeResult>> {
  try {
    const json = await callDynadot({ command: "get_auth_code", domain });
    const resp = json?.GetAuthCodeResponse ?? json?.AuthCodeResponse ?? json;
    if (extractStatus(resp) !== "success") return err("GET_AUTH_CODE_FAILED", extractError(resp));
    const content = resp?.AuthCodeContent ?? resp?.Content ?? resp;
    const authCode = String(content?.AuthCode ?? content?.auth_code ?? content?.AuthorizationCode ?? "");
    if (!authCode) return err("GET_AUTH_CODE_EMPTY", "Auth code not returned by Dynadot");
    return ok({ domain, authCode, raw: resp });
  } catch (e) {
    return err("GET_AUTH_CODE_ERROR", (e as Error).message);
  }
}

// ─── PRIVACY ──────────────────────────────────────────────────────────────────
export interface PrivacyResult { domain: string; privacyOn: boolean; raw?: any }

export async function setPrivacy(domain: string, on: boolean): Promise<DynadotResult<PrivacyResult>> {
  try {
    const json = await callDynadot({ command: "set_privacy", domain, option: on ? "full" : "off" });
    const resp = json?.SetPrivacyResponse ?? json?.PrivacyResponse ?? json;
    if (extractStatus(resp) !== "success") return err("SET_PRIVACY_FAILED", extractError(resp));
    return ok({ domain, privacyOn: on, raw: resp });
  } catch (e) {
    return err("SET_PRIVACY_ERROR", (e as Error).message);
  }
}

// ─── DOMAIN INFO ──────────────────────────────────────────────────────────────
export interface DomainInfo {
  domain: string;
  status: string;
  expiresAt?: string;
  locked?: boolean;
  privacyOn?: boolean;
  nameservers: string[];
  autoRenew?: boolean;
  raw?: any;
}

export async function getDomainInfo(domain: string): Promise<DynadotResult<DomainInfo>> {
  try {
    const json = await callDynadot({ command: "domain_info", domain });
    const resp = json?.DomainInfoResponse ?? json?.InfoResponse ?? json;
    if (extractStatus(resp) !== "success") return err("DOMAIN_INFO_FAILED", extractError(resp));
    const di = resp?.DomainInfo ?? resp?.Domain ?? resp?.Content ?? resp;
    const ns: string[] = [];
    const nsObj = di?.NameServerSettings ?? di?.NameServers ?? di?.Nameservers ?? {};
    const nsArr = nsObj?.NameServers ?? nsObj;
    if (Array.isArray(nsArr)) {
      nsArr.forEach((n: any) => { const v = n?.Host ?? n?.host ?? String(n); if (v) ns.push(v.toLowerCase()); });
    } else {
      for (let i = 0; i < 13; i++) { const v = nsObj?.[`Ns${i}`] ?? nsObj?.[`ns${i}`]; if (v) ns.push(String(v).toLowerCase()); }
    }
    const expiry = di?.Expiration ?? di?.ExpirationDate ?? di?.expiration ?? "";
    return ok({
      domain,
      status: String(di?.Status ?? di?.status ?? "active").toLowerCase(),
      expiresAt: expiry ? new Date(String(expiry).replace(/\//g, "-")).toISOString() : undefined,
      locked: di?.Locked === "yes" || di?.locked === true || di?.Locked === true,
      privacyOn: di?.Privacy === "full" || di?.privacy === true,
      autoRenew: di?.RenewalMode === "auto" || di?.AutoRenew === "yes" || di?.auto_renew === true,
      nameservers: ns,
      raw: resp,
    });
  } catch (e) {
    return err("DOMAIN_INFO_ERROR", (e as Error).message);
  }
}

// ─── LIST ACCOUNT DOMAINS ─────────────────────────────────────────────────────
export interface AccountDomain {
  domain: string;
  expiresAt?: string;
  status?: string;
  locked?: boolean;
  autoRenew?: boolean;
}

export async function listAccountDomains(showExpired = true): Promise<DynadotResult<AccountDomain[]>> {
  try {
    const json = await callDynadot({ command: "list_domain", show_expired: showExpired ? "yes" : "no" });
    const resp = json?.ListDomainInfoResponse ?? json?.DomainList ?? json;
    if (extractStatus(resp) !== "success") return err("LIST_DOMAINS_FAILED", extractError(resp));
    const items = resp?.ListDomainInfoContent?.DomainInfoList?.DomainInfo
      ?? resp?.DomainInfoList?.DomainInfo
      ?? resp?.domains
      ?? [];
    const arr = Array.isArray(items) ? items : [items];
    const domains: AccountDomain[] = arr
      .filter((d: any) => d?.Domain || d?.domain)
      .map((d: any) => {
        const name = String(d.Domain ?? d.domain ?? "").toLowerCase();
        const expiry = d.Expiration ?? d.ExpirationDate ?? d.expiration ?? "";
        return {
          domain: name,
          expiresAt: expiry ? new Date(String(expiry).replace(/\//g, "-")).toISOString() : undefined,
          status: String(d.Status ?? d.status ?? "active").toLowerCase(),
          locked: d.Locked === "yes" || d.locked === true,
          autoRenew: d.RenewalMode === "auto" || d.AutoRenew === "yes",
        };
      });
    return ok(domains);
  } catch (e) {
    return err("LIST_DOMAINS_ERROR", (e as Error).message);
  }
}

// ─── DNS RECORDS ──────────────────────────────────────────────────────────────

export interface DnsRecord {
  type: string;       // A, AAAA, CNAME, MX, TXT, NS, SRV, CAA, etc.
  host: string;       // "@" for root, subdomain label otherwise
  value: string;
  ttl?: number;
  distance?: number;  // MX priority
  port?: number;      // SRV
  weight?: number;    // SRV
}

export interface DnsResult {
  domain: string;
  records: DnsRecord[];
  raw?: any;
}

export async function getDnsRecords(domain: string): Promise<DynadotResult<DnsResult>> {
  try {
    const json = await callDynadot({ command: "get_dns", domain });
    const resp = json?.GetDnsResponse ?? json?.DnsResponse ?? json;
    if (extractStatus(resp) !== "success") return err("GET_DNS_FAILED", extractError(resp));

    const content = resp?.GetDnsContent ?? resp?.DnsContent ?? resp?.Content ?? {};
    const domainObj = content?.Domain ?? content;
    const recordList = domainObj?.RecordList?.Record ?? domainObj?.Records ?? domainObj?.record ?? [];
    const arr: any[] = Array.isArray(recordList) ? recordList : (recordList ? [recordList] : []);

    const records: DnsRecord[] = arr.map((r: any) => ({
      type: String(r.RecordType ?? r.Type ?? r.type ?? "A").toUpperCase(),
      host: String(r.Host ?? r.host ?? r.Subdomain ?? r.subdomain ?? "@"),
      value: String(r.Value ?? r.value ?? r.Data ?? r.data ?? ""),
      ttl: r.Ttl ?? r.ttl ? Number(r.Ttl ?? r.ttl) : undefined,
      distance: r.Distance ?? r.distance ? Number(r.Distance ?? r.distance) : undefined,
      port: r.Port ?? r.port ? Number(r.Port ?? r.port) : undefined,
      weight: r.Weight ?? r.weight ? Number(r.Weight ?? r.weight) : undefined,
    })).filter((r) => r.value);

    return ok({ domain, records, raw: resp });
  } catch (e) {
    return err("GET_DNS_ERROR", (e as Error).message);
  }
}

/**
 * Set DNS records for a domain using Dynadot's set_dns2 command.
 * Replaces all existing DNS records.
 * Supports record types: A, AAAA, CNAME, MX, TXT, NS, SRV, CAA.
 * Main-domain records use host "@"; subdomain records use any other host value.
 */
export async function setDnsRecords(domain: string, records: DnsRecord[]): Promise<DynadotResult<DnsResult>> {
  try {
    const params: Record<string, string> = { command: "set_dns2", domain };

    let mainIdx = 0;
    let subIdx = 0;
    let mxIdx = 0;

    for (const rec of records) {
      const type = rec.type.toUpperCase();
      const host = rec.host === "@" ? "" : rec.host;
      const ttl = String(rec.ttl ?? 300);

      if (type === "MX") {
        params[`mx_host${mxIdx}`] = host || "@";
        params[`mx_value${mxIdx}`] = rec.value;
        params[`mx_distance${mxIdx}`] = String(rec.distance ?? 10);
        params[`mx_ttl${mxIdx}`] = ttl;
        mxIdx++;
      } else if (!host) {
        // main-domain record (host is "@")
        params[`main_record_type${mainIdx}`] = type;
        params[`main_record_value${mainIdx}`] = rec.value;
        params[`main_ttl${mainIdx}`] = ttl;
        if (rec.distance !== undefined) params[`main_record_distance${mainIdx}`] = String(rec.distance);
        mainIdx++;
      } else {
        // subdomain record
        params[`subdomain${subIdx}`] = host;
        params[`subrecord_type${subIdx}`] = type;
        params[`subrecord_value${subIdx}`] = rec.value;
        params[`sub_ttl${subIdx}`] = ttl;
        if (rec.distance !== undefined) params[`subrecord_distance${subIdx}`] = String(rec.distance);
        subIdx++;
      }
    }

    const json = await callDynadot(params);
    const resp = json?.SetDns2Response ?? json?.SetDnsResponse ?? json?.DnsResponse ?? json;
    if (extractStatus(resp) !== "success") return err("SET_DNS_FAILED", extractError(resp));
    return ok({ domain, records, raw: resp });
  } catch (e) {
    return err("SET_DNS_ERROR", (e as Error).message);
  }
}

// ─── DELETE PENDING TRANSFER ──────────────────────────────────────────────────

export interface DeleteTransferResult { domain: string; raw?: any }

export async function deletePendingTransfer(domain: string): Promise<DynadotResult<DeleteTransferResult>> {
  try {
    const json = await callDynadot({ command: "delete_transfer_order", domain });
    const resp = json?.DeleteTransferResponse ?? json?.TransferDeleteResponse ?? json;
    if (extractStatus(resp) !== "success") return err("DELETE_TRANSFER_FAILED", extractError(resp));
    return ok({ domain, raw: resp });
  } catch (e) {
    return err("DELETE_TRANSFER_ERROR", (e as Error).message);
  }
}
