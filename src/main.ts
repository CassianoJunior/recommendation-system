import { clearCache } from './cache.js'
import { getGameRecommendations } from './recommender.js'
import { displayRecommendations } from './display.js'

// Check for command line arguments
const args = process.argv.slice(2)
if (args.includes('--clear-cache')) {
  clearCache()
  process.exit(0)
}

async function main(): Promise<void> {
  try {
    console.log("🎯 Steam Game Recommendation System")
    console.log("====================================\n")

    const recommendations = await getGameRecommendations()
    await displayRecommendations(recommendations)

  } catch (error) {
    console.error("❌ Error getting recommendations:", error)
    process.exit(1)
  }
}

// Run the recommendation system
main()
