/**
 * Device utilities for Vega OS
 * Generates unique device codes for IPTV authentication
 */

// Constants for device code generation
const DEVICE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEVICE_CODE_LENGTH = 8;
const HASH_MULTIPLIER = 7;

/**
 * Generate device code from string input
 */
export function hashToDeviceCode(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    // eslint-disable-next-line no-bitwise
    hash = (hash << 5) - hash + input.charCodeAt(i);
    // eslint-disable-next-line no-bitwise
    hash = hash & hash;
  }

  let code = '';
  let num = Math.abs(hash);

  for (let j = 0; j < DEVICE_CODE_LENGTH; j++) {
    code += DEVICE_CODE_CHARS[num % DEVICE_CODE_CHARS.length];
    num = Math.floor(num / DEVICE_CODE_CHARS.length) + j * HASH_MULTIPLIER;
  }

  return code;
}

/**
 * Generate random fallback device code
 */
export function generateFallbackCode(): string {
  let code = '';
  for (let i = 0; i < DEVICE_CODE_LENGTH; i++) {
    code +=
      DEVICE_CODE_CHARS[Math.floor(Math.random() * DEVICE_CODE_CHARS.length)];
  }
  return code;
}
