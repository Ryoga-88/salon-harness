function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function signHmac(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return bytesToHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
}

export async function verifyHmac(body: string, signature: string | undefined, secret: string): Promise<boolean> {
  if (!signature) return false;
  const normalized = signature.replace(/^sha256=/, '');
  const expected = await signHmac(body, secret);
  if (normalized.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ normalized.charCodeAt(i);
  }
  return diff === 0;
}
