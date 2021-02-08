interface Param {
  [key: string]: string
}

export interface IFetchMessageRequest {
  url: string
  params?: Param
}

export interface IFetchMessageResult {
  type: 'error' | 'success'
  body: string | Error
}
