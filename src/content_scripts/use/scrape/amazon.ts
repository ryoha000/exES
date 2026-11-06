import { backgroundFetch } from '../utils'
import { ResultResponse } from './types'
import { documentFrom, parsePrice, unavailable } from './price'

export const parseAmazon = (body: string, asin: string): ResultResponse => {
  const dom = documentFrom(body)
  const priceURL = `https://www.amazon.co.jp/dp/${asin}`
  if (dom.querySelector('#captchacharacters') || /Robot Check/.test(dom.title)) return unavailable('Amazon', priceURL, 'サイトで確認が必要です')
  const title = dom.querySelector('#productTitle')?.textContent?.trim()
  if (!title) return unavailable('Amazon', priceURL)
  const selectors = [
    '#corePrice_feature_div [data-csa-c-buying-option-type="NEW"] .a-price:not(.a-text-price)',
    '#corePriceDisplay_desktop_feature_div .priceToPay',
    '#corePrice_feature_div .a-price:not(.a-text-price)',
    '#priceblock_dealprice', '#priceblock_ourprice', '#priceblock_saleprice'
  ]
  for (const selector of selectors) {
    const node = dom.querySelector(selector)
    const price = parsePrice(node?.querySelector('.a-offscreen')?.textContent) ||
      parsePrice(node?.querySelector('[aria-hidden="true"]')?.textContent) || parsePrice(node?.textContent)
    if (price) return { title, priceURL, ...price }
  }
  return unavailable('Amazon', priceURL, '在庫・価格を確認できません')
}

export default async (asin: string): Promise<ResultResponse> => {
  if (!/^[A-Z0-9]{10}$/i.test(asin)) throw new Error('Invalid ASIN')
  return parseAmazon(await backgroundFetch({ url: `https://www.amazon.co.jp/dp/${asin}` }), asin)
}
