import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { supabaseAdmin, supabaseAuth } from '../services/supabase'
import type { UserRole } from '../types'

const signToken = (id: string, role: UserRole, email: string) =>
  jwt.sign({ id, role, email }, process.env.JWT_SECRET!, { expiresIn: '7d' })

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, full_name, role, region, phone, location_lat, location_lng } = req.body as {
    email: string
    password: string
    full_name: string
    role: UserRole
    region: string
    phone: string
    location_lat?: number
    location_lng?: number
  }

  if (!email || !password || !full_name || !role) {
    res.status(400).json({ error: 'email, password, full_name, and role are required' })
    return
  }

  if (!['farmer', 'consumer', 'direct_consumer', 'retailer', 'transporter'].includes(role)) {
    res.status(400).json({ error: 'role must be farmer, consumer, direct_consumer, retailer, or transporter' })
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
  const profileData: Record<string, unknown> = { id: authData.user.id, email, role, full_name, region, phone }
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
