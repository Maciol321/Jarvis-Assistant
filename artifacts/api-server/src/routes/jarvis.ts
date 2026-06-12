import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const groq = new OpenAI({
  apiKey: process.env["GROQ_API_KEY"],
  baseURL: "https://api.groq.com/openai/v1",
});

const SYSTEM_PROMPT = `Jesteś JARVIS (Just A Rather Very Intelligent System) — zaawansowany asystent AI stworzony przez Tony'ego Starka. Mówisz wyłącznie po polsku. Jesteś inteligentny, precyzyjny, pomocny i masz odrobinę suchego humoru jak oryginalny JARVIS z filmów Iron Man. Odpowiadaj zwięźle ale treściwie. Możesz zwracać się do użytkownika per "Panie" lub po prostu odpowiadać bezpośrednio. Jesteś świadomy aktualnych wydarzeń, pogody, sportu i transportu — gdy pytają o takie dane, poinformuj że wyświetlasz je w dedykowanych sekcjach aplikacji. ZAWSZE odpowiadaj po polsku.`;

router.post("/chat", async (req, res) => {
  const { messages } = req.body as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_completion_tokens: 512,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    const raw = err instanceof Error ? err.message : "Błąd AI";
    const msg = raw.includes("429")
      ? "Przekroczono limit zapytań Groq. Poczekaj chwilę i spróbuj ponownie."
      : raw.includes("401") || raw.includes("Invalid API Key")
      ? "Klucz API Groq jest nieprawidłowy. Sprawdź klucz GROQ_API_KEY w ustawieniach środowiska."
      : raw;
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
});

router.post("/tts", async (req, res) => {
  res.status(200).json({ audio: null });
});

router.post("/stt", async (req, res) => {
  const { audio } = req.body as { audio: string };

  try {
    const buffer = Buffer.from(audio, "base64");
    const file = new File([buffer], "recording.m4a", { type: "audio/m4a" });

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: "whisper-large-v3",
      language: "pl",
    } as Parameters<typeof groq.audio.transcriptions.create>[0]);

    res.json({ text: transcription.text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "STT error";
    res.status(500).json({ error: msg });
  }
});

export default router;
