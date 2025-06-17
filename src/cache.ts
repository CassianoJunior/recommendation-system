import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import type { FriendDataCache } from './types.js'

const CACHE_FILE = join(process.cwd(), 'friend_data_cache.json')

export function saveCache(cache: FriendDataCache): void {
  try {
    const serializable = {
      ...cache,
      friendsData: Object.fromEntries(cache.friendsData)
    }
    writeFileSync(CACHE_FILE, JSON.stringify(serializable, null, 2))
    console.log('💾 Progress saved to cache')
  } catch (error) {
    console.log('⚠️  Could not save cache:', error)
  }
}

export function loadCache(): FriendDataCache | null {
  try {
    if (!existsSync(CACHE_FILE)) return null
    
    const data = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'))
    const cache: FriendDataCache = {
      ...data,
      friendsData: new Map(Object.entries(data.friendsData))
    }
    
    // Check if cache is still valid (less than 1 hour old)
    const oneHour = 60 * 60 * 1000
    if (Date.now() - cache.timestamp > oneHour) {
      console.log('🗑️  Cache expired, starting fresh')
      return null
    }
    
    console.log('📂 Loaded cached data from previous run')
    return cache
  } catch (error) {
    console.log('⚠️  Could not load cache:', error)
    return null
  }
}

export function clearCache(): void {
  try {
    if (existsSync(CACHE_FILE)) {
      unlinkSync(CACHE_FILE)
      console.log('🗑️  Cache cleared successfully')
    } else {
      console.log('ℹ️  No cache file found')
    }
  } catch (error) {
    console.log('⚠️  Could not clear cache:', error)
  }
}
