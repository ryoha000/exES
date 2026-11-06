import { ResultResponse } from './use/scrape/types'
export type Store = (update?: Partial<State> | undefined) => State

interface State {
  priceInfos: PriceInfo[]
  saleInfos: SaleInfo[]
  saleStatus?: string
}

export type PriceInfo = ResultResponse

export interface SaleInfo {
  content: string
  start: string
  end: string
}

export const createStore = (initialState: State, renderApp: () => void): Store => {
  let data = initialState

  return (update) => {
    if (update) {
      data = { ...data, ...update }
      renderApp()
    }
    return data
  }
}
