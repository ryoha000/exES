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
