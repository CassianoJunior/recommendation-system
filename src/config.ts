export const CONFIG = {
  RATE_LIMIT_DELAY: 2000,        // Delay between requests (ms)
  MAX_RETRIES: 3,                // Max retry attempts for failed requests
  RETRY_DELAY: 7000,             // Base delay for retries (ms)
  BATCH_SIZE: 5,                 // Number of friends to process per batch
  MAX_FAILED_REQUESTS: 5,        // Stop processing if too many failures in a batch
  MAX_CONSECUTIVE_FAILURES: 3,   // Stop if this many consecutive batches fail
  REQUEST_TIMEOUT: 30000,        // Request timeout (ms)
  PROCESS_ALL_FRIENDS: true      // Whether to process all friends or limit to first batch
}

export const STEAM_API_KEY = process.env.STEAM_API_KEY
export const STEAM_ID = process.env.STEAM_ID

if (!STEAM_API_KEY || !STEAM_ID) {
  throw new Error("STEAM_API_KEY or STEAM_ID are not set in the environment variables.")
}
