import { ExternalLinks, getAmazonPrice, getDlsitePrice, getFanzaPrice, getJANCodeWithAssociatedPrice, getPastSaleInfo, ResultResponse } from './scrape/scrape'
import { Store } from '../store'

export const getRequestPromises = (store: Store, links: ExternalLinks) => {
  const promises = []
  
  for (const url of links.amazon) {
    promises.push(updateCallback(store, getAmazonPrice(url)))
  }
  if (links.getchu) promises.push(updateCallback(store, getJANCodeWithAssociatedPrice(links.getchu)))
  if (links.dlsite) promises.push(updateCallback(store, getDlsitePrice(links.dlsite)))
  if (links.fanza) promises.push(updateCallback(store, getFanzaPrice(links.fanza)))
  promises.push((async () => {
    const saleInfos = await getPastSaleInfo()
    const tmp = store()
    store({ saleInfos: [...tmp.saleInfos, ...saleInfos] })
  })())
  return promises
}

const updateCallback = async (store: Store, func: Promise<ResultResponse | ResultResponse[] | null>) => {
  const res = await func
  if (!res) {
    return
  }
  const tmp = store()
  if (Array.isArray(res)) {
    store({ priceInfos: [...tmp.priceInfos, ...res] })
  } else {
    store({ priceInfos: [...tmp.priceInfos, res]})
  }
}
