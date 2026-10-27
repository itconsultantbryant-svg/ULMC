import sanitizeHtml from "sanitize-html";

const MEDIA_PATH = /^\/(?:api\/)?media\/[a-z0-9-]+(?:\/[a-z0-9-]+)?$/i;

export const SAFE_EMBED_HOSTS = ["www.youtube.com", "youtube.com", "player.vimeo.com", "vimeo.com"];

const options: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "h2", "h3", "h4", "strong", "em", "b", "i", "u", "s",
    "ul", "ol", "li", "blockquote", "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
    "code", "pre", "sup", "sub", "audio", "video", "source", "iframe",
    "div", "span",
  ],
  allowedAttributes: {
    a: ["href", "title", "rel", "target"],
    img: ["src", "alt", "title", "width", "height", "loading", "class"],
    iframe: ["src", "title", "width", "height", "allow", "allowfullscreen", "loading", "frameborder"],
    audio: ["controls", "src", "preload"],
    video: ["controls", "src", "poster", "width", "height", "preload", "playsinline"],
    source: ["src", "type"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan", "scope"],
    "*": ["class", "data-asset-id", "data-media-id"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https"], audio: ["https"], video: ["https"], source: ["https"] },
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      const external = /^https?:\/\//i.test(href);
      return {
        tagName,
        attribs: {
          ...attribs,
          ...(external ? { rel: "noopener noreferrer nofollow", target: "_blank" } : {}),
        },
      };
    },
    iframe: (tagName, attribs): sanitizeHtml.Tag => {
      let src = attribs.src ?? "";
      try {
        const url = new URL(src);
        if (!SAFE_EMBED_HOSTS.includes(url.hostname)) src = "";
        if (url.hostname.includes("youtube") && !url.pathname.startsWith("/embed/")) {
          const id = url.searchParams.get("v");
          src = id ? `https://www.youtube.com/embed/${id}` : "";
        }
        if (url.hostname.includes("vimeo") && !url.pathname.startsWith("/video/")) {
          const id = url.pathname.split("/").filter(Boolean).pop();
          src = id ? `https://player.vimeo.com/video/${id}` : "";
        }
        src = url.protocol === "https:" ? src : "";
      } catch {
        src = "";
      }
      if (!src) return { tagName: "span", attribs: {} as sanitizeHtml.Attributes };
      return {
        tagName,
        attribs: {
          src,
          title: attribs.title ?? "Embedded media",
          loading: "lazy",
          allow: "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          allowfullscreen: "true",
        },
      };
    },
    img: (tagName, attribs): sanitizeHtml.Tag => {
      const src = attribs.src ?? "";
      if (!MEDIA_PATH.test(src) && !/^https:\/\//i.test(src)) {
        return { tagName: "span", attribs: {} as sanitizeHtml.Attributes };
      }
      return {
        tagName,
        attribs: { ...attribs, loading: attribs.loading ?? "lazy" },
      };
    },
    audio: (tagName, attribs): sanitizeHtml.Tag => {
      const src = attribs.src ?? "";
      return MEDIA_PATH.test(src) || /^https:\/\//i.test(src)
        ? { tagName, attribs: { ...attribs, preload: attribs.preload ?? "metadata" } }
        : { tagName: "span", attribs: {} as sanitizeHtml.Attributes };
    },
    video: (tagName, attribs): sanitizeHtml.Tag => {
      const src = attribs.src ?? "";
      return MEDIA_PATH.test(src) || /^https:\/\//i.test(src)
        ? { tagName, attribs: { ...attribs, preload: attribs.preload ?? "metadata" } }
        : { tagName: "span", attribs: {} as sanitizeHtml.Attributes };
    },
  },
  exclusiveFilter: (frame) =>
    ["iframe", "img", "audio", "video"].includes(frame.tag) && !frame.attribs.src,
  disallowedTagsMode: "discard",
};

export function sanitizeArticleHtml(input: string): string {
  return sanitizeHtml(input, options);
}

export function sanitizePlainText(input: string): string {
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} }).trim();
}

export function stripHtml(input: string): string {
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(html: string): number {
  const text = stripHtml(html);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 200));
}

export function extractMediaIds(html: string, heroId?: string | null): string[] {
  const ids = new Set<string>();
  if (heroId) ids.add(heroId);
  const regex = /(?:\/api\/media\/|\/media\/)([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;
  for (const match of html.matchAll(regex)) ids.add(match[1]!.toLowerCase());
  return [...ids];
}
