export type Store = (update?: Partial<State> | undefined) => State

interface State {
  priceInfos: PriceInfo[]
  saleInfos: SaleInfo[]
}

export interface PriceInfo {
  title: string
  titleURL: string
  price: string
  priceURL: string
}

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
