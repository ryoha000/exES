import { RowInfo } from "./components/table_row"
import { PriceInfo, SaleInfo } from "./store"

export const getASINFromAmazonURL = (url: URL) => {
  const paths = url.pathname.split("/")
  const beforeTargetIndex = paths.findIndex(v => v === "ASIN")
  if (beforeTargetIndex === -1 || paths.length - 1 === beforeTargetIndex) {
    return ""
  }
  return paths[beforeTargetIndex + 1]
}

export const getDlsiteIDFromURL = (url: URL) => {
  const paths = url.pathname.split("/")
  return paths[paths.length - 1].replace(".html", "")
}

export const sleep = (msec: number) => new Promise<void>(resolve => setTimeout(resolve, msec));

export const convertPriceInfosToRowInfos = (pis: PriceInfo[]) => {
  const rowInfos: RowInfo[] = []
  for (const pi of pis) {
    rowInfos.push([
      { text: pi.title, url: pi.titleURL },
      { text: pi.price, url: pi.priceURL }
    ])
  }
  return rowInfos
}

export const convertSaleInfosToRowInfos = (sis: SaleInfo[]) => {
  const rowInfos: RowInfo[] = []
  for (const si of sis) {
    const day = `${si.start.slice(0, 10)} ～ ${si.end.slice(0, 10)}`
    rowInfos.push([
      { text: day },
      { text: si.content }
    ])
  }
  return rowInfos
}
