import type { GameRecommendation } from './types.js'

export async function displayRecommendations(recommendations: GameRecommendation[]): Promise<void> {
  if (recommendations.length === 0) {
    console.log("😕 No recommendations found. This could be because:")
    console.log("   • Your friends' profiles are private")
    console.log("   • You already own all popular games among your friends")
    console.log("   • You have no friends added")
    return
  }

  console.log(`\n🏆 Top ${recommendations.length} Game Recommendations:\n`)

  recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec.name}`)
    console.log(`   📊 Score: ${rec.score.toFixed(1)}`)
    console.log(`   👥 Owned by ${rec.friendsWhoOwn.length} friend(s)`)
    console.log(`   🔥 Recently played by ${rec.friendsWhoPlayedRecently.length} friend(s)`)
    console.log(`   ⏱️  Average playtime: ${rec.averagePlaytime} hours`)
    console.log(`   🆔 Steam ID: ${rec.appid}`)
    console.log(`   🔗 Store: https://store.steampowered.com/app/${rec.appid}`)
    console.log("")
  })

  console.log("💡 Higher scores indicate games that are:")
  console.log("   • Owned by more of your friends")
  console.log("   • Currently being played by your friends")
  console.log("   • Have high average playtime (indicating quality)")
}
