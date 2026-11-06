interface Param {
  [key: string]: string | number
}

export interface IFetchMessageRequest {
  url: string
  params?: Param
  surugayaForm?: {
    stage: 'settings' | 'confirm'
    buildId: string
    token?: string
  }
}

export type IFetchMessageResult = IFetchMessageSuccess | IFetchMessageError

export interface IFetchMessageSuccess {
  type: 'success'
  body: string
}

export interface IFetchMessageError {
  type: 'error'
  body: string
}
