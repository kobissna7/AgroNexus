import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { supabaseAdmin, supabaseAuth } from '../services/supabase'
import type { UserRole } from '../types'

const signToken = (id: string, role: UserRole, email: string) =>
  jwt.sign({ id, role, email }, process.env.JWT_SECRET!, { expiresIn: '7d' })

export async function register(req: Request, res: Response): Promise<void> {
  // region is intentionally not accepted from the client — the users_auto_region
  // DB trigger derives it from GPS coordinates (see migration_v2_roles_and_market.sql)
  const { email, password, full_name, role, phone, location_lat, location_lng } = req.body as {
    email: string
    password: string
    full_name: string
    role: UserRole
    phone: string
    location_lat?: number
    location_lng?: number
  }

  if (!email || !password || !full_name || !role) {
    res.status(400).json({ error: 'email, password, full_name, and role are required' })
    return
  }

  if (!['farmer', 'wholesaler', 'retailer', 'direct_consumer', 'transporter'].includes(role)) {
    res.status(400).json({ error: 'role must be farmer, wholesaler, retailer, direct_consumer, or transporter' })
    return
  }

  // Create Supabase Auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    res.status(400).json({ error: authError?.message ?? 'Failed to create auth user' })
    return
  }

  // Insert into users table using the Supabase Auth user's ID
  const profileData: Record<string, unknown> = { id: authData.user.id, email, role, full_name, phone }
  if (typeof location_lat === 'number') profileData.location_lat = location_lat
  if (typeof location_lng === 'number') profileData.location_lng = location_lng

  const { data: userData, error: dbError } = await supabaseAdmin
    .from('users')
    .insert(profileData)
    .select('id, email, role, full_name')
    .single()

  if (dbError || !userData) {
    // Roll back auth user if DB insert fails
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    res.status(500).json({ error: dbError?.message ?? 'Failed to create user profile' })
    return
  }

  const token = signToken(userData.id, userData.role as UserRole, userData.email)
  res.status(201).json({ token, user: userData })
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string }

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' })
    return
  }

  // Validate credentials via isolated auth client (prevents session bleed into admin client)
  const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData.user) {
    // Log the real Supabase error so we can see it in Render logs
    console.error('[login] Supabase signInWithPassword error:', authError?.message, authError?.status, authError?.name)
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  // Fetch user profile using admin client (service_role, bypasses RLS)
  const { data: userData, error: dbError } = await supabaseAdmin
    .from('users')
    .select('id, email, role, full_name')
    .eq('id', authData.user.id)
    .single()

  if (dbError || !userData) {
    res.status(500).json({ error: 'User profile not found' })
    return
  }

  const token = signToken(userData.id, userData.role as UserRole, userData.email)
  res.json({ token, user: userData })
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string }
  if (!email) {
    res.status(400).json({ error: 'email is required' })
    return
  }

  // Use Supabase Admin to trigger the built-in password reset email
  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL ?? 'https://agro-nexus-gules.vercel.app'}/reset-password`,
  })

  // Always return success to prevent email enumeration
  if (error) {
    console.error('forgotPassword error:', error.message)
  }

  res.json({ message: 'If that email exists, a reset link has been sent.' })
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { access_token, new_password } = req.body as { access_token: string; new_password: string }

  if (!access_token || !new_password) {
    res.status(400).json({ error: 'access_token and new_password are required' })
    return
  }
  if (new_password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' })
    return
  }

  // Get the user from the access token
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(access_token)
  if (userError || !user) {
    res.status(401).json({ error: 'Invalid or expired reset token' })
    return
  }

  // Update the password
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: new_password,
  })

  if (updateError) {
    res.status(500).json({ error: updateError.message })
    return
  }

  res.json({ message: 'Password updated successfully' })
}

// Safe diagnostics — shows whether env vars are set, never exposes values
export async function diagnostics(_req: Request, res: Response): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  const jwtSecret = process.env.JWT_SECRET

  // Test Supabase connectivity with a simple query
  let supabaseReachable = false
  let supabaseError = ''
  try {
    const { error } = await supabaseAdmin.from('users').select('id').limit(1)
    supabaseReachable = !error
    if (error) supabaseError = error.message
  } catch (e: unknown) {
    supabaseError = (e as Error).message
  }

  res.json({
    env: {
      SUPABASE_URL: supabaseUrl ? `set (${supabaseUrl.slice(0, 30)}...)` : 'MISSING',
      SUPABASE_SERVICE_KEY: serviceKey ? `set (${serviceKey.slice(0, 20)}...)` : 'MISSING',
      JWT_SECRET: jwtSecret ? 'set' : 'MISSING',
    },
    supabase: {
      reachable: supabaseReachable,
      error: supabaseError || null,
    },
  })
}
