export type Friend = {
  steamid: string
  relationship: string
  friend_since: number
}

export type Game = {
  appid: number
  name: string
  playtime_forever: number
  playtime_2weeks?: number
}

export type OwnedGamesResponse = {
  response: {
    game_count: number
    games: Game[]
  }
}

export type RecentlyPlayedGamesResponse = {
  response: {
    total_count: number
    games: Game[]
  }
}

export type GameRecommendation = {
  appid: number
  name: string
  score: number
  friendsWhoOwn: string[]
  friendsWhoPlayedRecently: string[]
  averagePlaytime: number
}

export type FriendDataCache = {
  timestamp: number
  myGames: Game[]
  friendsData: Map<string, {
    ownedGames: Game[]
    recentGames: Game[]
  }>
}
