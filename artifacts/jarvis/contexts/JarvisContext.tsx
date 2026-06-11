import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { fetch } from "expo/fetch";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

export type JarvisStatus =
  | "standby"
  | "listening"
  | "processing"
  | "speaking";

type JarvisContextType = {
  messages: Message[];
  status: JarvisStatus;
  currentResponse: string;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
  ttsAudioBase64: string | null;
  ttsReady: boolean;
  clearTts: () => void;
};

const JarvisContext = createContext<JarvisContextType | null>(null);

const baseUrl = `https://${process.env["EXPO_PUBLIC_DOMAIN"]}`;

export function JarvisProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<JarvisStatus>("standby");
  const [currentResponse, setCurrentResponse] = useState("");
  const [ttsAudioBase64, setTtsAudioBase64] = useState<string | null>(null);
  const [ttsReady, setTtsReady] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setStatus("processing");
    setCurrentResponse("");
    setTtsReady(false);
    setTtsAudioBase64(null);

    const history = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    let fullResponse = "";

    try {
      const res = await fetch(`${baseUrl}/api/jarvis/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: abortRef.current.signal,
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6)) as {
              content?: string;
              done?: boolean;
              error?: string;
            };
            if (data.content) {
              fullResponse += data.content;
              setCurrentResponse(fullResponse);
            }
            if (data.done || data.error) break;
          } catch {
            /* skip */
          }
        }
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: fullResponse,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setCurrentResponse("");
      setStatus("speaking");

      try {
        const ttsRes = await fetch(`${baseUrl}/api/jarvis/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: fullResponse, voice: "onyx" }),
        });
        const ttsData = (await ttsRes.json()) as { audio?: string };
        if (ttsData.audio) {
          setTtsAudioBase64(ttsData.audio);
          setTtsReady(true);
        }
      } catch {
        /* TTS optional */
      }

      setStatus("standby");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setStatus("standby");
        setCurrentResponse("Błąd połączenia z systemem JARVIS.");
      }
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentResponse("");
    setStatus("standby");
  }, []);

  const clearTts = useCallback(() => {
    setTtsAudioBase64(null);
    setTtsReady(false);
  }, []);

  return (
    <JarvisContext.Provider
      value={{
        messages,
        status,
        currentResponse,
        sendMessage,
        clearMessages,
        ttsAudioBase64,
        ttsReady,
        clearTts,
      }}
    >
      {children}
    </JarvisContext.Provider>
  );
}

export function useJarvis() {
  const ctx = useContext(JarvisContext);
  if (!ctx) throw new Error("useJarvis must be used inside JarvisProvider");
  return ctx;
}
