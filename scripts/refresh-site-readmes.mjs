#!/usr/bin/env node
// Re-render README sections in a saved site build with the current renderer.
// This lets a rendering fix ship without repeating the external data probes.
import fs from 'node:fs'
import path from 'node:path'
import LOCALES from '../site/locales.mjs'
import { slugOf } from './lib/terms.mjs'
import { renderReadme } from './lib/readme-html.mjs'

const root = process.argv[2] || 'docs'
const payloadFile = path.join(root, 'readmes.json')
if (!fs.existsSync(payloadFile)) {
  console.log('Saved build has no README payload — keeping its pages')
  process.exit(0)
}
const payload = JSON.parse(fs.readFileSync(payloadFile, 'utf8'))
let refreshed = 0
for (const [url, entry] of Object.entries(payload.readmes)) {
  for (const locale of LOCALES) {
    const rm = [locale.code, ...LOCALES.map((l) => l.code)].map((code) => entry[code]).find(Boolean)
    if (!rm) continue
    const file = path.join(root, locale.urlPath.replace(/^\//, ''), 'p', slugOf(url), 'index.html')
    if (!fs.existsSync(file)) continue
    const rendered = renderReadme(rm)
    if (rendered === null) throw new Error(`Could not render README for ${url}`)
    const html = fs.readFileSync(file, 'utf8')
    const section = /(<div class="md"[^>]*>)[\s\S]*?(<\/div>\s*<p class="note"><a href=)/
    if (!section.test(html)) continue
    fs.writeFileSync(file, html.replace(section, (_, open, close) => `${open}\n${rendered}${close}`))
    refreshed++
  }
}
console.log(`README sections refreshed: ${refreshed}`)
