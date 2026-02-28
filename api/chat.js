   export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body;
    const messages = body.messages;
    const model = body.model || 'corazon';

    const tokenMap = { corazon: 2048, estrella: 800, brisa: 300 };
    const maxTok = tokenMap[model] || 2048;

    // Reemplazar el mensaje del sistema con instrucciones más fuertes
    const sysMsg = messages.find(m => m.role === 'system');
    const userMsgs = messages.filter(m => m.role !== 'system');

    let systemContent = sysMsg ? sysMsg.content : '';

    if (model === 'corazon') {
      systemContent += `

=== REGLA ABSOLUTA DE LONGITUD ===
Tu respuesta DEBE tener EXACTAMENTE entre 10 y 12 parrafos.
CUENTA tus parrafos mientras escribes.
Si llevas menos de 10 parrafos, CONTINUA escribiendo MAS.
NO puedes terminar antes de 10 parrafos completos.

Estructura de cada parrafo:
- Parrafos impares: *descripcion detallada de acciones, emociones fisicas, pensamientos internos del personaje*
- Parrafos pares: "dialogo emotivo y cargado de tension o amor"

Ejemplo de como debe verse tu respuesta:
*El personaje se detiene al escuchar tus palabras, su corazon latiendole con fuerza...*

"Lo que dices me hace pensar en todo lo que hemos vivido juntos..."

*Sus ojos te buscan en la habitacion, una mezcla de deseo y vulnerabilidad...*

"No puedo seguir fingiendo que no me importas..."

[continua hasta minimo 10 parrafos]`;
    } else if (model === 'estrella') {
      systemContent += '\n\nEscribe exactamente 5 parrafos con emociones y dialogos.';
    } else {
      systemContent += '\n\nEscribe 2 parrafos cortos y directos.';
    }

    const finalMessages = [
      { role: 'system', content: systemContent },
      ...userMsgs
    ];

    const groqModel = model === 'corazon' ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant';

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.GROQ_KEY
      },
      body: JSON.stringify({
        model: groqModel,
        messages: finalMessages,
        max_tokens: maxTok,
        temperature: 0.95,
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
