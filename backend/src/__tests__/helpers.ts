import jwt from 'jsonwebtoken'
import 'dotenv/config'

const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-agronexus'

export function makeToken(role: 'farmer' | 'consumer' | 'transporter', id = 'test-user-id') {
  return jwt.sign({ id, role, email: `${role}@test.com` }, JWT_SECRET, { expiresIn: '1h' })
}

export const FARMER_TOKEN      = makeToken('farmer',      'farmer-id-1')
export const CONSUMER_TOKEN    = makeToken('consumer',    'consumer-id-1')
export const TRANSPORTER_TOKEN = makeToken('transporter', 'transporter-id-1')
