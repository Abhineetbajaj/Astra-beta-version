import { toPng } from 'html-to-image'

/**
 * Renders the given (already-mounted, off-screen) card element to a PNG blob at 2x pixel density,
 * then shares it via the Web Share API's file support if available (posts directly into
 * Instagram Stories/WhatsApp/etc. on mobile), falling back to a plain download.
 */
export async function shareCardImage(
  node: HTMLElement,
  opts: { fileName: string; shareText: string },
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true })
  const blob = await (await fetch(dataUrl)).blob()
  const file = new File([blob], opts.fileName, { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: opts.shareText })
      return 'shared'
    } catch {
      // user cancelled the native share sheet — not an error, fall through to nothing further
      return 'cancelled'
    }
  }

  const link = document.createElement('a')
  link.href = dataUrl
  link.download = opts.fileName
  link.click()
  return 'downloaded'
}
