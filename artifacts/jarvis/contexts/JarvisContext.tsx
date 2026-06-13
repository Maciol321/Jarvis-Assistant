import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { fetch } from "expo/fetch";
import { Platform } from "react-native";
import * as Speech from "expo-speech";

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
  stopSpeaking: () => void;
  setListening: (val: boolean) => void;
};

const JarvisContext = createContext<JarvisContextType | null>(null);

const baseUrl = `https://${process.env["EXPO_PUBLIC_DOMAIN"]}`;

function pickMaleVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  return (
    voices.find((v) => /marek/i.test(v.name)) ||
    voices.find((v) => /microsoft.*david/i.test(v.name)) ||
    voices.find((v) => /google.*uk.*male/i.test(v.name)) ||
    voices.find((v) => /male/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith("pl")) ||
    voices.find((v) => v.lang.startsWith("en")) ||
    voices[0]
  );
}

function speakWeb(text: string, onEnd: () => void): () => void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd();
    return () => {};
  }

  window.speechSynthesis.cancel();

  const doSpeak = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pl-PL";
    utterance.rate = 0.88;
    utterance.pitch = 0.45;
    utterance.volume = 1;

    const voice = pickMaleVoice();
    if (voice) utterance.voice = voice;

    utterance.onend = () => onEnd();
    utterance.onerror = () => onEnd();
    window.speechSynthesis.speak(utterance);
  };

  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => doSpeak();
  } else {
    doSpeak();
  }

  return () => window.speechSynthesis.cancel();
}

export function JarvisProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<JarvisStatus>("standby");
  const [currentResponse, setCurrentResponse] = useState("");
  const [ttsAudioBase64, setTtsAudioBase64] = useState<string | null>(null);
  const [ttsReady, setTtsReady] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const stopSpeakRef = useRef<(() => void) | null>(null);

  const setListening = useCallback((val: boolean) => {
    setStatus(val ? "listening" : "standby");
  }, []);

  const stopSpeaking = useCallback(() => {
    stopSpeakRef.current?.();
    stopSpeakRef.current = null;
    setStatus("standby");
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    stopSpeakRef.current?.();
    stopSpeakRef.current = null;

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
    let streamError = "";

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

      outer: while (true) {
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
            if (data.error) {
              streamError = data.error;
              break outer;
            }
            if (data.done) break outer;
          } catch {
            /* skip */
          }
        }
      }

      if (streamError) {
        const errMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: streamError,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
        setCurrentResponse("");
        setStatus("standby");
        return;
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

      if (Platform.OS === "web" && fullResponse) {
        const stop = speakWeb(fullResponse, () => {
          setStatus("standby");
          stopSpeakRef.current = null;
        });
        stopSpeakRef.current = stop;
      } else if (fullResponse) {
        Speech.speak(fullResponse, {
          language: "pl-PL",
          pitch: 0.7,
          rate: 0.88,
          onDone: () => setStatus("standby"),
          onError: () => setStatus("standby"),
          onStopped: () => setStatus("standby"),
        });
        stopSpeakRef.current = () => Speech.stop();
      } else {
        setStatus("standby");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setStatus("standby");
        const errMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Błąd połączenia z systemem JARVIS. Sprawdź połączenie internetowe.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
        setCurrentResponse("");
      }
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    stopSpeakRef.current?.();
    stopSpeakRef.current = null;
    setMessages([]);
    setCurrentResponse("");
    setStatus("standby");
  }, []);

  const clearTts = useCallback(() => {
    setTtsAudioBase64(null);
    setTtsReady(false);
    setStatus("standby");
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
        stopSpeaking,
        setListening,
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
