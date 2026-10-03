import test from 'node:test'
import assert from 'node:assert/strict'
import { renderReadme } from './lib/readme-html.mjs'

const hosts = new Set(['raw.githubusercontent.com', 'github.com'])
const render = (md) => renderReadme({ md, base: 'https://raw.githubusercontent.com/person/plugin/HEAD/', blobBase: 'https://github.com/person/plugin/blob/HEAD/' }, hosts)

test('README HTML images keep their screenshot, alt text and width', () => {
  const html = render('# Plugin\n\nBefore\n\n<img src="assets/stage1.png" alt="首轮 &amp; 展开" width="540">\n\nAfter')
  assert.match(html, /src="https:\/\/raw.githubusercontent.com\/person\/plugin\/HEAD\/assets\/stage1.png"/)
  assert.match(html, /alt="首轮 &amp; 展开"/)
  assert.match(html, /width="540"/)
  assert.match(html, /Before/)
  assert.match(html, /After/)
})

test('HTML image handlers and embedded scripts never become active page content', () => {
  const html = render('<img src="assets/a.png" alt="&quot; onerror=&quot;alert(1)" width="540px" onerror="alert(1)" style="color:red"><script>alert(1)</script><iframe src="https://example.com"></iframe>')
  assert.match(html, /<img src="https:\/\/raw.githubusercontent.com\/person\/plugin\/HEAD\/assets\/a.png"/)
  assert.ok(!html.includes('<script'))
  assert.ok(!html.includes('<iframe'))
  assert.ok(!html.includes(' onerror="'))
  assert.ok(!html.includes(' style='))
  assert.ok(!html.includes(' width='))
})

test('HTML and Markdown images share the same allowed-host check', () => {
  const html = render('<img src="https://example.com/tracker.png">\n\n![External](https://example.com/tracker.png)\n\n![Local](assets/a.png)\n\n<img src="javascript:alert(1)">')
  assert.ok(!html.includes('example.com'))
  assert.ok(!html.includes('javascript:'))
  assert.match(html, /src="https:\/\/raw.githubusercontent.com\/person\/plugin\/HEAD\/assets\/a.png"/)
})
