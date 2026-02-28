export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, max_tokens, model } = req.body;

    // Tokens según modelo seleccionado
    const tokens = { corazon: 1200, estrella: 600, brisa: 280 };
    const maxTok = max_tokens || tokens[model] || 1200;

    // Reforzar instrucciones de longitud en el sistema
    const lengthInstructions = {
      corazon: "OBLIGATORIO: Tu respuesta debe tener MINIMO 8 parrafos largos y detallados. Cada parrafo minimo 4 oraciones. Describe emociones, acciones, dialogos. NO puedes escribir menos de 8 parrafos.",
      estrella: "OBLIGATORIO: Tu respuesta debe tener EXACTAMENTE 4 o 5 parrafos medianos. Cada parrafo minimo 3 oraciones.",
      brisa: "OBLIGATORIO: Tu respuesta debe tener 2 o 3 parrafos cortos y directos."
    };

    // Agregar instrucción de longitud al mensaje del sistema
    const reinforcedMessages = messages.map((msg, index) => {aa
      if (msg.role === 'system') {
        return {
          ...msg,
          content: msg.content + '\n\n' + (lengthInstructions[model] || lengthInstructions.corazon)
        };
      }
      return msg;
    });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: reinforcedMessages,
        max_tokens: maxTok,
        temperature: 0.92,
        stream: false
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Groq error:', data.error);
      return res.status(500).json({ error: data.error });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error('Error servidor:', error);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}
