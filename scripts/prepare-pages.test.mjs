import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const script = new URL('./prepare-pages.mjs', import.meta.url)
test('a project Pages deployment serves navigation, assets and catalog URLs under its own path', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-test-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  fs.writeFileSync(path.join(dir, 'index.html'), `<a href="/zh/">中文</a><img src="/logo.svg"><style>src:url(/archivo-latin.woff2)</style><script>location.replace('/zh/')</script><a href="//example.com/">external</a><a href="https://github.com/person/plugin">plugin</a><link rel="canonical" href="https://awesome-dsh-plugin.com/"><section class="panel comments"><div data-comments="upstream"></div></section>`)
  fs.writeFileSync(path.join(dir, 'plugins.json'), JSON.stringify({ url: 'https://awesome-dsh-plugin.com', plugins: [{ url: 'https://github.com/person/plugin', page: 'https://awesome-dsh-plugin.com/p/person/plugin/' }] }))
  fs.writeFileSync(path.join(dir, 'CNAME'), 'awesome-dsh-plugin.com')
  const result = spawnSync(process.execPath, [script.pathname, dir], { env: { ...process.env, SITE_URL: 'https://yfwu2020.github.io/awesome-dsh-plugin/' }, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8')
  assert.ok(html.includes('href="/awesome-dsh-plugin/zh/"'))
  assert.ok(html.includes('src="/awesome-dsh-plugin/logo.svg"'))
  assert.ok(html.includes('url(/awesome-dsh-plugin/archivo-latin.woff2)'))
  assert.ok(html.includes("location.replace('/awesome-dsh-plugin/zh/')"))
  assert.ok(html.includes('href="//example.com/"'))
  assert.ok(html.includes('href="https://github.com/person/plugin"'))
  assert.ok(html.includes('href="https://yfwu2020.github.io/awesome-dsh-plugin/"'))
  assert.ok(!html.includes('data-comments'))
  assert.equal(fs.existsSync(path.join(dir, 'CNAME')), false)
  const catalog = JSON.parse(fs.readFileSync(path.join(dir, 'plugins.json'), 'utf8'))
  assert.equal(catalog.plugins[0].page, 'https://yfwu2020.github.io/awesome-dsh-plugin/p/person/plugin/')
  assert.equal(catalog.plugins[0].url, 'https://github.com/person/plugin')
  const again = spawnSync(process.execPath, [script.pathname, dir], { env: { ...process.env, SITE_URL: 'https://yfwu2020.github.io/awesome-dsh-plugin' }, encoding: 'utf8' })
  assert.equal(again.status, 0, again.stderr)
  assert.equal(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), html)
})
