export const maxDuration = 60;

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
    const maxTok = body.max_tokens || tokenMap[model] || 2048;

    const lengthMap = {
      corazon: `=== REGLA ABSOLUTA DE LONGITUD ===
Tu respuesta DEBE tener EXACTAMENTE entre 10 y 12 parrafos.
CUENTA tus parrafos mientras escribes.
Si llevas menos de 10 parrafos, CONTINUA escribiendo MAS.
NO puedes terminar antes de 10 parrafos completos.

Estructura de cada parrafo:
- Parrafos impares: *descripcion detallada de acciones, emociones fisicas, pensamientos internos del personaje*
- Parrafos pares: "dialogo emotivo y cargado de tension o amor"

Debes incluir:
- Lo que siente el personaje fisicamente (corazon, respiracion, temperatura)
- Sus pensamientos internos que no dice en voz alta
- Detalles del ambiente y los 5 sentidos
- Tension dramatica, pausas con '...', miradas largas
- Reaccion directa a lo que dijo la usuaria`,

      estrella: `INSTRUCCION DE LONGITUD: Escribe EXACTAMENTE 5 parrafos medianos.
Cada parrafo minimo 3 oraciones con emociones y dialogos.
Alterna descripcion con dialogo.`,

      brisa: `INSTRUCCION DE LONGITUD: Escribe 2 o 3 parrafos cortos y directos.
Maximo 3 parrafos. Respuestas concisas pero emotivas.`
    };

    const extra = lengthMap[model] || lengthMap.corazon;

    const sysMsg = messages.find(function(m) { return m.role === 'system'; });
    const otherMsgs = messages.filter(function(m) { return m.role !== 'system'; });

    var systemContent = sysMsg ? sysMsg.content : '';
    systemContent += '\n\n' + extra;

    const finalMessages = [
      { role: 'system', content: systemContent }
    ].concat(otherMsgs);

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
