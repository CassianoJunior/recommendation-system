import { CONFIG } from './config.js'
import { saveCache, loadCache } from './cache.js'
import { getFriendsList, getOwnedGames, getRecentlyPlayedGames } from './steamApi.js'
import type { GameRecommendation, Game } from './types.js'

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

  // Limit number of friends to process to avoid hitting rate limits
  const MAX_FRIENDS_TO_PROCESS = CONFIG.MAX_FRIENDS_TO_PROCESS
  const friendsToProcess = friends.slice(0, MAX_FRIENDS_TO_PROCESS)
  
  if (friends.length > MAX_FRIENDS_TO_PROCESS) {
    console.log(`🎯 Processing first ${MAX_FRIENDS_TO_PROCESS} friends to avoid rate limits`)
  }

  // Get all friends' games
  console.log("🔄 Analyzing friends' games...")
  const gameData = new Map<number, {
    game: Game,
    friendsWhoOwn: string[],
    friendsWhoPlayedRecently: string[],
    totalPlaytime: number
  }>()

  let successfulFriends = 0
  let skippedFriends = 0

  for (let i = 0; i < friendsToProcess.length; i++) {
    const friend = friendsToProcess[i]
    
    let friendOwnedGames: Game[]
    let friendRecentGames: Game[]

    // Check if we have cached data for this friend
    if (processedFriends.has(friend.steamid)) {
      const cachedData = processedFriends.get(friend.steamid)!
      friendOwnedGames = cachedData.ownedGames
      friendRecentGames = cachedData.recentGames
      console.log(`📋 Using cached data for friend ${i + 1}/${friendsToProcess.length}`)
      successfulFriends++
    } else {
      console.log(`📊 Processing friend ${i + 1}/${friendsToProcess.length} (${friend.steamid})...`)

      try {
        // Get friend's owned games
        friendOwnedGames = await getOwnedGames(friend.steamid)
        
        // Get friend's recently played games
        friendRecentGames = await getRecentlyPlayedGames(friend.steamid)

        // Cache the results
        processedFriends.set(friend.steamid, {
          ownedGames: friendOwnedGames,
          recentGames: friendRecentGames
        })

        // Save progress every 5 friends
        if ((successfulFriends + 1) % 5 === 0) {
          saveCache({
            timestamp: Date.now(),
            myGames,
            friendsData: processedFriends
          })
        }

        successfulFriends++
        console.log(`✅ Successfully processed friend ${successfulFriends}`)

      } catch (error) {
        skippedFriends++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.log(`⚠️  Could not get data for friend ${friend.steamid}: ${errorMessage}`)
        
        // If we're getting too many errors, stop processing
        if (skippedFriends > CONFIG.MAX_FAILED_REQUESTS) {
          console.log("🛑 Too many failed requests. Stopping to avoid further rate limiting.")
          break
        }
        continue
      }
    }

    // Process the friend's games (whether from cache or fresh API call)
    const recentGameIds = new Set(friendRecentGames.map(game => game.appid))

    for (const game of friendOwnedGames) {
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
      data.friendsWhoOwn.push(friend.steamid)
      data.totalPlaytime += game.playtime_forever

      // Check if this game was played recently by this friend
      if (recentGameIds.has(game.appid)) {
        data.friendsWhoPlayedRecently.push(friend.steamid)
      }
    }
  }

  // Save final cache
  saveCache({
    timestamp: Date.now(),
    myGames,
    friendsData: processedFriends
  })

  console.log(`📈 Successfully processed ${successfulFriends} friends, skipped ${skippedFriends}`)
  console.log("🧮 Calculating recommendation scores...")

  // Calculate recommendations with scoring
  const recommendations: GameRecommendation[] = []
  
  for (const [appid, data] of gameData.entries()) {
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
    .sort((a, b) => b.score - a.score)
    .slice(0, 20) // Top 20 recommendations
}
