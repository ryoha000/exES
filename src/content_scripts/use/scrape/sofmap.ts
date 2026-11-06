import { backgroundFetch } from '../utils'
import { ResultResponse } from './types'
import { documentFrom, linkURL, parsePrice, unavailable } from './price'
import { confirmSofmapAge } from './age-confirmation'

export const sofmapURL = (jan: string) => `https://a.sofmap.com/search_result.aspx?styp=p_bar&keyword=${encodeURIComponent(jan)}`

export const parseSofmap = (body: string, jan: string): ResultResponse[] => {
  const dom = documentFrom(body)
  const titleURL = sofmapURL(jan)
  const offers: ResultResponse[] = []
  for (const main of Array.from(dom.querySelectorAll('.mainbox'))) {
    const stock = main.querySelector('.stock')?.textContent || ''
    const soldOut = /完売|販売終了|在庫なし|限定数終了|お取り扱いを終了/.test(stock)
    const used = !!main.querySelector('.used, .useditem, [class*="used-rank"]') ||
      /中古/.test(main.querySelector('.item-type')?.textContent || '')
    const price = parsePrice(main.querySelector('.price')?.textContent)
    const priceURL = linkURL(main.querySelector('a.product_name'), titleURL)
    if (!soldOut && price && priceURL) offers.push({ title: used ? 'Sofmap(中古)' : 'Sofmap(新品)', titleURL, priceURL, ...price })
    const usedBox = main.closest('li')?.querySelector('.used_box')
    const usedPrice = parsePrice(usedBox?.querySelector('.price-txt')?.textContent)
    const usedURL = linkURL(usedBox?.querySelector('a') || null, titleURL)
    if (usedPrice && usedURL) offers.push({ title: 'Sofmap(中古)', titleURL, priceURL: usedURL, ...usedPrice })
  }
  const best = new Map<string, ResultResponse>()
  for (const result of offers) {
    if (!best.has(result.title) || result.price! < best.get(result.title)!.price!) best.set(result.title, result)
  }
  if (best.size) return [...best.values()]
  if (dom.querySelector('.adult_on')) return [unavailable('Sofmap', titleURL, '取得失敗（サイトで確認）')]
  return [unavailable('Sofmap', titleURL, '在庫・価格を確認できません')]
}

export default async (jan: string): Promise<ResultResponse[]> => {
  // The normal search page is a shell; the same-origin fragment contains sale prices.
  const request = { url: 'https://a.sofmap.com/product_list_parts.aspx',
    params: { styp: 'p_bar', keyword: jan, is_page: 'serch_result', isFirst: 'true' } }
  const body = await backgroundFetch(request)
  return parseSofmap(await confirmSofmapAge(body, sofmapURL(jan), request), jan)
}
