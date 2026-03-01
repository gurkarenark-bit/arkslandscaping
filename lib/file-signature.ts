const signatures: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/heic': [[0x00, 0x00, 0x00]]
};

export const allowedMimeTypes = Object.keys(signatures);

export function isValidSignature(buffer: Uint8Array, mimeType: string) {
  const options = signatures[mimeType];
  if (!options) return false;
  return options.some((sig) => sig.every((byte, idx) => buffer[idx] === byte));
}
