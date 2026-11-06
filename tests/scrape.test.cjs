const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { JSDOM } = require('jsdom')
global.DOMParser = new JSDOM('').window.DOMParser
const fixture = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8')
const { parsePrice } = require('../src/content_scripts/use/scrape/price.ts')
const { parseSurugaya } = require('../src/content_scripts/use/scrape/surugaya.ts')
const { parseGetchu } = require('../src/content_scripts/use/scrape/getchu.ts')
const { parseSofmap } = require('../src/content_scripts/use/scrape/sofmap.ts')
const { parseAmazon } = require('../src/content_scripts/use/scrape/amazon.ts')
const { parseFanza } = require('../src/content_scripts/use/scrape/fanza.ts')
const { parseDlsite } = require('../src/content_scripts/use/scrape/dlsite.ts')
const { parseSaleInfo, getExternalLinks, getJANCodeWithAssociatedPrice } = require('../src/content_scripts/use/scrape/scrape.ts')
const { getASINFromAmazonURL, getGetchuIDFromURL, getDlsiteRequestURL, unwrapURL, convertPriceInfosToRowInfos } = require('../src/content_scripts/use/utils.ts')

test('価格範囲・開始価格・全角を認識して数字を連結しない', () => {
  assert.deepEqual(parsePrice('￥4,080 ～ ￥6,600'), { price: 4080, priceMax: 6600 })
  assert.deepEqual(parsePrice('¥6,980(税込)～'), { price: 6980, priceFrom: true })
  assert.deepEqual(parsePrice('￥１，９８０'), { price: 1980 })
  assert.deepEqual(parsePrice('7,480円 16%還元 1,088pt'), { price: 7480 })
  assert.deepEqual(parsePrice('0円'), { price: 0 })
  assert.equal(parsePrice('在庫3個 100pt'), null)
})

test('駿河屋の実応答から価格範囲を維持する', () => {
  const [result] = parseSurugaya(fixture('surugaya-range.html'), '4933032002963')
  assert.equal(result.price, 4080)
  assert.equal(result.priceMax, 6600)
  assert.match(result.priceURL, /^https:\/\/www\.suruga-ya\.jp\/product\/detail\//)
  assert.equal(convertPriceInfosToRowInfos([result])[0][1].text, '4,080～6,600円')
})

test('駿河屋のセール価格とマケプレを別々に拾い定価を使わない', () => {
  const results = parseSurugaya(fixture('surugaya-sale.html'), '4933032011682')
  assert.deepEqual(results.map(r => [r.title, r.price]), [['駿河屋(中古)', 8000], ['駿河屋(マケプレ)', 7400]])
  assert.equal(results[1].priceURL, 'https://www.suruga-ya.jp/product/other/145082196')
})

test('駿河屋のセーフサーチで非表示のときは在庫なしと扱わない', () => {
  const [result] = parseSurugaya(fixture('surugaya-filtered.html'), '4560100333874')
  assert.equal(result.price, null)
  assert.match(result.message, /セーフサーチ/)
  assert.match(result.priceURL, /safe_search\/config/)
})

test('駿河屋のディスク単品の安値を通常品の価格に混ぜない', () => {
  const results = parseSurugaya(fixture('surugaya-condition.html'), '4560100333874')
  assert.deepEqual(results.map(r => [r.title, r.price]), [['駿河屋(中古)', 6000], ['駿河屋(マケプレ)', 5386]])
})

test('Getchu の現行価格欄から最安の税込価格と JAN を読む', () => {
  const result = parseGetchu(fixture('getchu-summer.html'), '1298387')
  assert.equal(result.janCode, '4933032011682')
  assert.equal(result.getchu.price, 7990)
})

test('Getchu の JAN がなくても価格を残し他の数字を JAN と誤認しない', () => {
  const result = parseGetchu('<table><tr><td>発売日：</td><td>2024/09/27</td></tr></table><div class="cart_block1"><span class="taxin">￥1,980</span></div>', '1')
  assert.equal(result.janCode, undefined)
  assert.equal(result.getchu.price, 1980)
})

test('ソフマップの新品と中古開始価格を分けてリンクを解決する', () => {
  const results = parseSofmap(fixture('sofmap-summer.html'), '4933032011682')
  assert.deepEqual(results.map(r => [r.title, r.price]), [['Sofmap(新品)', 7300], ['Sofmap(中古)', 6980]])
  assert.equal(results[1].priceFrom, true)
  assert.equal(convertPriceInfosToRowInfos(results)[1][1].text, '6,980円～')
  assert.match(results[1].priceURL, /^https:\/\/a\.sofmap\.com\/search_result/)
})

test('ソフマップの売り切れ価格を表示しない', () => {
  const result = parseSofmap('<li><div class="mainbox"><a class="product_name" href="/product_detail.aspx?sku=1">商品</a><span class="price">￥100</span><span class="stock">完売御礼</span></div></li>', '1')
  assert.equal(result[0].price, null)
  const used = parseSofmap(fixture('sofmap-used.html'), '4560100333874')
  assert.deepEqual(used.map(r => [r.title, r.price]), [['Sofmap(中古)', 5480]])
  assert.match(parseSofmap('<p class="adult_on">成人向けを表示する</p>', '1')[0].message, /年齢確認/)
})

test('Amazon の現在の価格欄を読み旧セレクターに依存しない', () => {
  const result = parseAmazon(fixture('amazon-normal.html'), 'B000EIUQL6')
  assert.equal(result.price, 5316)
  assert.equal(result.title, 'CLANNAD -クラナド-')
})

test('Amazon の参考価格と関連商品の安値を使わない', () => {
  const result = parseAmazon('<h1 id="productTitle">商品</h1><div id="corePrice_feature_div"><span class="a-price a-text-price"><span class="a-offscreen">￥9,999</span></span><span class="a-price"><span class="a-offscreen">￥2,980</span></span></div><div class="a-price">￥100</div>', 'B000EIUQL6')
  assert.equal(result.price, 2980)
  assert.equal(parseAmazon('<title>Robot Check</title><input id="captchacharacters">', 'B000EIUQL6').price, null)
})

test('FANZA の通常価格と割引価格を読みポイントを含めない', () => {
  assert.equal(parseFanza(fixture('fanza-normal.html'), 'https://dlsoft.dmm.co.jp/detail/vsat_0256/').price, 7480)
  assert.equal(parseFanza('<div class="sellingPrice__originalPrice">7,480円</div><div class="sellingPrice__discountPrice">3,740円</div><div>50%OFF 1,000pt</div>', 'https://dlsoft.dmm.co.jp/').price, 3740)
  assert.equal(parseFanza(fixture('fanza-sale.html'), 'https://dlsoft.dmm.co.jp/').price, 8530)
})

test('年齢確認を価格欠損で隠さず案内する', () => {
  const result = parseFanza('<title>年齢認証 - FANZA</title>', 'https://dlsoft.dmm.co.jp/')
  assert.equal(result.price, null)
  assert.match(result.message, /年齢確認/)
})

test('FANZA通販は値引額や参考価格を販売価格として扱わない', () => {
  assert.equal(parseFanza(fixture('fanza-physical.html'), 'https://www.dmm.co.jp/mono/pcgame/').price, 9880)
  const result = parseFanza('<div>取り扱いが終了しました</div><div class="price"><span class="txt-discount">894円</span><span class="txt-price-reference">6,380円</span></div>', 'https://www.dmm.co.jp/mono/pcgame/')
  assert.equal(result.price, null)
  assert.equal(result.message, '販売終了')
})

test('DLsite は指定した商品だけを読みセール価格と無料を保持する', () => {
  assert.equal(parseDlsite(fixture('dlsite-sale.json'), 'VJ013550', 'https://www.dlsite.com/').price, 5236)
  assert.equal(parseDlsite('{"OTHER":{"price":100},"VJ013550":{"price":0,"is_sale":true}}', 'VJ013550', '').price, 0)
  assert.equal(parseDlsite('{"OTHER":{"price":100}}', 'VJ013550', '').price, null)
  assert.equal(parseDlsite('{"VJ013550":{"price":100,"is_sold_out":true}}', 'VJ013550', '').price, null)
})

test('過去キャンペーンは列名で解析し新しい日付から表示する', () => {
  const rows = parseSaleInfo(fixture('campaign-summer.html'))
  assert.equal(rows.length, 2)
  assert.equal(rows[0].content, '5,236円 30%OFF')
  assert.equal(rows[1].content, '810pt 10%還元')
  assert.throws(() => parseSaleInfo('<html>error</html>'), /取得できません/)
})

test('キャンペーン0件の実応答を取得失敗と混同しない', () => {
  assert.deepEqual(parseSaleInfo(fixture('campaign-empty.html')), [])
  assert.throws(() => parseSaleInfo('<div id="query_result_main"></div>'), /取得できません/)
})

test('新旧の商品リンク・アフィリエイトリンクから正しい ID を取り出す', () => {
  for (const path of ['dp/B000EIUQL6', 'gp/product/B000EIUQL6', 'exec/obidos/ASIN/B000EIUQL6']) assert.equal(getASINFromAmazonURL(new URL('https://www.amazon.co.jp/' + path)), 'B000EIUQL6')
  assert.equal(getGetchuIDFromURL(new URL('https://www.getchu.com/item/1298387/')), '1298387')
  assert.equal(getGetchuIDFromURL(new URL('https://image.getchu.com/api/geturl.phtml/id/1298387/af/97/?id=1298387')), '1298387')
  const dlsite = new URL('https://www.dlsite.com/soft/dlaf/=/link/work/aid/erogamescape/id/VJ013550.html')
  assert.equal(new URL(getDlsiteRequestURL(dlsite)).searchParams.get('product_id'), 'VJ013550')
  assert.equal(new URL(getDlsiteRequestURL(dlsite)).searchParams.get('cdn_cache_min'), '1')
  assert.equal(unwrapURL(new URL('https://al.fanza.co.jp/?lurl=https%3A%2F%2Fdlsoft.dmm.co.jp%2Fdetail%2Fvsat_0256%2F')).hostname, 'dlsoft.dmm.co.jp')
})

test('リンク内の装飾や空白があっても通販リンクを認識する', () => {
  const dom = new JSDOM('<div id="bottom_inter_links_main"><a href="https://www.getchu.com/item/1/"> <b>Getchu.com</b> </a><a href="https://al.fanza.co.jp/?lurl=https%3A%2F%2Fdlsoft.dmm.co.jp%2Fdetail%2Fx%2F"> DMM </a></div>').window.document
  const result = getExternalLinks(dom)
  assert.ok(result.getchu)
  assert.ok(result.fanza)
})

test('一店舗の通信失敗で他の店舗の価格を消さない', async (t) => {
  t.mock.method(console, 'error', () => {})
  t.after(() => { delete global.chrome })
  for (const failedHost of ['', 'www.suruga-ya.jp', 'a.sofmap.com']) {
    global.chrome = { runtime: { sendMessage: (request, callback) => {
      const host = new URL(request.url).hostname
      const files = { 'www.getchu.com': 'getchu-summer.html', 'www.suruga-ya.jp': 'surugaya-sale.html', 'a.sofmap.com': 'sofmap-summer.html' }
      callback(host === failedHost ? { type: 'error', body: 'HTTP 503' } : { type: 'success', body: fixture(files[host]) })
    } } }
    const results = await getJANCodeWithAssociatedPrice(new URL('https://www.getchu.com/item/1298387/'))
    assert.equal(results.find(row => row.title === 'Getchu').price, 7990)
    for (const [host, title, price] of [['www.suruga-ya.jp', '駿河屋', 8000], ['a.sofmap.com', 'Sofmap', 7300]]) {
      const row = results.find(row => row.title.startsWith(title))
      assert.equal(row.price, failedHost === host ? null : price)
      if (failedHost === host) assert.match(row.message, /取得失敗/)
    }
  }
})
