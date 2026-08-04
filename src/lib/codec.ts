// Encode/decode quotation JSON into a compact shareable URL fragment.

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64_ALPHABET[b0 >> 2];
    out += B64_ALPHABET[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? B64_ALPHABET[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < bytes.length ? B64_ALPHABET[b2 & 63] : '=';
  }
  return out;
}

function fromBase64(s: string): Uint8Array {
  s = s.replace(/[^A-Za-z0-9+/]/g, '');
  const len = s.length;
  const out = new Uint8Array((len / 4) * 3);
  let o = 0;
  for (let i = 0; i < len; i += 4) {
    const c0 = B64_ALPHABET.indexOf(s[i]);
    const c1 = B64_ALPHABET.indexOf(s[i + 1]);
    const c2 = i + 2 < len ? B64_ALPHABET.indexOf(s[i + 2]) : 0;
    const c3 = i + 3 < len ? B64_ALPHABET.indexOf(s[i + 3]) : 0;
    out[o++] = (c0 << 2) | (c1 >> 4);
    if (i + 2 < len) out[o++] = ((c1 & 15) << 4) | (c2 >> 2);
    if (i + 3 < len) out[o++] = ((c2 & 3) << 6) | c3;
  }
  return out.slice(0, o);
}

async function deflate(str: string): Promise<Uint8Array> {
  const buf = new TextEncoder().encode(str);
  const stream = new (globalThis as any).CompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  writer.write(buf);
  writer.close();
  const ab = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(ab);
}

async function inflate(bytes: Uint8Array): Promise<string> {
  const stream = new (globalThis as any).DecompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const ab = await new Response(stream.readable).arrayBuffer();
  return new TextDecoder().decode(ab);
}

export async function encodeDataURL(data: unknown): Promise<string> {
  const json = JSON.stringify(data);
  const compressed = await deflate(json);
  return toBase64(compressed);
}

export async function decodeDataURL(code: string): Promise<unknown> {
  const raw = fromBase64(code);
  const json = await inflate(raw);
  return JSON.parse(json);
}

export function buildShareUrl(code: string): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/share/${encodeURIComponent(code)}`;
}

export function readShareCodeFromHash(): string | null {
  const m = window.location.hash.match(/^#\/share\/([A-Za-z0-9+/=]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
