import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
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
    const stream = await openai.chat.completions.create({
      model: "gpt-4.1",
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
      ? "Klucz API OpenAI nie ma dostępnych kredytów. Doładuj konto na platform.openai.com/billing i spróbuj ponownie."
      : raw.includes("401") || raw.includes("Incorrect API key")
      ? "Klucz API OpenAI jest nieprawidłowy. Sprawdź klucz w ustawieniach środowiska."
      : raw;
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
});

router.post("/tts", async (req, res) => {
  const { text, voice = "onyx" } = req.body as {
    text: string;
    voice?: string;
  };

  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
      input: text,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    const b64 = buffer.toString("base64");
    res.json({ audio: b64 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "TTS error";
    res.status(500).json({ error: msg });
  }
});

router.post("/stt", async (req, res) => {
  const { audio } = req.body as { audio: string };

  try {
    const buffer = Buffer.from(audio, "base64");
    const file = new File([buffer], "recording.m4a", { type: "audio/m4a" });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "pl",
    });

    res.json({ text: transcription.text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "STT error";
    res.status(500).json({ error: msg });
  }
});

export default router;
