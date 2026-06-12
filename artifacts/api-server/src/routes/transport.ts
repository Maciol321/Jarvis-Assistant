import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const groq = new OpenAI({
  apiKey: process.env["GROQ_API_KEY"],
  baseURL: "https://api.groq.com/openai/v1",
});

/* ── station autocomplete (static list of major Polish stations) ── */
const STATIONS = [
  { id: 1, name: "Warszawa Centralna", slug: "warszawa-centralna" },
  { id: 2, name: "Warszawa Wschodnia", slug: "warszawa-wschodnia" },
  { id: 3, name: "Warszawa Zachodnia", slug: "warszawa-zachodnia" },
  { id: 4, name: "Kraków Główny", slug: "krakow-glowny" },
  { id: 5, name: "Gdańsk Główny", slug: "gdansk-glowny" },
  { id: 6, name: "Wrocław Główny", slug: "wroclaw-glowny" },
  { id: 7, name: "Poznań Główny", slug: "poznan-glowny" },
  { id: 8, name: "Łódź Fabryczna", slug: "lodz-fabryczna" },
  { id: 9, name: "Katowice", slug: "katowice" },
  { id: 10, name: "Gdynia Główna", slug: "gdynia-glowna" },
  { id: 11, name: "Szczecin Główny", slug: "szczecin-glowny" },
  { id: 12, name: "Lublin", slug: "lublin" },
  { id: 13, name: "Rzeszów Główny", slug: "rzeszow-glowny" },
  { id: 14, name: "Białystok", slug: "bialystok" },
  { id: 15, name: "Bydgoszcz Główna", slug: "bydgoszcz-glowna" },
  { id: 16, name: "Toruń Główny", slug: "torun-glowny" },
  { id: 17, name: "Olsztyn Główny", slug: "olsztyn-glowny" },
  { id: 18, name: "Kielce", slug: "kielce" },
  { id: 19, name: "Opole Główne", slug: "opole-glowne" },
  { id: 20, name: "Zielona Góra Główna", slug: "zielona-gora-glowna" },
  { id: 21, name: "Radom", slug: "radom" },
  { id: 22, name: "Częstochowa", slug: "czestochowa" },
  { id: 23, name: "Sosnowiec Główny", slug: "sosnowiec-glowny" },
  { id: 24, name: "Gliwice", slug: "gliwice" },
  { id: 25, name: "Zakopane", slug: "zakopane" },
  { id: 26, name: "Nowy Sącz", slug: "nowy-sacz" },
  { id: 27, name: "Przemyśl Główny", slug: "przemysl-glowny" },
  { id: 28, name: "Zamość", slug: "zamosc" },
  { id: 29, name: "Gniezno", slug: "gniezno" },
  { id: 30, name: "Legnica", slug: "legnica" },
];

router.get("/stations", (req, res) => {
  const q = ((req.query.q as string) ?? "").toLowerCase().trim();
  if (!q || q.length < 2) return res.json([]);
  const matches = STATIONS.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.slug.includes(q.replace(/\s+/g, "-")),
  ).slice(0, 8);
  res.json(matches);
});

/* ── AI-powered connection search ── */
router.get("/connections", async (req, res) => {
  const { from, to, date } = req.query as Record<string, string>;
  if (!from || !to || !date) return res.status(400).json({ error: "Brak parametrów." });

  const fromName = STATIONS.find((s) => s.slug === from)?.name ?? from;
  const toName = STATIONS.find((s) => s.slug === to)?.name ?? to;

  const prompt = `Jesteś bazą danych rozkładów jazdy PKP. Podaj realistyczny rozkład pociągów na trasie "${fromName}" → "${toName}" w dniu ${date}.

Odpowiedz WYŁĄCZNIE w formacie JSON (bez żadnego dodatkowego tekstu, bez markdown, bez komentarzy).
Zwróć tablicę od 6 do 10 połączeń. Każde połączenie ma format:
{
  "departure_time": "HH:MM",
  "arrival_time": "HH:MM",
  "duration": "H:MM",
  "changes": 0,
  "price": 89,
  "sections": [{
    "train_full_name": "IC 1234 NAZWA",
    "brand": "IC",
    "departure": "HH:MM",
    "arrival": "HH:MM",
    "from": { "name": "${fromName}", "platform": "1" },
    "to": { "name": "${toName}", "platform": "2" }
  }]
}

Używaj REALISTYCZNYCH godzin PKP: EIP (Express InterCity Premium), EIC (Express InterCity), IC (InterCity), TLK (TLK), REG (regionalne).
Godziny muszą być spójne matematycznie. Ceny: IC ok 59-129 zł, EIC 79-159 zł, EIP 99-199 zł, TLK 29-79 zł.`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_completion_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(500).json({ error: "Błąd parsowania odpowiedzi AI." });
    }

    // Handle both {connections:[]} and direct array responses
    const list = Array.isArray(parsed)
      ? parsed
      : (parsed as Record<string, unknown>).connections ??
        (parsed as Record<string, unknown>).train_suggestions ??
        (parsed as Record<string, unknown>).results ??
        [];

    res.json(list);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd AI";
    res.status(500).json({ error: msg });
  }
});

export default router;
