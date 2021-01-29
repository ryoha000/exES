import { ExternalLinks, getAmazonPrice, getDlsitePrice, getFanzaPrice, getJANCodeWithAssociatedPrice, ResultResponse } from './scrape'
import { Store } from './store'

export const getRequestPromises = (store: Store, links: ExternalLinks) => {
  const promises = []
  const amazonPromise = async () => {
    for (const url of links.amazon) {
      await updateCallback(store, getAmazonPrice(url))
    }
  }

  promises.push(amazonPromise())
  if (links.getchu) promises.push(updateCallback(store, getJANCodeWithAssociatedPrice(links.getchu)))
  if (links.dlsite) promises.push(updateCallback(store, getDlsitePrice(links.dlsite)))
  if (links.fanza) promises.push(updateCallback(store, getFanzaPrice(links.fanza)))
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
