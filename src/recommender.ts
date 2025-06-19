import { CONFIG } from './config.js'
import { saveCache, loadCache } from './cache.js'
import { getFriendsList, getOwnedGames, getRecentlyPlayedGames } from './steamApi.js'
import type { GameRecommendation, Game, Friend } from './types.js'

type BatchResult = {
  successfulFriends: number
  skippedFriends: number
  rateLimitHit: boolean
  shouldContinue: boolean
}

async function processFriendsBatch(
  friends: Friend[],
  batchIndex: number,
  processedFriends: Map<string, { ownedGames: Game[], recentGames: Game[] }>,
  myGames: Game[]
): Promise<BatchResult> {
  const startIndex = batchIndex * CONFIG.BATCH_SIZE
  const endIndex = Math.min(startIndex + CONFIG.BATCH_SIZE, friends.length)
  const batchFriends = friends.slice(startIndex, endIndex)
  
  console.log(`\n📦 Processing batch ${batchIndex + 1} (friends ${startIndex + 1}-${endIndex})`)
  
  let successfulFriends = 0
  let skippedFriends = 0
  let rateLimitHit = false

  for (let i = 0; i < batchFriends.length; i++) {
    const friend = batchFriends[i]
    const globalIndex = startIndex + i + 1
    
    // Check if we have cached data for this friend
    if (processedFriends.has(friend.steamid)) {
      console.log(`📋 Using cached data for friend ${globalIndex}/${friends.length}`)
      successfulFriends++
      continue
    }

    console.log(`📊 Processing friend ${globalIndex}/${friends.length} (${friend.steamid})...`)

    try {
      // Get friend's owned games
      const friendOwnedGames = await getOwnedGames(friend.steamid)
      
      // Get friend's recently played games
      const friendRecentGames = await getRecentlyPlayedGames(friend.steamid)

      // Cache the results
      processedFriends.set(friend.steamid, {
        ownedGames: friendOwnedGames,
        recentGames: friendRecentGames
      })

      successfulFriends++
      console.log(`✅ Successfully processed friend ${globalIndex}`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Check if this is a rate limit error
      if (errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('Too Many Requests')) {
        console.log(`🚫 Rate limit hit on friend ${friend.steamid}. Stopping batch processing.`)
        rateLimitHit = true
        break
      }
      
      skippedFriends++
      console.log(`⚠️  Could not get data for friend ${friend.steamid}: ${errorMessage}`)
      
      // If we're getting too many errors in this batch, stop the batch
      if (skippedFriends > CONFIG.MAX_FAILED_REQUESTS) {
        console.log(`🛑 Too many failed requests in batch ${batchIndex + 1}. Stopping batch.`)
        break
      }
    }
  }

  // Save progress after each batch
  saveCache({
    timestamp: Date.now(),
    myGames,
    friendsData: processedFriends
  })

  const batchSuccessRate = successfulFriends / (successfulFriends + skippedFriends)
  const shouldContinue = !rateLimitHit && batchSuccessRate > 0.5 && skippedFriends <= CONFIG.MAX_FAILED_REQUESTS

  console.log(`📊 Batch ${batchIndex + 1} completed: ${successfulFriends} successful, ${skippedFriends} failed`)
  
  if (rateLimitHit) {
    console.log("⏳ Rate limit detected. Will not process more batches to avoid further restrictions.")
  } else if (!shouldContinue) {
    console.log("🛑 Low success rate in batch. Stopping to avoid further issues.")
  }

  return {
    successfulFriends,
    skippedFriends,
    rateLimitHit,
    shouldContinue
  }
}

export async function getGameRecommendations(): Promise<GameRecommendation[]> {
  console.log("🔍 Getting your friends list...")
  const friends = await getFriendsList()
  
  if (!friends || friends.length === 0) {
    console.log("❌ No friends found or friends list is private")
    return []
  }

  console.log(`👥 Found ${friends.length} friends`)

  // Try to load cached data first
  let cache = loadCache()
  let myGames: Game[]
  let processedFriends = new Map<string, { ownedGames: Game[], recentGames: Game[] }>()

  if (cache) {
    myGames = cache.myGames
    processedFriends = cache.friendsData
    console.log(`📂 Using cached data for ${processedFriends.size} friends`)
  } else {
    // Get your owned games to exclude from recommendations
    console.log("🎮 Getting your owned games...")
    myGames = await getOwnedGames()
    processedFriends = new Map()
  }

  const myGameIds = new Set(myGames.map(game => game.appid))
  console.log(`📚 You own ${myGames.length} games`)

  // Calculate number of batches needed
  const totalBatches = Math.ceil(friends.length / CONFIG.BATCH_SIZE)
  console.log(`📦 Will process ${friends.length} friends in ${totalBatches} batches of ${CONFIG.BATCH_SIZE}`)

  // Get all friends' games using batch processing
  console.log("🔄 Analyzing friends' games in batches...")
  const gameData = new Map<number, {
    game: Game,
    friendsWhoOwn: string[],
    friendsWhoPlayedRecently: string[],
    totalPlaytime: number
  }>()

  let totalSuccessfulFriends = 0
  let totalSkippedFriends = 0
  let consecutiveFailedBatches = 0

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    try {
      const batchResult = await processFriendsBatch(
        friends, 
        batchIndex, 
        processedFriends, 
        myGames
      )

      totalSuccessfulFriends += batchResult.successfulFriends
      totalSkippedFriends += batchResult.skippedFriends

      // Reset consecutive failures if this batch was successful
      if (batchResult.successfulFriends > 0) {
        consecutiveFailedBatches = 0
      } else {
        consecutiveFailedBatches++
      }

      // Stop processing if rate limit hit or too many consecutive failures
      if (batchResult.rateLimitHit) {
        console.log("🚫 Rate limit detected. Stopping batch processing to avoid further restrictions.")
        break
      }

      if (!batchResult.shouldContinue) {
        console.log("⚠️  Batch processing stopped due to low success rate.")
        break
      }

      if (consecutiveFailedBatches >= CONFIG.MAX_CONSECUTIVE_FAILURES) {
        console.log(`🛑 ${CONFIG.MAX_CONSECUTIVE_FAILURES} consecutive failed batches. Stopping processing.`)
        break
      }

      // Only continue if PROCESS_ALL_FRIENDS is true
      if (!CONFIG.PROCESS_ALL_FRIENDS && batchIndex === 0) {
        console.log("🎯 Processing only first batch as configured.")
        break
      }

      // Add a longer delay between batches to be more respectful to API limits
      if (batchIndex < totalBatches - 1) {
        console.log("⏳ Waiting 3 seconds before next batch...")
        await new Promise(resolve => setTimeout(resolve, 3000))
      }

    } catch (error) {
      console.log(`❌ Error processing batch ${batchIndex + 1}:`, error)
      consecutiveFailedBatches++
      
      if (consecutiveFailedBatches >= CONFIG.MAX_CONSECUTIVE_FAILURES) {
        console.log("🛑 Too many consecutive batch failures. Stopping.")
        break
      }
    }
  }

  // Process all collected friend data to build game recommendations
  console.log(`\n📊 Processing game data from ${processedFriends.size} friends...`)
  
  for (const [steamId, friendData] of processedFriends.entries()) {
    const { ownedGames, recentGames } = friendData
    const recentGameIds = new Set(recentGames.map(game => game.appid))

    for (const game of ownedGames) {
      if (myGameIds.has(game.appid)) continue // Skip games you already own

      if (!gameData.has(game.appid)) {
        gameData.set(game.appid, {
          game,
          friendsWhoOwn: [],
          friendsWhoPlayedRecently: [],
          totalPlaytime: 0
        })
      }

      const data = gameData.get(game.appid)!
      data.friendsWhoOwn.push(steamId)
      data.totalPlaytime += game.playtime_forever

      // Check if this game was played recently by this friend
      if (recentGameIds.has(game.appid)) {
        data.friendsWhoPlayedRecently.push(steamId)
      }
    }
  }

  // Save final cache
  saveCache({
    timestamp: Date.now(),
    myGames,
    friendsData: processedFriends
  })

  console.log(`📈 Final results: ${totalSuccessfulFriends} friends processed successfully, ${totalSkippedFriends} failed`)
  console.log("🧮 Calculating recommendation scores...")

  // Calculate recommendations with scoring
  const recommendations: GameRecommendation[] = []
  
  for (const [appid, data] of gameData.entries()) {
    // Prioritize games you don't own: skip if you own it
    if (myGameIds.has(appid)) continue
    const friendsOwning = data.friendsWhoOwn.length
    const friendsPlayingRecently = data.friendsWhoPlayedRecently.length
    const averagePlaytime = data.totalPlaytime / friendsOwning

    // Scoring algorithm:
    // - Base score from number of friends who own it
    // - Bonus for friends who played recently (indicates current popularity)
    // - Bonus for higher average playtime (indicates quality/engagement)
    let score = friendsOwning * 10 // Base popularity score
    score += friendsPlayingRecently * 20 // Recent activity bonus
    score += Math.min(averagePlaytime / 60, 50) // Playtime bonus (capped at 50 hours)

    recommendations.push({
      appid,
      name: data.game.name || `Game ${appid}`,
      score,
      friendsWhoOwn: data.friendsWhoOwn,
      friendsWhoPlayedRecently: data.friendsWhoPlayedRecently,
      averagePlaytime: Math.round(averagePlaytime / 60) // Convert to hours
    })
  }

  // Sort by score (highest first) and return top recommendations
  return recommendations
    .sort((a, b) => b.score - a.score).filter((rec) => myGameIds.has(rec.appid) === false) // Exclude games you own
    .slice(0, 20) // Top 20 recommendations
}
