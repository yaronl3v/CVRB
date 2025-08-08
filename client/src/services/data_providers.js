/**
 * Data Providers - Future implementation for switching between HTTP and local storage
 * This file shows the structure for future local storage implementation
 */

import { httpService } from './http.js'

/**
 * Future LocalStorageService implementation
 * This will implement the same interface as HttpService but use local storage
 */
class LocalStorageService {
  
  async getWorlds(params = {}) {
    // Future: implement local storage logic
    const stored = localStorage.getItem('worlds')
    if (stored) {
      let worlds = JSON.parse(stored)
      // Apply filtering logic based on params
      return { data: worlds }
    }
    return { data: [] }
  }

  async getWorldsByCreator(creator) {
    // Future: implement local storage logic for creator filter
    throw new Error('LocalStorageService not yet implemented')
  }

  async getValidWorlds() {
    // Future: implement local storage logic for valid worlds
    throw new Error('LocalStorageService not yet implemented')
  }

  async getRecentWorlds(limit = 10) {
    // Future: implement local storage logic for recent worlds
    throw new Error('LocalStorageService not yet implemented')
  }

  async getWorldSolutions(worldId) {
    // Future: implement local storage logic for solutions
    throw new Error('LocalStorageService not yet implemented')
  }

  async deleteWorld(worldId) {
    // Future: implement local storage logic for deletion
    throw new Error('LocalStorageService not yet implemented')
  }

  async updateWorldSet(worldId, setNumber) {
    // Future: implement local storage logic for updates
    throw new Error('LocalStorageService not yet implemented')
  }
}

/**
 * Data provider factory
 * Future: can be configured to return different providers based on settings
 */
export const getDataProvider = (type = 'http') => {
  switch (type) {
    case 'local':
      return new LocalStorageService()
    case 'http':
    default:
      return httpService
  }
}

// Future configuration example:
// export const dataConfig = {
//   useLocalStorage: false, // Toggle between local and HTTP
//   syncWithServer: true,   // Whether to sync local data with server
//   offlineMode: false      // Whether to work offline
// }

export default httpService