import { Router } from "express";

const router = Router();

const KOLEO_BASE = "https://api.koleo.pl/pl/v2";
const KOLEO_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (compatible; JarvisApp/2.0)",
};

router.get("/stations", async (req, res) => {
  const q = (req.query.q as string) ?? "";
  if (!q || q.length < 2) return res.json([]);
  try {
    const r = await fetch(
      `${KOLEO_BASE}/stations.json?q=${encodeURIComponent(q)}&count=10`,
      { headers: KOLEO_HEADERS },
    );
    const data = await r.json();
    res.json(data);
  } catch {
    res.json([]);
  }
});

router.get("/connections", async (req, res) => {
  const { from, to, date } = req.query as Record<string, string>;
  if (!from || !to || !date) return res.status(400).json({ error: "Brak parametrów." });
  try {
    const url =
      `${KOLEO_BASE}/train_suggestions.json` +
      `?departure_date=${encodeURIComponent(date)}` +
      `&from=${encodeURIComponent(from)}` +
      `&to=${encodeURIComponent(to)}` +
      `&direct=0&paginate=1`;
    const r = await fetch(url, { headers: KOLEO_HEADERS });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Błąd pobierania rozkładu." });
  }
});

export default router;
