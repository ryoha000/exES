import { backgroundFetch } from '../utils'
import { ResultResponse } from './types'
import { documentFrom, parsePrice, unavailable } from './price'
import { confirmFanzaAge } from './age-confirmation'

export const parseFanza = (body: string, url: string): ResultResponse => {
  const dom = documentFrom(body)
  if (/年齢認証|年齢確認/.test(dom.title)) return unavailable('FANZA', url, '取得失敗（サイトで確認）')
  if (Array.from(dom.querySelectorAll('td,div,p,span')).some(node => node.childElementCount === 0 && /^(取り扱いが終了しました|販売終了)$/.test(node.textContent?.trim() || ''))) return unavailable('FANZA', url, '販売終了')
  // Sale price takes priority over the crossed-out normal price and reward points.
  for (const selector of ['.sellingPrice__discountedPrice', '.sellingPrice__discountPrice', '.campaign-price > span', '.sellingPrice__originalPrice', '.normal-price > span', '.price .txt-price-discount']) {
    const price = parsePrice(dom.querySelector(selector)?.textContent)
    if (price) return { title: 'FANZA', priceURL: url, ...price }
  }
  return unavailable('FANZA', url, '販売価格を取得できません')
}

export default async (url: string): Promise<ResultResponse> => {
  const body = await backgroundFetch({ url })
  return parseFanza(await confirmFanzaAge(body, url), url)
}
