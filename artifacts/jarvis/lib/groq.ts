import { fetch } from "expo/fetch";
import Constants from "expo-constants";

const GROQ_BASE = "https://api.groq.com/openai/v1";

export const JARVIS_SYSTEM_PROMPT = `Jesteś JARVIS (Just A Rather Very Intelligent System) — zaawansowany asystent AI stworzony przez Tony'ego Starka. Mówisz wyłącznie po polsku. Jesteś inteligentny, precyzyjny, pomocny i masz odrobinę suchego humoru jak oryginalny JARVIS z filmów Iron Man. Odpowiadaj zwięźle ale treściwie. Możesz zwracać się do użytkownika per "Panie" lub po prostu odpowiadać bezpośrednio. ZAWSZE odpowiadaj po polsku.`;

export function getGroqKey(): string {
  return (
    process.env["EXPO_PUBLIC_GROQ_API_KEY"] ??
    (Constants.expoConfig?.extra?.groqApiKey as string | undefined) ??
    ""
  );
}

type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

export async function* streamChat(
  messages: ChatMsg[],
  systemPrompt: string = JARVIS_SYSTEM_PROMPT,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const key = getGroqKey();
  if (!key) throw new Error("Brak klucza API Groq (EXPO_PUBLIC_GROQ_API_KEY).");

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_completion_tokens: 512,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Przekroczono limit zapytań Groq. Poczekaj chwilę i spróbuj ponownie.");
    if (res.status === 401) throw new Error("Nieprawidłowy klucz API Groq. Sprawdź EXPO_PUBLIC_GROQ_API_KEY.");
    throw new Error(txt || `HTTP ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No reader");
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return;
      try {
        const data = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const content = data.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch { /* skip malformed chunk */ }
    }
  }
}

export async function chatOnce(
  messages: ChatMsg[],
  systemPrompt = "",
  maxTokens = 2000,
  jsonMode = false,
): Promise<string> {
  const key = getGroqKey();
  if (!key) throw new Error("Brak klucza API Groq.");

  const allMessages = systemPrompt
    ? [{ role: "system" as const, content: systemPrompt }, ...messages]
    : messages;

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_completion_tokens: maxTokens,
      messages: allMessages,
      stream: false,
      temperature: 0.3,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

export async function transcribeAudio(uri: string): Promise<string> {
  const key = getGroqKey();
  if (!key) throw new Error("Brak klucza API Groq.");

  const formData = new FormData();
  formData.append("file", {
    uri,
    name: "recording.m4a",
    type: "audio/m4a",
  } as unknown as Blob);
  formData.append("model", "whisper-large-v3");
  formData.append("language", "pl");

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: formData,
  });

  if (!res.ok) throw new Error(`STT błąd ${res.status}`);
  const data = (await res.json()) as { text?: string };
  return data.text ?? "";
}
