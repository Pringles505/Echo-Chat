/**
 * Pure utility functions for image processing.
 * No side effects — safe to use anywhere.
 */

/**
 * Compresses an image File to a Blob using an off-screen canvas.
 *
 * @param {File} file - Source image file
 * @param {number} [maxWidth=800] - Max output width in pixels
 * @param {number} [quality=0.7] - JPEG quality (0–1)
 * @returns {Promise<Blob>}
 */
export function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Failed to load image'))
      img.onload = () => {
        let { width, height } = img
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob returned null'))),
          'image/jpeg',
          quality
        )
      }
      img.src = e.target.result
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Reads a File and returns it as a base64 data URL string.
 *
 * @param {File} file
 * @returns {Promise<string>} e.g. "data:image/png;base64,..."
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.onload = (e) => resolve(e.target.result)
    reader.readAsDataURL(file)
  })
}

/**
 * Builds a data URL from a raw base64 string.
 *
 * @param {string} base64
 * @param {string} [mimeType='image/jpeg']
 * @returns {string}
 */
export function base64ToDataUrl(base64, mimeType = 'image/jpeg') {
  return `data:${mimeType};base64,${base64}`
}

/**
 * Returns true if a file is an accepted image type.
 *
 * @param {File} file
 * @param {string[]} [accepted=['image/jpeg','image/png','image/webp','image/gif']]
 * @returns {boolean}
 */
export function isValidImageType(
  file,
  accepted = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) {
  return accepted.includes(file.type)
}

/**
 * Returns true if a file is under the given size limit.
 *
 * @param {File} file
 * @param {number} [maxMB=5] - Maximum size in megabytes
 * @returns {boolean}
 */
export function isUnderSizeLimit(file, maxMB = 5) {
  return file.size <= maxMB * 1024 * 1024
}
