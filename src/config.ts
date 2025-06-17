export const CONFIG = {
  RATE_LIMIT_DELAY: 1000,        // Delay between requests (ms)
  MAX_RETRIES: 3,                // Max retry attempts for failed requests
  RETRY_DELAY: 5000,             // Base delay for retries (ms)
  MAX_FRIENDS_TO_PROCESS: 20,    // Limit friends to avoid rate limits
  MAX_FAILED_REQUESTS: 5,        // Stop processing if too many failures
  REQUEST_TIMEOUT: 30000         // Request timeout (ms)
}

export const STEAM_API_KEY = process.env.STEAM_API_KEY
export const STEAM_ID = process.env.STEAM_ID

if (!STEAM_API_KEY || !STEAM_ID) {
  throw new Error("STEAM_API_KEY or STEAM_ID are not set in the environment variables.")
}
