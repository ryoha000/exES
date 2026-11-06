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
    try {
      const saleInfos = await getPastSaleInfo()
      store({ saleInfos, saleStatus: saleInfos.length ? undefined : '該当するキャンペーンはありません' })
    } catch (error) {
      console.error(error)
      store({ saleStatus: 'キャンペーン情報の取得に失敗しました' })
    }
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
