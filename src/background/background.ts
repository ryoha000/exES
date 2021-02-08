import axios from 'axios'
import * as Encoding from 'encoding-japanese'
import { IFetchMessageRequest, IFetchMessageResult } from '../utils'

// @ts-ignore
chrome.runtime.onMessage.addListener(
  (req: IFetchMessageRequest, _: () => void, onSuccess: (res: IFetchMessageResult) => void) => {
    try {
      console.log(req)
      axios({
        method       : 'GET', 
        url          : req.url, 
        params       : req.params ? req.params : {},
        responseType : 'arraybuffer',
        timeout      : 2000
      }).then(doc => {
        const codes = new Uint8Array(doc.data)
        const encode = Encoding.detect(codes)
        if (!encode) {
          console.error("couldn't detect")
          onSuccess({ type: 'error', body: new Error("couldn't detect") })
          return true
        }
        console.log(`detected ${encode}`)
        const body = Encoding.convert(codes, { to: "UNICODE", from: encode, type: 'string' })
        onSuccess({ type: 'success', body: body })
      }).catch(e => onSuccess({ type: 'error', body: e }))
    } catch (e) {
      onSuccess({ type: 'error', body: e })
    }
    return true
  }
)
