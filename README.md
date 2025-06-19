# Steam Game Recommendation System

A TypeScript-based recommendation system that analyzes your Steam friends' game libraries to suggest new games you might enjoy.

## Project Structure

```
src/
├── main.ts          # Entry point and CLI interface
├── types.ts         # TypeScript type definitions
├── config.ts        # Configuration and environment variables
├── steamApi.ts      # Steam Web API client functions
├── recommender.ts   # Core recommendation algorithm
├── display.ts       # Output formatting and display
├── cache.ts         # Caching system for performance
├── utils.ts         # Utility functions (rate limiting, etc.)
└── index.ts         # Library exports
```

## Features

- 🎮 Analyzes games owned by your Steam friends
- 🔥 Considers recently played games for trending recommendations
- 📊 Scores games based on popularity, recent activity, and average playtime
- 🚫 Excludes games you already own
- 🏆 Provides top 20 recommendations with detailed information
- ⚡ Advanced rate limiting to avoid Steam API 429 errors
- 💾 Caching system to save progress and resume interrupted runs
- 🔄 Automatic retry with exponential backoff for failed requests

## Setup

1. **Get your Steam API Key**
   - Go to [Steam Web API Key page](https://steamcommunity.com/dev/apikey)
   - Sign in with your Steam account
   - Enter a domain name (can be anything like "localhost")
   - Copy your API key

2. **Find your Steam ID**
   - Go to your Steam profile
   - Copy the number from the URL (e.g., `76561198xxxxx`)
   - Or use [SteamID.io](https://steamid.io/) to convert your username

3. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Steam API key and Steam ID:
   ```
   STEAM_API_KEY=your_api_key_here
   STEAM_ID=your_steam_id_here
   ```

4. **Install Dependencies**
   ```bash
   pnpm install
   ```

## Usage

### Development Mode
```bash
pnpm run recommend
```

### Production Build
```bash
# Build the project
pnpm run build

# Run the built version
pnpm run start
```

### Clear Cache
```bash
pnpm run clear-cache
```

### Library Usage
You can also import and use the functions in your own code:

```typescript
import { getGameRecommendations, displayRecommendations } from './src/index.js'

const recommendations = await getGameRecommendations()
await displayRecommendations(recommendations)
```

## How It Works

The recommendation algorithm considers:

1. **Friendship Network**: Analyzes games owned by your Steam friends
2. **Popularity Score**: Games owned by more friends get higher scores
3. **Recent Activity Bonus**: Games currently being played by friends get bonus points
4. **Quality Indicator**: Games with higher average playtime among friends get bonus points
5. **Ownership Filter**: Excludes games you already own

### Scoring Formula
- Base score: 10 points per friend who owns the game
- Recent activity bonus: 20 points per friend who played recently
- Playtime bonus: Up to 50 points based on average playtime (capped at 50 hours)

## Limitations

- Friends' profiles must be public to access their game data
- Steam API has rate limits, so the process may take time with many friends
- Some games might not have complete metadata

## Output

The system provides:
- Game name and Steam store link
- Recommendation score
- Number of friends who own the game
- Number of friends who played recently
- Average playtime among friends
- Steam app ID for reference

## Privacy Notes

This tool only accesses publicly available Steam data through the official Steam Web API. No personal data is stored or transmitted beyond what's necessary for the API calls.

## Advanced Usage

### Configuration
You can adjust rate limiting and processing limits by modifying the `CONFIG` object in `src/config.ts`:

```typescript
const CONFIG = {
  RATE_LIMIT_DELAY: 1000,        // Delay between requests (ms)
  MAX_RETRIES: 3,                // Max retry attempts for failed requests
  RETRY_DELAY: 5000,             // Base delay for retries (ms)
  BATCH_SIZE: 20,                // Number of friends to process per batch
  MAX_FAILED_REQUESTS: 5,        // Stop processing if too many failures in a batch
  MAX_CONSECUTIVE_FAILURES: 3,   // Stop if this many consecutive batches fail
  REQUEST_TIMEOUT: 30000,        // Request timeout (ms)
  PROCESS_ALL_FRIENDS: true      // Whether to process all friends or limit to first batch
};
```

### Rate Limiting Strategy

The system implements several strategies to avoid 429 errors:

1. **Batch Processing**: Processes friends in batches of 20 (configurable)
2. **Request Delays**: 1-second delay between API calls
3. **Exponential Backoff**: Increasing delays for retries
4. **Batch-level Rate Limit Detection**: Stops processing if rate limits are hit
5. **Inter-batch Delays**: 3-second delays between batches
6. **Error Threshold**: Stops after consecutive failed batches
7. **Caching**: Saves progress to avoid re-processing
8. **Retry Logic**: Automatic retries with proper error handling
9. **Smart Continuation**: Only continues to next batch if no rate limits detected
