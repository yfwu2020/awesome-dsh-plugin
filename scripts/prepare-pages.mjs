#!/usr/bin/env node
// Adapt generated output to a GitHub Pages project URL, including older artifacts.
import fs from 'node:fs'
import path from 'node:path'

const target = new URL(process.env.SITE_URL || 'https://awesome-dsh-plugin.com')
const basePath = target.pathname.replace(/\/$/, '')
const siteUrl = target.origin + basePath
const root = process.argv[2] || 'docs'
const upstream = 'https://awesome-dsh-plugin.com'
const isFork = siteUrl !== upstream

function localPath(value) {
  if (!value.startsWith('/') || value.startsWith('//')) return value
  if (basePath && (value === basePath || value.startsWith(basePath + '/'))) return value
  return basePath + value
}

function prepare(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name)
    if (item.isDirectory()) { prepare(file); continue }
    if (!/\.(html|xml|json|txt|css|js)$/.test(item.name)) continue
    let text = fs.readFileSync(file, 'utf8').replaceAll(upstream, siteUrl)
    if (item.name.endsWith('.html')) {
      text = text.replace(/\b(href|src|action)=(['"])(\/[^'"\s]*)\2/g,
        (_, attr, quote, url) => `${attr}=${quote}${localPath(url)}${quote}`)
      text = text.replace(/location\.replace\((['"])(\/[^'"]*)\1/g,
        (_, quote, url) => `location.replace(${quote}${localPath(url)}${quote}`)
      if (isFork) text = text.replace(/<section class="panel comments"[\s\S]*?<\/section>/g, '')
    }
    if (/\.(html|css)$/.test(item.name)) {
      text = text.replace(/url\((['"]?)(\/[^\s)'";]*)\1\)/g,
        (_, quote, url) => `url(${quote}${localPath(url)}${quote})`)
    }
    fs.writeFileSync(file, text)
  }
}

prepare(root)
if (target.hostname.endsWith('.github.io')) fs.rmSync(path.join(root, 'CNAME'), { force: true })
console.log(`Pages output prepared for ${siteUrl}/`)
