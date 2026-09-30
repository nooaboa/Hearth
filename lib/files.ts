const BUCKET = "member-files";
const MAX_BYTES = 10 * 1024 * 1024;

const TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const AGREEMENT_KINDS = [
  { value: "membership_agreement", label: "Membership agreement" },
  { value: "leadership_agreement", label: "Leadership role agreement" },
] as const;

export type AgreementKind = (typeof AGREEMENT_KINDS)[number]["value"];

export function agreementLabel(kind: string) {
  return AGREEMENT_KINDS.find((item) => item.value === kind)?.label ?? kind;
}

export function isAgreementKind(value: string): value is AgreementKind {
  return AGREEMENT_KINDS.some((item) => item.value === value);
}

function storageConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to operator/.env.local.");
  }
  return { url: url.replace(/\/$/, ""), key };
}

function storageError(text: string, status: number) {
  try {
    const body = JSON.parse(text) as { message?: string; error?: string };
    return new Error(body.message || body.error || `Storage returned ${status}`);
  } catch {
    return new Error(text || `Storage returned ${status}`);
  }
}

export function agreementFile(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose the signed agreement file.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Agreement files have to be 10 MB or smaller.");
  }
  const extension = file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  const contentType = TYPES[file.type] ? file.type : TYPE_BY_EXTENSION[extension];
  if (!contentType || !TYPES[contentType]) {
    throw new Error("Upload a PDF or a photo (JPEG, PNG, or WebP).");
  }
  const base = file.name.split(/[/\\]/).pop()?.replace(/[\r\n"]/g, "").trim() || `agreement.${TYPES[contentType]}`;
  return { file, contentType, fileName: base.slice(0, 180) };
}

export function matchesAgreementBytes(bytes: Uint8Array, contentType: string) {
  if (contentType === "application/pdf") {
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  }
  if (contentType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  if (contentType === "image/webp") {
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }
  return false;
}

export function agreementPath(personId: number, kind: AgreementKind, contentType: string) {
  return `people/${personId}/${kind}/${crypto.randomUUID()}.${TYPES[contentType]}`;
}

export async function uploadStoredFile(path: string, bytes: Uint8Array, contentType: string) {
  const { url, key } = storageConfig();
  const response = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": contentType,
      "x-upsert": "false",
    },
    body: Buffer.from(bytes),
    cache: "no-store",
  });
  if (!response.ok) throw storageError(await response.text(), response.status);
}

export async function readStoredFile(path: string) {
  const { url, key } = storageConfig();
  const response = await fetch(`${url}/storage/v1/object/authenticated/${BUCKET}/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw storageError(await response.text(), response.status);
  return new Uint8Array(await response.arrayBuffer());
}

export async function removeStoredFile(path: string) {
  const { url, key } = storageConfig();
  const response = await fetch(`${url}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: [path] }),
    cache: "no-store",
  });
  if (response.status === 404) return;
  if (!response.ok) throw storageError(await response.text(), response.status);
}

export function attachmentDisposition(fileName: string) {
  const cleaned = fileName.replace(/[\r\n"]/g, "").slice(0, 180) || "agreement";
  const ascii = cleaned.replace(/[^\x20-\x7E]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(cleaned)}`;
}
