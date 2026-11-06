const { test, afterEach, mock } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { JSDOM } = require('jsdom')
global.DOMParser = new JSDOM('').window.DOMParser
const { fetchPage } = require('../src/background/fetch.ts')
const scrapeFanza = require('../src/content_scripts/use/scrape/fanza.ts').default
const scrapeSofmap = require('../src/content_scripts/use/scrape/sofmap.ts').default
const scrapeSurugaya = require('../src/content_scripts/use/scrape/surugaya.ts').default
const fixture = name => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8')
const fanzaURL = 'https://dlsoft.dmm.co.jp/detail/vsat_0256/'

afterEach(() => { mock.restoreAll(); delete global.chrome })

const replies = (steps) => {
  global.chrome = { runtime: { sendMessage: (request, callback) => { fetchPage(request).then(callback) } } }
  return mock.method(global, 'fetch', async (href, options) => {
    const step = steps.shift()
    assert.ok(step, `Unexpected request: ${href}`)
    const url = new URL(href)
    assert.equal(url.pathname, step.path)
    assert.equal(options.method || 'GET', step.method || 'GET')
    assert.equal(options.credentials, 'include')
    step.inspect?.(url, options)
    return new Response(step.body, { status: step.status || 200 })
  })
}

test('確認済みのサイトには追加の確認リクエストを送らない', async () => {
  const steps = [
    { path: '/detail/vsat_0256/', body: fixture('fanza-normal.html') },
    { path: '/product_list_parts.aspx', body: fixture('sofmap-summer.html') },
    { path: '/search', body: fixture('surugaya-sale.html') }
  ]
  const fetchMock = replies(steps)
  assert.equal((await scrapeFanza(fanzaURL)).price, 7480)
  assert.equal((await scrapeSofmap('4933032011682'))[0].price, 7300)
  assert.equal((await scrapeSurugaya('4933032011682'))[0].price, 8000)
  assert.equal(fetchMock.mock.callCount(), 3)
  assert.equal(steps.length, 0)
})

test('FANZAは年齢確認を自動送信してそのまま商品価格を読む', async () => {
  const steps = [
    { path: '/detail/vsat_0256/', body: fixture('age-fanza.html') },
    { path: '/age_check/=/declared=yes/', body: fixture('fanza-normal.html'), inspect: url => {
      assert.equal(url.origin, 'https://www.dmm.co.jp')
      assert.equal(url.searchParams.get('rurl'), fanzaURL)
    } }
  ]
  replies(steps)
  assert.equal((await scrapeFanza(fanzaURL)).price, 7480)
  assert.equal(steps.length, 0)
})

const sofmapSteps = finalBody => [
  { path: '/product_list_parts.aspx', body: fixture('sofmap-filtered.html') },
  { path: '/search_result.aspx', body: '<title>検索</title>' },
  { path: '/adult_confirm.aspx', body: fixture('age-sofmap.html') },
  { path: '/xt_adult_confirm.aspx', body: '<title>検索</title>', inspect: url => {
    assert.equal(url.searchParams.get('url'), '/search_result.aspx?styp=p_bar&keyword=4560100333874')
  } },
  { path: '/product_list_parts.aspx', body: finalBody }
]

test('ソフマップはセッション作成と年齢確認後に商品一覧を再取得する', async () => {
  const steps = sofmapSteps(fixture('sofmap-used.html'))
  replies(steps)
  assert.equal((await scrapeSofmap('4560100333874'))[0].price, 5480)
  assert.equal(steps.length, 0)
})

test('別タブがソフマップの年齢確認を済ませた場合は商品一覧を再取得する', async () => {
  const steps = sofmapSteps(fixture('sofmap-used.html'))
  steps[2].body = '<title>検索結果</title>'
  steps.splice(3, 1)
  replies(steps)
  assert.equal((await scrapeSofmap('4560100333874'))[0].price, 5480)
  assert.equal(steps.length, 0)
})

test('ソフマップの準備ページが一時的に404でも確認画面から価格取得を続ける', async () => {
  const steps = sofmapSteps(fixture('sofmap-used.html'))
  steps[1].status = 404
  steps[1].body = '<title>サイトにつながりにくい状態です</title>'
  replies(steps)
  assert.equal((await scrapeSofmap('4560100333874'))[0].price, 5480)
  assert.equal(steps.length, 0)
})

const surugayaSteps = finalBody => [
  { path: '/search', body: fixture('surugaya-filtered.html'), status: 404 },
  { path: '/safe_search/config', body: fixture('age-surugaya-settings.html') },
  { path: '/safe_search/config', method: 'POST', body: fixture('age-surugaya-confirm.html'), inspect: (_url, options) => {
    const form = new URLSearchParams(options.body)
    assert.equal(form.get('form_build_id'), 'form-settings-fixture')
    assert.equal(form.get('sexualExpression'), '3')
    assert.equal(form.get('expired_date'), '2')
  } },
  { path: '/safe_search/config/confirm', method: 'POST', body: finalBody, inspect: (_url, options) => {
    const form = new URLSearchParams(options.body)
    assert.equal(form.get('form_build_id'), 'form-confirm-fixture')
    assert.equal(form.get('op'), 'はい')
    assert.equal(form.get('expired_date'), '2')
  } },
  { path: '/search', body: finalBody }
]

test('駿河屋は実フォームの識別子を使い今回のみの検索設定と年齢確認を送る', async () => {
  const steps = surugayaSteps(fixture('surugaya-condition.html'))
  replies(steps)
  assert.equal((await scrapeSurugaya('4560100333874'))[0].price, 6000)
  assert.equal(steps.length, 0)
})

test('駿河屋が年齢確認済みなら検索設定後に追加の確認を送らない', async () => {
  const body = fixture('surugaya-condition.html')
  const steps = surugayaSteps(body)
  steps[2].body = body
  steps.splice(3, 1)
  replies(steps)
  assert.equal((await scrapeSurugaya('4560100333874'))[0].price, 6000)
  assert.equal(steps.length, 0)
})

test('確認画面のリンクが別サイトを指す場合は送信しない', async () => {
  for (const entry of [
    { path: '/detail/vsat_0256/', body: '<title>年齢確認</title><a href="https://example.com/age_check/=/declared=yes/">はい</a>', run: () => scrapeFanza(fanzaURL) },
    { path: '/product_list_parts.aspx', body: '<p class="adult_on"><a href="https://example.com/adult_confirm.aspx">表示</a></p>', run: () => scrapeSofmap('4560100333874') },
    { path: '/search', body: '<a href="https://example.com/safe_search/config">セーフサーチによって2件</a>', run: () => scrapeSurugaya('4560100333874') }
  ]) {
    const fetchMock = replies([entry])
    await assert.rejects(entry.run(), /Unexpected age-confirmation endpoint/)
    assert.equal(fetchMock.mock.callCount(), 1)
    mock.restoreAll()
  }
})

test('自動確認に失敗しても再送信を繰り返さない', async () => {
  for (const entry of [
    { steps: [{ path: '/detail/vsat_0256/', body: fixture('age-fanza.html') },
      { path: '/age_check/=/declared=yes/', body: fixture('age-fanza.html') }], run: () => scrapeFanza(fanzaURL) },
    { steps: sofmapSteps(fixture('sofmap-filtered.html')), run: () => scrapeSofmap('4560100333874') },
    { steps: surugayaSteps(fixture('surugaya-filtered.html')), run: () => scrapeSurugaya('4560100333874') }
  ]) {
    const expectedCount = entry.steps.length
    const fetchMock = replies(entry.steps)
    const result = await entry.run()
    assert.equal((Array.isArray(result) ? result[0] : result).price, null)
    assert.equal(fetchMock.mock.callCount(), expectedCount)
    mock.restoreAll()
  }
})

test('駿河屋のフォーム構造が変わった場合は推測でPOSTしない', async () => {
  const fetchMock = replies([
    { path: '/search', body: fixture('surugaya-filtered.html') },
    { path: '/safe_search/config', body: '<form><input name="form_id" value="safe_search_form"></form>' }
  ])
  await assert.rejects(scrapeSurugaya('4560100333874'), /Safe-search form not found/)
  assert.equal(fetchMock.mock.callCount(), 2)
})
