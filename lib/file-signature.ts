function startsWith(buffer: Uint8Array, sequence: number[]) {
  return sequence.every((byte, idx) => buffer[idx] === byte);
}

function isHeic(buffer: Uint8Array) {
  if (buffer.length < 12) return false;
  const ftyp = String.fromCharCode(...buffer.slice(4, 8));
  const brand = String.fromCharCode(...buffer.slice(8, 12));
  return ftyp === 'ftyp' && ['heic', 'heix', 'hevc', 'hevx', 'mif1'].includes(brand);
}

export const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/heic'];

export function isValidSignature(buffer: Uint8Array, mimeType: string) {
  if (mimeType === 'application/pdf') return startsWith(buffer, [0x25, 0x50, 0x44, 0x46]);
  if (mimeType === 'image/png') return startsWith(buffer, [0x89, 0x50, 0x4e, 0x47]);
  if (mimeType === 'image/jpeg') return startsWith(buffer, [0xff, 0xd8, 0xff]);
  if (mimeType === 'image/heic') return isHeic(buffer);
  return false;
}
