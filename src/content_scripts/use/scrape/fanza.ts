import { backgroundFetch } from '../utils'
import { getNumber, ResultResponse } from './scrape'

const scrapeFanza = async (url: string): Promise<ResultResponse> => {
  const body = await backgroundFetch({ url: url })
  const doms = new DOMParser().parseFromString(body, 'text/html')
  // TODO: class が (normal | campaign)-price じゃないことがあるかも？要調査
  let priceDOM = doms.querySelector(".normal-price > span")
  if (!priceDOM) {
    priceDOM = doms.querySelector(".campaign-price > span")
  }
  if (!priceDOM) {
    throw new Error("not found")
  }
  const price = getNumber(priceDOM.innerHTML)
  return { title: "FANZA", price: price, priceURL: url }
}

export default scrapeFanza
