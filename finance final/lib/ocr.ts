import Tesseract from 'tesseract.js'
import config from '@/config.json'

export interface OCRResult {
  text: string
  amount?: string
  vendorName?: string
  date?: string
  confidence: number
}

// Preload Tesseract worker to avoid repeated language data loading
let workerInitialized = false

export async function preloadOCRWorker() {
  if (!workerInitialized) {
    console.log('🔍 OCR DEBUG: Preloading Tesseract worker...')
    try {
      await Tesseract.createWorker('eng')
      workerInitialized = true
      console.log('🔍 OCR DEBUG: Worker preloaded successfully')
    } catch (error) {
      console.error('❌ OCR DEBUG: Failed to preload worker:', error)
    }
  }
}

/**
 * Perform OCR using Google Cloud Vision API
 * Requires googleCloudVisionApiKey in config.json
 */
async function performGoogleVisionOCR(file: File, onProgress?: (progress: number) => void): Promise<OCRResult> {
  // Use environment variable for the API key to avoid exposing it in config.json
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_VISION_API_KEY || (config as any).googleCloudVisionApiKey
  
  if (!apiKey || apiKey === 'your_google_cloud_vision_api_key_here') {
    throw new Error('Google Cloud Vision API key not found. Please set NEXT_PUBLIC_GOOGLE_VISION_API_KEY in your environment variables.')
  }

  console.log('🔍 OCR DEBUG: Using Google Cloud Vision API')
  
  if (onProgress) onProgress(20)
  
  // Convert file to base64
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1]) // Remove data URL prefix
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  if (onProgress) onProgress(50)

  // Call Google Cloud Vision API
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64,
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 1,
              },
            ],
          },
        ],
      }),
    }
  )

  if (onProgress) onProgress(80)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Google Vision API error: ${error.error?.message || response.statusText}`)
  }

  const data = await response.json()
  const text = data.responses[0]?.fullTextAnnotation?.text || ''
  const confidence = data.responses[0]?.fullTextAnnotation?.pages?.[0]?.confidence || 0

  if (onProgress) onProgress(100)

  console.log('🔍 OCR DEBUG: Google Vision completed successfully')
  console.log('🔍 OCR DEBUG: Extracted text length:', text.length)

  // Extract specific fields
  const amount = extractAmount(text)
  const vendorName = extractVendorName(text)
  const date = extractDate(text)

  console.log('🔍 OCR DEBUG: Extracted amount:', amount)
  console.log('🔍 OCR DEBUG: Extracted vendor:', vendorName)
  console.log('🔍 OCR DEBUG: Extracted date:', date)

  return {
    text,
    amount,
    vendorName,
    date,
    confidence: confidence * 100, // Convert to percentage
  }
}

/**
 * Extract amount from OCR text using regex patterns
 */
function extractAmount(text: string): string | undefined {
  // Pattern 1: Amount with currency symbol (₹, $, €, etc.)
  const currencyPattern = /[\₹$€£¥]\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g
  const currencyMatches = text.match(currencyPattern)
  
  if (currencyMatches) {
    // Get the last match (usually the total)
    const lastMatch = currencyMatches[currencyMatches.length - 1]
    const amountMatch = lastMatch.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/)
    if (amountMatch) {
      return amountMatch[1].replace(/,/g, '')
    }
  }

  // Pattern 2: Amount without currency symbol but with "Total" or "Amount" keywords
  const totalPattern = /(?:total|amount|sum|grand total)[:\s]*([₹$€£¥]?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi
  const totalMatch = text.match(totalPattern)
  
  if (totalMatch) {
    const amountMatch = totalMatch[0].match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/)
    if (amountMatch) {
      return amountMatch[1].replace(/,/g, '')
    }
  }

  // Pattern 3: Standalone numbers with decimal points (potential amounts)
  const decimalPattern = /\b\d{1,3}(?:,\d{3})*\.\d{2}\b/g
  const decimalMatches = text.match(decimalPattern)
  
  if (decimalMatches) {
    // Get the largest number (likely the total)
    const amounts = decimalMatches.map(m => parseFloat(m.replace(/,/g, '')))
    const maxAmount = Math.max(...amounts)
    if (maxAmount > 0) {
      return maxAmount.toString()
    }
  }

  return undefined
}

/**
 * Extract vendor name from OCR text
 */
function extractVendorName(text: string): string | undefined {
  // Look for patterns like "STAR HOTELS", "Restaurant Name", etc.
  // Usually at the beginning of the receipt
  const lines = text.split('\n').filter(line => line.trim().length > 0)
  
  if (lines.length > 0) {
    // First non-empty line is often the vendor name
    const firstLine = lines[0].trim()
    if (firstLine.length > 2 && firstLine.length < 50) {
      return firstLine
    }
  }

  return undefined
}

/**
 * Extract date from OCR text and convert to yyyy-MM-dd format
 */
function extractDate(text: string): string | undefined {
  // Pattern 1: DD/MM/YYYY or DD-MM-YYYY
  const datePattern1 = /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/
  const dateMatch1 = text.match(datePattern1)
  if (dateMatch1) {
    return convertToYYYYMMDD(dateMatch1[0])
  }

  // Pattern 2: YYYY-MM-DD
  const datePattern2 = /(\d{4}[\/\-]\d{2}[\/\-]\d{2})/
  const dateMatch2 = text.match(datePattern2)
  if (dateMatch2) {
    return convertToYYYYMMDD(dateMatch2[0])
  }

  // Pattern 3: Date: DD/MM/YYYY
  const datePattern3 = /date[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/gi
  const dateMatch3 = text.match(datePattern3)
  if (dateMatch3) {
    const dateValue = dateMatch3[0].match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/)
    if (dateValue) {
      return convertToYYYYMMDD(dateValue[0])
    }
  }

  return undefined
}

/**
 * Convert date string to yyyy-MM-dd format
 */
function convertToYYYYMMDD(dateStr: string): string {
  // Replace all separators with /
  const normalized = dateStr.replace(/-/g, '/')
  
  const parts = normalized.split('/')
  
  // If it's already in YYYY/MM/DD format
  if (parts[0].length === 4) {
    return normalized.replace(/\//g, '-')
  }
  
  // If it's in DD/MM/YYYY format, convert to YYYY-MM-DD
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }
  
  // Return original if format is unrecognized
  return dateStr
}

/**
 * Perform OCR on an image file and extract receipt data
 */
export async function performOCR(file: File, onProgress?: (progress: number) => void): Promise<OCRResult> {
  console.log('🔍 OCR DEBUG: Starting OCR process')
  console.log('🔍 OCR DEBUG: File received:', file.name, file.type, file.size)

  // Try Google Cloud Vision first (faster, more accurate)
  try {
    return await performGoogleVisionOCR(file, onProgress)
  } catch (googleError) {
    console.warn('⚠️ Google Vision OCR failed, falling back to Tesseract:', googleError)
    
    // Fallback to Tesseract.js
    try {
      console.log('🔍 OCR DEBUG: Falling back to Tesseract.js')
      
      // Add timeout to prevent infinite scanning (increased to 120 seconds for language data loading)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('OCR timeout after 120 seconds')), 120000)
      })

      console.log('🔍 OCR DEBUG: Initializing Tesseract...')
      const ocrPromise = Tesseract.recognize(file, 'eng', {
        logger: (m: any) => {
          console.log('🔍 OCR DEBUG: Tesseract status:', m.status, 'Progress:', m.progress)
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(Math.round(m.progress * 100))
          }
        },
      })

      console.log('🔍 OCR DEBUG: Waiting for OCR to complete...')
      const result = await Promise.race([ocrPromise, timeoutPromise])

      console.log('🔍 OCR DEBUG: Tesseract OCR completed successfully')
      const text = result.data.text
      const confidence = result.data.confidence

      console.log('🔍 OCR DEBUG: Extracted text length:', text.length)
      console.log('🔍 OCR DEBUG: Extracted text preview:', text.substring(0, 200))
      console.log('🔍 OCR DEBUG: Confidence score:', confidence)

      // Extract specific fields
      const amount = extractAmount(text)
      const vendorName = extractVendorName(text)
      const date = extractDate(text)

      console.log('🔍 OCR DEBUG: Extracted amount:', amount)
      console.log('🔍 OCR DEBUG: Extracted vendor:', vendorName)
      console.log('🔍 OCR DEBUG: Extracted date:', date)

      return {
        text,
        amount,
        vendorName,
        date,
        confidence,
      }
    } catch (tesseractError) {
      console.error('❌ Tesseract OCR also failed:', tesseractError)
      throw new Error('Both Google Vision and Tesseract OCR failed. Please try again with a clearer image.')
    }
  }
}

/**
 * Preprocess image for better OCR results
 */
export async function preprocessImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)

      // Convert to grayscale
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height)
      if (imageData) {
        const data = imageData.data
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
          data[i] = avg
          data[i + 1] = avg
          data[i + 2] = avg
        }
        ctx?.putImageData(imageData, 0, 0)
      }

      // Convert back to file
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const processedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(processedFile)
          } else {
            reject(new Error('Failed to process image'))
          }
        },
        'image/jpeg',
        0.95
      )
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}
