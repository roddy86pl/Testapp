/**
 * Device utilities for Vega OS
 * Generates unique device codes for IPTV authentication
 */

/**
 * Generate device code from string input
 */
export function hashToDeviceCode(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) - hash) + input.charCodeAt(i);
        hash = hash & hash;
    }
    
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    let num = Math.abs(hash);
    
    for (let j = 0; j < 8; j++) {
        code += chars[num % chars.length];
        num = Math.floor(num / chars.length) + (j * 7);
    }
    
    return code;
}

/**
 * Generate random fallback device code
 */
export function generateFallbackCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}
