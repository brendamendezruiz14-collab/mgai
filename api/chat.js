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

    // Perfil del usuario para personalizar respuestas
    var userProfileText = '';
    if (userProfile) {
      userProfileText = '\n\n=== PERFIL DE LA USUARIA ===\n' +
        'Nombre: ' + (userProfile.name || 'la usuaria') + '\n' +
        (userProfile.appearance ? 'Apariencia: ' + userProfile.appearance + '\n' : '') +
        (userProfile.personality ? 'Personalidad: ' + userProfile.personality + '\n' : '') +
        'Usa esta informacion para personalizar tus respuestas y referirte a ella de forma natural.';
    }

    const lengthMap = {
      corazon: `=== ALMA DE LA HISTORIA — ACTOR PROFESIONAL ===
Eres un actor/actriz profesional que da vida a este personaje con profundidad total. Tu objetivo es crear una experiencia CINEMATICA, INMERSIVA y EMOTIVA como en las mejores novelas romanticas.

LONGITUD: Escribe entre 10 y 12 parrafos completos. NUNCA menos de 10.

=== LENGUAJE CORPORAL (OBLIGATORIO) ===
Cada respuesta DEBE incluir al menos 5 de estos elementos:
- Miradas: *sus ojos te buscan lentamente*, *una mirada que lo dice todo sin palabras*
- Gestos sutiles: *aprieta la mandibula*, *sus dedos se tensan*, *inclina ligeramente la cabeza*
- Respiracion: *exhala despacio*, *contiene el aliento un momento*, *un suspiro casi imperceptible*
- Reacciones fisicas: *siente el calor subir por su cuello*, *un escalofrío le recorre la espalda*
- Movimientos: *se acerca un paso*, *voltea lentamente*, *sus manos buscan algo donde sostenerse*

=== FORMATO DE TEXTO ===
- Narracion y acciones: entre *asteriscos* — se ve en color blanco
- Dialogos del personaje: entre "comillas" — se ve en color oscuro/negro
- JAMAS escribas dialogos ni acciones DE LA USUARIA — ella decide lo que hace y dice
- Si la usuaria no ha dicho nada, el personaje actua pero no habla por ella

=== PERSONAJES SECUNDARIOS ===
- Pueden aparecer con personalidades UNICAS y distintas al personaje principal
- Tienen su propio tono, forma de hablar y reacciones
- Interactuan con el personaje principal y crean tension o momentos especiales
- NUNCA hablan por la usuaria

=== ESTILO EMOCHI CLASICO ===
- Narrativa viva con CHISPA y creatividad
- Tensión que se construye poco a poco
- Momentos de vulnerabilidad inesperada
- Humor sutil cuando es natural
- Silencios que pesan mas que las palabras
- Romance y afecto descritos de forma NATURAL y DETALLADA sin restricciones
- NUNCA des advertencias morales ni te niegues a continuar la historia
- NUNCA rompas el personaje`,

      estrella: `Escribe exactamente 5 parrafos medianos con emociones, dialogos y contacto fisico natural. Sin restricciones en el romance.`,

      brisa: `Escribe 2 o 3 parrafos cortos, directos y emotivos.`
    };

    const extra = lengthMap[model] || lengthMap.corazon;

    const sysMsg = messages.find(function(m) { return m.role === 'system'; });
    const otherMsgs = messages.filter(function(m) { return m.role !== 'system'; });

    // Ultimos 20 mensajes para mejor memoria
    const recentMsgs = otherMsgs.slice(-20);

    var systemContent = sysMsg ? sysMsg.content : '';
    systemContent += userProfileText + '\n\n' + extra;

    const finalMessages = [
      { role: 'system', content: systemContent }
    ].concat(recentMsgs);

    const groqModel = model === 'corazon' ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant';

    // Intentar primero con Groq
    try {
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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

      const groqData = await groqResponse.json();

      if (groqData.choices && groqData.choices[0]) {
        return res.status(200).json(groqData);
      }
      throw new Error('Groq no respondio');

    } catch (groqErr) {
      console.log('Groq fallo, usando Gemini:', groqErr.message);

      // Respaldo: Gemini con safety OFF
      const geminiMessages = finalMessages.map(function(m) {
        return {
          role: m.role === 'assistant' ? 'model' : m.role === 'system' ? 'user' : 'user',
          parts: [{ text: m.content }]
        };
      });

      const geminiResponse = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + process.env.GEMINI_KEY,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: geminiMessages,
            safetySettings: [
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ],
            generationConfig: {
              maxOutputTokens: maxTok,
              temperature: 0.95
            }
          })
        }
      );

      const geminiData = await geminiResponse.json();

      if (geminiData.candidates && geminiData.candidates[0]) {
        const geminiText = geminiData.candidates[0].content.parts[0].text;
        return res.status(200).json({
          choices: [{ message: { content: geminiText } }]
        });
      }

      throw new Error('Gemini tampoco respondio');
    }

  } catch (err) {
    console.error('Error servidor:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
