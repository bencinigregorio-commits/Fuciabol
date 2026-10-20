// Funzione serverless Vercel: genera l'articolo della Gazzetta FUCIABOL chiamando
// Anthropic lato server, cosi' la chiave API non finisce mai nel bundle pubblico del client.
// Richiede la variabile d'ambiente ANTHROPIC_API_KEY su Vercel (SENZA prefisso VITE_).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata sul server' })
    return
  }

  const { prompt } = req.body || {}
  if (!prompt || typeof prompt !== 'string' || prompt.length > 8000) {
    res.status(400).json({ error: 'Prompt mancante o non valido' })
    return
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await response.json()
    if (data.error) {
      res.status(502).json({ error: data.error.message || 'Errore Anthropic' })
      return
    }
    res.status(200).json({ text: data.content?.[0]?.text || '' })
  } catch (e) {
    res.status(500).json({ error: 'Errore di connessione al servizio AI' })
  }
}
