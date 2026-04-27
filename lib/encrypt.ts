// Cifrado AES-256-GCM para credenciales sensibles (contraseña Datadis).
// Requiere ENCRYPTION_KEY=<64 hex chars> en las variables de entorno.
// Si la clave no está configurada, opera en modo plaintext para compatibilidad
// con instalaciones antiguas.

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

function getKey(): Buffer | null {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex) return null
  if (hex.length !== 64) throw new Error('ENCRYPTION_KEY debe ser exactamente 64 caracteres hex (32 bytes)')
  return Buffer.from(hex, 'hex')
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  if (!key) return plaintext  // sin clave → plaintext (modo legacy)

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`
}

export function decrypt(stored: string): string {
  const key = getKey()

  // Sin clave o formato incorrecto → plaintext (legacy)
  if (!key || !stored.includes(':')) return stored

  const parts = stored.split(':')
  if (parts.length !== 3) return stored

  const [ivHex, encHex, tagHex] = parts
  try {
    const iv = Buffer.from(ivHex, 'hex')
    const enc = Buffer.from(encHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    return decipher.update(enc).toString('utf8') + decipher.final('utf8')
  } catch {
    // Si falla el descifrado (p.ej. dato corrupto), devuelve tal cual
    return stored
  }
}
