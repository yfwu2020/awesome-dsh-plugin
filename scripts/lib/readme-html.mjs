import { Marked } from 'marked'
import { parseFragment } from 'parse5'

export const README_IMAGE_HOSTS = new Set([
  'raw.githubusercontent.com',
  'user-images.githubusercontent.com',
  'camo.githubusercontent.com',
  'github.com',
])

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function renderReadme(rm, imageHosts = README_IMAGE_HOSTS) {
  const abs = (href, base, allowData = false) => {
    if (!href || /^(https?:|mailto:|#)/i.test(href)) return href
    if (/^data:/i.test(href)) return allowData ? href : '#'
    return base + href.replace(/^\.\//, '').replace(/^\//, '')
  }
  // A README is third-party markdown, and an <img> in it is a request the
  // visitor's browser makes to whatever host the author named — which is
  // exactly the tracking-pixel vector SCREENSHOT_HOSTS already exists to shut
  // (see data/screenshots.json validation above). The same rule has to apply
  // here or the guarantee is only as strong as its weakest path.
  //
  // The allowlist is GitHub's own hosting, which costs the visitor nothing new:
  // this site is served from GitHub Pages, so GitHub already sees the request
  // for the page itself. Everything else — badge services, CDNs, personal
  // domains — is dropped outright, along with the link and paragraph it leaves
  // behind. Keeping the alt text instead was worse: nearly all of these are
  // status badges, and a row of them collapses into "DSH Node.js JavaScript
  // Cordis Zero deps" — prose the author never wrote, in the position a reader
  // starts reading. The whole README is one click away in either case.
  const imgAllowed = (href) => {
    if (/^data:/i.test(href)) return true // inline bytes, no request leaves
    try {
      const url = new URL(href)
      return ['http:', 'https:'].includes(url.protocol) && imageHosts.has(url.hostname)
    } catch { return false }
  }
  const imageUrl = (href) => {
    if (typeof href !== 'string' || !href.trim()) return ''
    try { return new URL(href, rm.base).href } catch { return '' }
  }
  const image = ({ href, title, text, width, height }) => {
    href = imageUrl(href)
    if (!href || !imgAllowed(href)) return ''
    const t = title ? ` title="${esc(title)}"` : ''
    const size = [['width', width], ['height', height]]
      .filter(([, value]) => /^[1-9]\d{0,3}$/.test(value ?? ''))
      .map(([name, value]) => ` ${name}="${value}"`).join('')
    return `<img src="${esc(href)}" alt="${esc(text ?? '')}"${t}${size} loading="lazy" decoding="async" referrerpolicy="no-referrer">`
  }
  // Parse authored HTML, but reconstruct only images with explicitly allowed
  // attributes. Event handlers, styles, scripts and other HTML stay excluded.
  const htmlImages = (html) => {
    const images = []
    const visit = (node) => {
      if (node.tagName === 'img') {
        const attrs = Object.fromEntries(node.attrs.map((a) => [a.name, a.value]))
        images.push(image({ href: attrs.src, text: attrs.alt, title: attrs.title, width: attrs.width, height: attrs.height }))
      } else if (!['script', 'style', 'iframe', 'template'].includes(node.tagName)) {
        for (const child of node.childNodes ?? []) visit(child)
      }
    }
    visit(parseFragment(html))
    return images.join('\n')
  }
  const md = new Marked({
    walkTokens(t) {
      if (t.type === 'heading') t.depth = Math.min(t.depth + 1, 6)
      else if (t.type === 'image') t.href = imageUrl(t.href)
      else if (t.type === 'link') t.href = abs(t.href, rm.blobBase)
    },
    renderer: {
      html: ({ text }) => htmlImages(text),
      image,
    },
  })
  try {
    // drop a leading H1 — the page already has one
    const src = rm.md.replace(/^\s*# .*\n/, '')
    // A dropped image leaves debris: first the link that wrapped it, then the
    // paragraph that held only that link. Raw HTML is already stripped, so
    // every anchor and paragraph here came from markdown and had content until
    // we removed the image. Loop because emptying a link empties its paragraph.
    let html = md.parse(src)
    for (let prev = null; prev !== html;) {
      prev = html
      html = html
        .replace(/<a\b[^>]*>\s*<\/a>/g, '')
        .replace(/<p>\s*<\/p>\s*/g, '')
    }
    return html
  } catch {
    return null
  }
}
