interface Param {
  [key: string]: string
}

export interface IFetchMessageRequest {
  url: string
  params?: Param
}

export type IFetchMessageResult = IFetchMessageSuccess | IFetchMessageError

export interface IFetchMessageSuccess {
  type: 'success'
  body: string
}

export interface IFetchMessageError {
  type: 'error'
  body: Error
}
