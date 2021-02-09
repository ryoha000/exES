import { backgroundFetch } from '../utils'
import { getNumber, ResultResponse } from './scrape'

interface IDlsiteAjax {
  [key: string]: {
    price: number
  }
}

const scrapeDlsite = async (url: string): Promise<number> => {
  const body = await backgroundFetch({ url: url })
  const response = JSON.parse(body) as IDlsiteAjax
  return response[Object.keys(response)[0]].price
}

export default scrapeDlsite
