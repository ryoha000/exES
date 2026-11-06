import { fetchPage } from './fetch'
import { IFetchMessageResult } from '../utils'

// Register synchronously so Chrome can dispatch messages after restarting the worker.
chrome.runtime.onMessage.addListener(
  (request: unknown, sender, sendResponse: (response: IFetchMessageResult) => void) => {
    if (sender.id !== chrome.runtime.id || !sender.url) return false

    const source = new URL(sender.url)
    if (!['http:', 'https:'].includes(source.protocol) ||
        !['erogamescape.dyndns.org', 'erogamescape.org'].includes(source.hostname)) return false

    fetchPage(request).then(sendResponse)
    // Keep the message channel open until fetch and decoding finish.
    return true
  }
)
