const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const maxImageBytes = 2 * 1024 * 1024;

export function validateImageUpload(file: { type: string; size: number; name?: string }) {
  if (!allowedTypes.has(file.type)) {
    return 'Use a JPEG, PNG, or WebP image.';
  }
  if (file.size <= 0 || file.size > maxImageBytes) {
    return 'Images must be 2 MB or smaller.';
  }
  return null;
}

export function extensionForType(type: string) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

export function hasImageSignature(bytes: Uint8Array, type: string) {
  if (type === 'image/png') {
    return bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  if (type === 'image/jpeg') {
    return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (type === 'image/webp') {
    return (
      bytes.length > 12 &&
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
