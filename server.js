import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT || 3000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use('/api/chat', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }));

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

app.post('/api/chat', async (req, res) => {
  if (!ai) return res.status(503).json({ error: 'El servidor todavía no tiene configurada la API Key de Gemini. Revisá el archivo .env.' });

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ error: 'Escribí una consulta antes de enviar.' });
  if (message.length > 2000) return res.status(400).json({ error: 'El mensaje es demasiado largo (máximo 2000 caracteres).' });

  const rawHistory = Array.isArray(req.body?.history) ? req.body.history.slice(-12) : [];
  const history = [];
  for (const item of rawHistory) {
    if (!item || !['user', 'model'].includes(item.role) || typeof item.text !== 'string') continue;
    const text = item.text.trim().slice(0, 2000);
    if (text) history.push({ role: item.role, parts: [{ text }] });
  }
  // La conversación debe terminar en el mensaje actual del usuario; evitamos duplicarlo en el historial.
  const contents = history;
  if (contents.length && contents[contents.length - 1].role === 'user') contents.pop();
  contents.push({ role: 'user', parts: [{ text: message }] });

  try {
    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: `Sos el asistente virtual de Escuela Interactiva, una web de presentación escolar y feria de ciencias. Respondé en español rioplatense, con amabilidad y claridad. Priorizá información que aparezca en la página: comunidad educativa, talleres de Informática y Mecánica, galería, cabina fotográfica y preguntas frecuentes. No inventes nombres, direcciones, teléfonos, fechas, requisitos oficiales ni especialidades confirmadas. Si te preguntan algo institucional que no figura en el contenido disponible, explicá que deben confirmarlo con la escuela. Podés ayudar con consultas educativas generales, pero diferenciá esas respuestas de la información oficial de la institución. No afirmes que sos una persona real ni que tenés acceso a sistemas escolares privados. Mantené las respuestas breves y útiles.`,
        maxOutputTokens: 700,
      },
    });
    const reply = result.text?.trim();
    if (!reply) return res.status(502).json({ error: 'Gemini no devolvió texto esta vez. Intentá nuevamente.' });
    return res.json({ reply });
  } catch (error) {
    console.error('Error en la API de Gemini:', error?.message || error);
    return res.status(502).json({ error: 'No pude conectarme con Gemini. Revisá la API Key, el modelo y el estado de la API e intentá de nuevo.' });
  }
});

app.use(express.static(publicDir));
app.get('*', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));
app.listen(port, () => console.log(`Escuela Interactiva disponible en http://localhost:${port}`));
