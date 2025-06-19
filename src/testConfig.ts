export const TEST_CONFIG = {
  RATE_LIMIT_DELAY: 1000,        // Delay between requests (ms)
  MAX_RETRIES: 3,                // Max retry attempts for failed requests
  RETRY_DELAY: 5000,             // Base delay for retries (ms)
  BATCH_SIZE: 5,                 // Smaller batches for testing
  MAX_FAILED_REQUESTS: 3,        // Lower threshold for testing
  MAX_CONSECUTIVE_FAILURES: 2,   // Stop earlier for testing
  REQUEST_TIMEOUT: 30000,        // Request timeout (ms)
  PROCESS_ALL_FRIENDS: false     // Only process first batch for testing
}

// Uncomment the line below to use test configuration
// export { TEST_CONFIG as CONFIG } from './testConfig.js'
