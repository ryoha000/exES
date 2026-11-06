export interface Price {
  price: number
  priceMax?: number
  priceFrom?: boolean
}

export interface ResultResponse {
  title: string
  price: number | null
  priceMax?: number
  priceFrom?: boolean
  titleURL?: string
  priceURL?: string
  message?: string
}

export interface JANCodeWithAssociatedPrices {
  janCode?: string
  getchu: ResultResponse
}
