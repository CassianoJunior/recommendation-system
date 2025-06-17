import { STEAM_API_KEY, STEAM_ID } from './config.js'
import { fetchWithRetry } from './utils.js'
import type { Friend, Game, OwnedGamesResponse, RecentlyPlayedGamesResponse } from './types.js'

export async function getFriendsList(): Promise<Friend[]> {
  const url = `https://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=${STEAM_API_KEY}&steamid=${STEAM_ID}&relationship=friend`

  const response = await fetchWithRetry(url)
  if (!response.ok) {
    throw new Error(`Failed to get friends list: ${response.status}`)
  }
  
  const data = await response.json() as { friendslist: { friends: Friend[] } }
  return data?.friendslist?.friends || []
}

export async function getOwnedGames(steamId: string = STEAM_ID!): Promise<Game[]> {
  const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamId}&include_appinfo=1&format=json`

  const response = await fetchWithRetry(url)
  if (!response.ok) {
    throw new Error(`Failed to get owned games for ${steamId}: ${response.status}`)
  }
  
  const data = await response.json() as OwnedGamesResponse
  return data?.response?.games || []
}

export async function getRecentlyPlayedGames(steamId: string = STEAM_ID!): Promise<Game[]> {
  const url = `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamId}&format=json`

  const response = await fetchWithRetry(url)
  if (!response.ok) {
    throw new Error(`Failed to get recently played games for ${steamId}: ${response.status}`)
  }
  
  const data = await response.json() as RecentlyPlayedGamesResponse
  return data?.response?.games || []
}
