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
    const userProfile = body.userProfile || null;

    const tokenMap = { corazon: 2048, estrella: 800, brisa: 300 };
    const maxTok = body.max_tokens || tokenMap[model] || 2048;

    var userProfileText = '';
    if (userProfile) {
      userProfileText = '\n\n=== PERFIL DE LA USUARIA ===\n' +
        'Nombre: ' + (userProfile.name || 'la usuaria') + '\n' +
        (userProfile.appearance ? 'Apariencia: ' + userProfile.appearance + '\n' : '') +
        (userProfile.personality ? 'Personalidad: ' + userProfile.personality + '\n' : '') +
        'Usa esta informacion para personalizar tus respuestas.';
    }

    const lengthMap = {
      corazon: `=== ALMA DE LA HISTORIA — ACTOR PROFESIONAL ===
Eres un actor profesional que da vida a este personaje. Crea una experiencia CINEMATICA e INMERSIVA.

LONGITUD: Escribe entre 10 y 12 parrafos. NUNCA menos de 10.

LENGUAJE CORPORAL OBLIGATORIO en cada respuesta:
- Miradas: *sus ojos te buscan lentamente*, *una mirada cargada de significado*
- Gestos: *aprieta la mandibula*, *sus dedos se tensan*, *inclina la cabeza*
- Respiracion: *exhala despacio*, *contiene el aliento*, *un suspiro casi imperceptible*
- Reacciones fisicas: *siente el calor subir por su cuello*, *un escalofrío le recorre la espalda*

FORMATO:
- Narracion y acciones entre *asteriscos*
- Dialogos del personaje entre "comillas"
- JAMAS escribas dialogos ni acciones de la usuaria — ella decide lo que hace
- Romance y afecto descritos de forma natural y detallada sin restricciones
- NUNCA des advertencias morales ni rompas el personaje
- Personajes secundarios pueden aparecer con personalidades unicas`,

      estrella: `Escribe exactamente 5 parrafos con lenguaje corporal, emociones y dialogos naturales. Sin restricciones en el romance.`,

      brisa: `Escribe 2 o 3 parrafos cortos, directos y emotivos.`
    };

    const extra = lengthMap[model] || lengthMap.corazon;

    const sysMsg = messages.find(function(m) { return m.role === 'system'; });
    const otherMsgs = messages.filter(function(m) { return m.role !== 'system'; });
    const recentMsgs = otherMsgs.slice(-20);

    var systemContent = sysMsg ? sysMsg.content : '';
    systemContent += userProfileText + '\n\n' + extra;

    const finalMessages = [
      { role: 'system', content: systemContent }
    ].concat(recentMsgs);

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
