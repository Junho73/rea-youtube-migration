// Clean-room mock of the patterns REA observed in the YouTube capture (docs/ANALYSIS.md):
//  1) search(query) returns the first page + an opaque continuation token
//  2) next(token) returns the next page + a new token (null at the end)
//  3) every item carries a `type` so the client picks a component per type (server-driven UI)
// No YouTube data, schema names or code are used. All content is generated here.

const PAGE_SIZE = 8;
const MAX_PAGES = 4;
const WORDS = ["하이라이트", "명장면", "풀영상", "직관 브이로그", "분석", "레전드", "모음", "리뷰"];

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const encode = (o) => btoa(encodeURIComponent(JSON.stringify(o)));
const decode = (t) => JSON.parse(decodeURIComponent(atob(t)));

function makeItems(query, page) {
  const items = [];
  for (let i = 0; i < PAGE_SIZE; i++) {
    const n = page * PAGE_SIZE + i;
    items.push({
      type: "video",
      id: `v${n}`,
      title: `${query} ${WORDS[n % WORDS.length]} #${n + 1}`,
      channel: `채널 ${(n % 5) + 1}`,
      views: (n * 7919) % 900000 + 1000,
      length: `${(n % 15) + 1}:${String((n * 13) % 60).padStart(2, "0")}`,
      hue: (n * 47) % 360,
    });
  }
  // Mirrors the observed mix of regular results and a horizontal shorts shelf.
  if (page === 0) {
    items.splice(3, 0, {
      type: "shorts_shelf",
      id: "shelf0",
      title: "Shorts",
      shorts: Array.from({ length: 5 }, (_, k) => ({ id: `s${k}`, title: `${query} 쇼츠 ${k + 1}`, hue: (k * 70) % 360 })),
    });
  }
  return items;
}

function pageOf(query, page) {
  const continuation = page + 1 < MAX_PAGES ? encode({ query, page: page + 1 }) : null;
  return { items: makeItems(query, page), continuation };
}

export async function search(query) {
  await delay(300);
  return pageOf(query, 0);
}

export async function next(continuation) {
  await delay(300);
  const { query, page } = decode(continuation);
  return pageOf(query, page);
}

// Observed: one suggest request per keystroke. The client debounces instead.
export async function suggest(prefix) {
  await delay(80);
  if (!prefix.trim()) return [];
  return WORDS.map((w) => `${prefix.trim()} ${w}`).slice(0, 6);
}
