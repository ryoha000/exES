import { backgroundFetch } from '../utils'
import { JANCodeWithAssociatedPrices } from './types'
import { documentFrom, parsePrice, unavailable } from './price'

export const parseGetchu = (body: string, id: string): JANCodeWithAssociatedPrices => {
  const dom = documentFrom(body)
  const priceURL = `https://www.getchu.com/item/${id}/`
  const row = Array.from(dom.querySelectorAll('tr')).find(row => {
    const label = row.querySelector(':scope > td, :scope > th')?.textContent?.trim()
    return label === 'JANコード：' || label === 'JANコード:'
  })
  const code = row?.lastElementChild?.textContent?.trim().match(/^(\d{13}|\d{8})$/)?.[1]
  const prices = Array.from(dom.querySelectorAll('[class^="cart_block"]'))
    .filter(block => !block.querySelector('button[disabled]'))
    .map(block => parsePrice(block.querySelector('.taxin, .redb2')?.textContent))
    .filter((price): price is NonNullable<typeof price> => price !== null)
  const lowest = prices.sort((a, b) => a.price - b.price)[0]
  return {
    janCode: code,
    getchu: lowest ? { title: 'Getchu', priceURL, ...lowest } : unavailable('Getchu', priceURL,
      /ご注文の受付は停止|販売終了|品切れ/.test(dom.body.textContent || '') ? '販売停止・在庫なし' : '価格を取得できません')
  }
}

export default async (id: string): Promise<JANCodeWithAssociatedPrices> => {
  if (!/^\d+$/.test(id)) throw new Error('Invalid Getchu product ID')
  return parseGetchu(await backgroundFetch({ url: `https://www.getchu.com/item/${id}/`, params: { gc: 'gc' } }), id)
}
