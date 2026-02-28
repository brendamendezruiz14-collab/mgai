export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    const messages = body.messages;
    const model = body.model || 'corazon';
    
    const tokenMap = { corazon: 1200, estrella: 600, brisa: 280 };
    const maxTok = tokenMap[model] || 1200;

    const lengthMap = {
      corazon: "OBLIGATORIO: Escribe MINIMO 8 parrafos largos y detallados. Cada parrafo minimo 4 oraciones. Describe emociones, acciones en *asteriscos*, dialogos entre comillas. NO puedes escribir menos de 8 parrafos.",
      estrella: "OBLIGATORIO: Escribe EXACTAMENTE 4 o 5 parrafos medianos con emociones y dialogos.",
      brisa: "OBLIGATORIO: Escribe 2 o 3 parrafos cortos y directos."
    };

    const extra = lengthMap[model] || lengthMap.corazon;

    const finalMessages = messages.map(function(msg) {
      if (msg.role === 'system') {
        return { role: 'system', content: msg.content + '\n\n' + extra };
      }
      return msg;
    });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.GROQ_KEY
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: finalMessages,
        max_tokens: maxTok,
        temperature: 0.92,
        stream: false
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Groq error:', JSON.stringify(data.error));
      return res.status(500).json({ error: data.error });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error('Error servidor:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

