import { Request, Response } from 'express'
import { supabaseAdmin } from '../services/supabase'

export async function getNotifications(req: Request, res: Response): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json(data ?? [])
}

export async function markRead(req: Request, res: Response): Promise<void> {
  const { ids } = req.body as { ids: string[] }
  if (!ids?.length) { res.status(400).json({ error: 'ids required' }); return }

  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ read: true })
    .in('id', ids)
    .eq('user_id', req.user!.id)

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json({ ok: true })
}
