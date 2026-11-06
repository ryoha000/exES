const { test, afterEach, mock } = require('node:test')
const assert = require('node:assert/strict')
const Encoding = require('encoding-japanese')
const { fetchPage } = require('../src/background/fetch.ts')
const { backgroundFetch } = require('../src/content_scripts/use/utils.ts')

afterEach(() => {
  mock.restoreAll()
  delete global.chrome
})

for (const encoding of ['UTF8', 'SJIS', 'EUCJP']) {
  test(`${encoding} の日本語を通信後に復元する`, async () => {
    const body = '<html><title>日本語のゲーム価格</title><p>税込 1,980円</p></html>'
    const bytes = Uint8Array.from(Encoding.convert(body, { from: 'UNICODE', to: encoding, type: 'array' }))
    mock.method(global, 'fetch', async () => new Response(bytes))
    assert.deepEqual(await fetchPage({ url: 'https://www.getchu.com/soft.phtml' }), {
      type: 'success', body
    })
  })
}

test('既存のクエリを残し日本語・数値・空文字のパラメーターを送る', async () => {
  const fetchMock = mock.method(global, 'fetch', async () => new Response('ok'))
  await fetchPage({ url: 'https://a.sofmap.com/search?existing=1', params: { keyword: '日本語 & +', page: 2, gid: '' } })
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.deepEqual([...new URL(url).searchParams], [
    ['existing', '1'], ['keyword', '日本語 & +'], ['page', '2'], ['gid', '']
  ])
  assert.equal(options.credentials, 'include')
  assert.equal(options.signal.aborted, false)
})

test('空のレスポンスを空文字として返す', async () => {
  mock.method(global, 'fetch', async () => new Response(null, { status: 204 }))
  assert.deepEqual(await fetchPage({ url: 'https://www.dlsite.com/' }), { type: 'success', body: '' })
})

test('HTTP エラーと通信エラーを JSON で送れる文字列として返す', async () => {
  const fetchMock = mock.method(global, 'fetch', async () => new Response('missing', { status: 404 }))
  assert.deepEqual(await fetchPage({ url: 'https://www.dlsite.com/' }), { type: 'error', body: 'HTTP 404' })
  fetchMock.mock.mockImplementation(async () => { throw new Error('network unavailable') })
  const result = await fetchPage({ url: 'https://www.dlsite.com/' })
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { type: 'error', body: 'network unavailable' })
})

test('許可していない URL と不正なメッセージでは通信しない', async () => {
  const fetchMock = mock.method(global, 'fetch', async () => new Response('unexpected'))
  for (const request of [
    null, {}, { url: 123 }, { url: 'not a URL' },
    { url: 'file:///etc/passwd' }, { url: 'https://localhost/' },
    { url: 'https://www.getchu.com.attacker.example/' },
    { url: 'https://user:pass@www.getchu.com/' },
    { url: 'https://www.getchu.com/', params: { id: {} } }
  ]) {
    assert.equal((await fetchPage(request)).type, 'error')
  }
  assert.equal(fetchMock.mock.callCount(), 0)
})

test('15 秒で取得を中断してエラー応答を返す', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  mock.method(global, 'fetch', (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('request timed out')), { once: true })
  }))
  const pending = fetchPage({ url: 'https://www.getchu.com/' })
  t.mock.timers.tick(15000)
  assert.deepEqual(await pending, {
    type: 'error', body: 'request timed out'
  })
})

test('年齢確認が必要な販売店だけ確認済みセッションを使用する', async () => {
  const fetchMock = mock.method(global, 'fetch', async () => new Response('ok'))
  await fetchPage({ url: 'https://dlsoft.dmm.co.jp/detail/test/' })
  assert.equal(fetchMock.mock.calls[0].arguments[1].credentials, 'include')
  await fetchPage({ url: 'https://www.dlsite.com/' })
  assert.equal(fetchMock.mock.calls[1].arguments[1].credentials, 'omit')
  await fetchPage({ url: 'https://a.sofmap.com/product_list_parts.aspx' })
  assert.equal(fetchMock.mock.calls[2].arguments[1].credentials, 'include')
  await fetchPage({ url: 'https://www.suruga-ya.jp/search' })
  assert.equal(fetchMock.mock.calls[3].arguments[1].credentials, 'include')
})

test('駿河屋の検索404だけは検索設定の案内を解析するため本文を返す', async () => {
  mock.method(global, 'fetch', async () => new Response('safe search', { status: 404 }))
  assert.deepEqual(await fetchPage({ url: 'https://www.suruga-ya.jp/search' }), { type: 'success', body: 'safe search' })
  assert.deepEqual(await fetchPage({ url: 'https://www.suruga-ya.jp/product/detail/missing' }), { type: 'error', body: 'HTTP 404' })
})

test('Service Worker に届かない場合も呼び出し元を reject する', async () => {
  global.chrome = { runtime: {
    lastError: { message: 'Could not establish connection' },
    sendMessage: (_request, callback) => callback(undefined)
  } }
  await assert.rejects(backgroundFetch({ url: 'https://www.getchu.com/' }), /Could not establish connection/)
  delete chrome.runtime.lastError
  await assert.rejects(backgroundFetch({ url: 'https://www.getchu.com/' }), /No response/)
})

test('バックグラウンドから返る成功とエラーを呼び出し元に伝える', async () => {
  global.chrome = { runtime: { sendMessage: (_request, callback) => callback({ type: 'success', body: '日本語' }) } }
  assert.equal(await backgroundFetch({ url: 'https://www.getchu.com/' }), '日本語')
  chrome.runtime.sendMessage = (_request, callback) => callback({ type: 'error', body: 'HTTP 403' })
  await assert.rejects(backgroundFetch({ url: 'https://www.getchu.com/' }), /HTTP 403/)
})
