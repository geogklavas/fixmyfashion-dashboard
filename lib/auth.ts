import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'fmf_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

export interface BrandSession extends JWTPayload {
  brandHandle: string
  brandName: string
  brandEmail: string
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not set')
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(payload: Omit<BrandSession, keyof JWTPayload>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret())
}

export async function verifySessionToken(token: string): Promise<BrandSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as BrandSession
  } catch {
    return null
  }
}

export async function getSession(): Promise<BrandSession | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}
