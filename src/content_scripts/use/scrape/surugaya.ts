import { backgroundFetch } from '../utils'
import { ResultResponse } from './types'
import { documentFrom, linkURL, parsePrice, unavailable } from './price'

export const surugayaURL = (jan: string) => `https://www.suruga-ya.jp/search?search_word=${encodeURIComponent(jan)}&searchbox=1`

export const parseSurugaya = (body: string, jan: string): ResultResponse[] => {
  const dom = documentFrom(body)
  const titleURL = surugayaURL(jan)
  const results: ResultResponse[] = []
  for (const item of Array.from(dom.querySelectorAll('#search_result .item'))) {
    if (/[（(]状態[：:]|ジャンク|ディスク単品/.test(item.querySelector('.title')?.textContent || '')) continue
    const priceBox = item.querySelector('.item_price')
    const price = parsePrice(priceBox?.querySelector(':scope > p .text-red strong')?.textContent)
    const priceURL = linkURL(item.querySelector('.item_detail .title a'), titleURL)
    if (price && priceURL) {
      const label = /新品/.test(priceBox?.querySelector('.price_normal')?.textContent || '') ? '新品' : '中古'
      results.push({ title: `駿河屋(${label})`, titleURL, priceURL, ...price })
    }
    const marketPrice = parsePrice(priceBox?.querySelector('.makeplaTit .text-red strong, .mgnB5.mgnT5 .text-red strong')?.textContent)
    const marketURL = linkURL(priceBox?.querySelector('a[href*="/product/other/"]') || null, titleURL)
    if (marketPrice && marketURL) results.push({ title: '駿河屋(マケプレ)', titleURL, priceURL: marketURL, ...marketPrice })
  }
  // Keep the cheapest offer per condition, with its matching link and range.
  const best = new Map<string, ResultResponse>()
  for (const result of results) {
    if (!best.has(result.title) || result.price! < best.get(result.title)!.price!) best.set(result.title, result)
  }
  if (best.size) return [...best.values()]
  const safeSearch = Array.from(dom.querySelectorAll('a[href*="/safe_search/config"]')).find(link => /によって/.test(link.textContent || ''))
  if (safeSearch) return [unavailable('駿河屋', linkURL(safeSearch, titleURL) || titleURL, 'サイトでセーフサーチ設定後に再読み込み')]
  return [unavailable('駿河屋', titleURL,
    /該当する商品|見つかりません|検索結果は0件|該当件数：0件/.test(dom.body.textContent || '') ? '該当商品なし' : '販売価格を取得できません')]
}

export default async (jan: string): Promise<ResultResponse[]> => {
  return parseSurugaya(await backgroundFetch({ url: surugayaURL(jan) }), jan)
}
