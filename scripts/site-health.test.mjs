import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

test('health checks count project Pages links without counting other sites or locales', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-health-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  fs.writeFileSync(path.join(dir, 'plugin.yml'), 'name: plugin')
  let html = '<a href="/awesome-dsh-plugin/p/person/plugin/">Plugin</a>'
  const server = http.createServer((req, res) => { res.end(html) })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => server.close())
  const run = () => promisify(execFile)(process.execPath, [
    new URL('./check-site-health.mjs', import.meta.url).pathname,
    '--live', `http://127.0.0.1:${server.address().port}/awesome-dsh-plugin/`,
    '--catalog-dir', dir, '--tolerance', '0',
  ])
  assert.match((await run()).stdout, /1 plugin pages/)
  html = '<a href="/other/p/person/plugin/">Other site</a><a href="/awesome-dsh-plugin/zh/p/person/plugin/">Chinese</a>'
  await assert.rejects(run(), (err) => err.code === 1 && err.stderr.includes('1 entries behind'))
})
