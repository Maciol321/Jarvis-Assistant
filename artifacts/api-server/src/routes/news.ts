import { Router } from "express";

const router = Router();

type NewsItem = {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  author: string;
};

function extractCdata(raw: string): string {
  return raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m ? extractCdata(m[1]).trim() : "";
}

function parseRss(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const re = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    const link =
      extractTag(block, "link") ||
      (block.match(/<link\s*\/?>([^<]*)/i)?.[1] ?? "").trim();
    items.push({
      title: extractTag(block, "title"),
      description: extractTag(block, "description"),
      link,
      pubDate: extractTag(block, "pubDate"),
      author:
        extractTag(block, "dc:creator") ||
        extractTag(block, "author") ||
        "",
    });
  }
  return items;
}

router.get("/feed", async (req, res) => {
  const url = (req.query.url as string) ?? "";
  if (!url) return res.status(400).json({ error: "Brak parametru url." });

  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; JarvisBot/2.0)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) {
      return res.status(502).json({ error: `Feed zwrócił status ${r.status}` });
    }
    const xml = await r.text();
    const items = parseRss(xml);
    res.json({ status: "ok", items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Błąd pobierania feeda";
    res.status(500).json({ error: msg });
  }
});

export default router;
