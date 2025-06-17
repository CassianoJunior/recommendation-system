import { CONFIG } from './config.js'

// Sleep utility function
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Enhanced fetch with retry logic and rate limiting
export async function fetchWithRetry(url: string, retries = CONFIG.MAX_RETRIES): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Making API request (attempt ${attempt}/${retries})...`)
      
      const response = await fetch(url)
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : CONFIG.RETRY_DELAY * attempt
        
        console.log(`⏳ Rate limit hit. Waiting ${waitTime/1000} seconds before retry...`)
        await sleep(waitTime)
        continue
      }
      
      if (response.status === 403) {
        throw new Error('Profile is private or API access denied')
      }
      
      if (!response.ok && response.status !== 500) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      // Add rate limiting delay for successful requests
      await sleep(CONFIG.RATE_LIMIT_DELAY)
      return response
      
    } catch (error) {
      if (attempt === retries) {
        throw error
      }
      console.log(`⚠️  Request failed, retrying in ${CONFIG.RETRY_DELAY * attempt / 1000} seconds...`)
      await sleep(CONFIG.RETRY_DELAY * attempt)
    }
  }
  
  throw new Error('Max retries exceeded')
}
