export type RssItem = {
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

export async function fetchRss(url: string): Promise<RssItem[]> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) JarvisApp/1.0",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
  });
  if (!res.ok) throw new Error(`RSS HTTP ${res.status}`);
  const xml = await res.text();

  const items: RssItem[] = [];
  const re = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1]!;
    const link =
      extractTag(block, "link") ||
      (block.match(/<link\s*\/?>\s*([^<\s][^<]*)/i)?.[1] ?? "").trim();
    items.push({
      title: extractTag(block, "title"),
      description: extractTag(block, "description"),
      link,
      pubDate: extractTag(block, "pubDate"),
      author:
        extractTag(block, "dc:creator") || extractTag(block, "author"),
    });
  }
  return items.filter((i) => i.title);
}
