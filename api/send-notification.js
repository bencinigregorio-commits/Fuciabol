// Funzione serverless Vercel: invia una notifica push a tutti i giocatori
// iscritti. Richiede VAPID_PRIVATE_KEY e SUPABASE_SERVICE_ROLE_KEY come
// variabili d'ambiente server-only (mai esposte al client).
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const VAPID_PUBLIC_KEY = 'BDeyzFUjwfCjslUrAj8G9ZGkcn1e3JHT3cokaQY1CDZDLcgxfNfJCgVpJPSQbWgFq4J5p3Tb1yDLTyuqVzO3gzc'
const SUPABASE_URL = 'https://jiabtjhvvouehxpikaph.supabase.co'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!vapidPrivateKey || !serviceKey) {
    res.status(500).json({ error: 'Configurazione server incompleta (VAPID_PRIVATE_KEY o SUPABASE_SERVICE_ROLE_KEY mancante su Vercel)' })
    return
  }

  const { title, body, url } = req.body || {}
  if (!title || !body || typeof title !== 'string' || typeof body !== 'string') {
    res.status(400).json({ error: 'title e body richiesti' })
    return
  }

  webpush.setVapidDetails('mailto:bencinigregorio@gmail.com', VAPID_PUBLIC_KEY, vapidPrivateKey)
  const supabase = createClient(SUPABASE_URL, serviceKey)

  const { data: subs, error } = await supabase.from('push_subscriptions').select('*')
  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  if (!subs || subs.length === 0) {
    res.status(200).json({ sent: 0, failed: 0 })
    return
  }

  const payload = JSON.stringify({ title, body, url: url || '/' })
  let sent = 0
  let failed = 0
  const daRimuovere = []

  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
      sent++
    } catch (e) {
      failed++
      if (e.statusCode === 404 || e.statusCode === 410) daRimuovere.push(s.id)
    }
  }))

  if (daRimuovere.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', daRimuovere)
  }

  res.status(200).json({ sent, failed })
}
