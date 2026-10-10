// Shrinks a photo on the device so it fits comfortably inside a Firestore doc (1 MiB limit)
const MAX_BYTES = 700_000

export async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    for (const [side, quality] of [
      [1280, 0.8],
      [1024, 0.7],
      [800, 0.6],
      [640, 0.5],
    ] as const) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(bitmap.width * scale)
      canvas.height = Math.round(bitmap.height * scale)
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      if (dataUrl.length <= MAX_BYTES) return dataUrl
    }
    throw new Error('Image too large')
  } finally {
    bitmap.close()
  }
}
