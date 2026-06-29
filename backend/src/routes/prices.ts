import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { MOA_DATA } from '../data/moaPrices'

const router = Router()

router.get('/moa', authenticate, (_req: Request, res: Response) => {
  res.json(MOA_DATA)
})

router.get('/moa/:crop', authenticate, (req: Request, res: Response) => {
  const crop = (req.params.crop as string).toLowerCase()
  const data = MOA_DATA.crops[crop]
  if (!data) {
    res.status(404).json({ error: `No MoA data for crop: ${crop}` })
    return
  }
  res.json({ crop, source: MOA_DATA.source, lastUpdated: MOA_DATA.lastUpdated, ...data })
})

export default router
