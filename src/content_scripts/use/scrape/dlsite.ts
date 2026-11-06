import { backgroundFetch } from '../utils'
import { ResultResponse } from './types'
import { unavailable } from './price'

export const parseDlsite = (body: string, productID: string, priceURL: string): ResultResponse => {
  const response: unknown = JSON.parse(body)
  const product = response && typeof response === 'object' ? (response as Record<string, unknown>)[productID] : undefined
  if (!product || typeof product !== 'object') return unavailable('DLsite', priceURL, '商品情報を取得できません')
  const data = product as Record<string, unknown>
  if (data.is_sold_out === true || data.is_sale === false || data.on_sale === 0) return unavailable('DLsite', priceURL, '販売停止・在庫なし')
  if (typeof data.price !== 'number' || !Number.isSafeInteger(data.price) || data.price < 0) return unavailable('DLsite', priceURL)
  return { title: 'DLsite', price: data.price, priceURL }
}

export default async (url: string, productID: string, priceURL: string): Promise<ResultResponse> =>
  parseDlsite(await backgroundFetch({ url }), productID, priceURL)
