import { httpService } from './http.js'

/**
 * Top-level API Layer - provides business logic and caching
 * Future: can switch between HTTP and local storage implementations
 */
class ApiService {
  constructor() {
    // In-memory cache to avoid redundant network calls
    this.solutionsCache = {}
    // Future: this could be switched to use local storage or HTTP based on configuration
    this.dataProvider = httpService
  }

  /**
   * Get all worlds with optional filters
   */
  async getWorlds(params = {}) {
    try {
      const data = await this.dataProvider.getWorlds(params)
      return data
    } catch (error) {
      console.error('Error fetching worlds:', error)
      throw error
    }
  }

  /**
   * Get worlds by creator
   */
  async getWorldsByCreator(creator) {
    try {
      const data = await this.dataProvider.getWorldsByCreator(creator)
      return data
    } catch (error) {
      console.error('Error fetching worlds by creator:', error)
      throw error
    }
  }

  /**
   * Get valid worlds only
   */
  async getValidWorlds() {
    try {
      const data = await this.dataProvider.getValidWorlds()
      return data
    } catch (error) {
      console.error('Error fetching valid worlds:', error)
      throw error
    }
  }

  /**
   * Get recent worlds with limit
   */
  async getRecentWorlds(limit = 10) {
    try {
      const data = await this.dataProvider.getRecentWorlds(limit)
      return data
    } catch (error) {
      console.error('Error fetching recent worlds:', error)
      throw error
    }
  }

  /**
   * Get solutions for a specific CVRB with caching
   */
  async getWorldSolutions(worldId) {
    // Early return from cache if we already have the data
    if (this.solutionsCache[worldId]) {
      return this.solutionsCache[worldId]
    }

    try {
      const data = await this.dataProvider.getWorldSolutions(worldId)
      // Cache the successful response for future calls
      this.solutionsCache[worldId] = data
      return data
    } catch (error) {
      console.error('Error fetching CVRB solutions:', error)
      throw error
    }
  }

  /**
   * Delete a CVRB and all its solutions
   */
  async deleteWorld(worldId) {
    try {
      const data = await this.dataProvider.deleteWorld(worldId)
      // Clear cache for this CVRB's solutions
      delete this.solutionsCache[worldId]
      return data
    } catch (error) {
      console.error('Error deleting CVRB:', error)
      throw error
    }
  }

  /**
   * Update CVRB set number
   */
  async updateWorldSet(worldId, setNumber) {
    try {
      const data = await this.dataProvider.updateWorldSet(worldId, setNumber)
      return data
    } catch (error) {
      console.error('Error updating CVRB set:', error)
      throw error
    }
  }

  /**
   * Get solver statistics aggregated across all worlds
   */
  async getSolverStats(params = {}) {
    try {
      const data = await this.dataProvider.getSolverStats(params)
      return data
    } catch (error) {
      console.error('Error fetching solver stats:', error)
      throw error
    }
  }

  /**
   * Get creator statistics (which models have created valid worlds)
   */
  async getCreatorStats(params = {}) {
    try {
      const data = await this.dataProvider.getCreatorStats(params)
      return data
    } catch (error) {
      console.error('Error fetching creator stats:', error)
      throw error
    }
  }

  /**
   * Clear cache for specific CVRB solutions
   */
  clearSolutionsCache(worldId = null) {
    if (worldId) {
      delete this.solutionsCache[worldId]
    } else {
      this.solutionsCache = {}
    }
  }

  /**
   * Future: switch data provider (HTTP vs local storage)
   */
  setDataProvider(provider) {
    this.dataProvider = provider
  }
}

// Export singleton instance for easy use in components
export const apiService = new ApiService()

// Keep the original worldsAPI export for backward compatibility during transition
export const worldsAPI = {
  getWorlds: (params) => apiService.getWorlds(params),
  getWorldsByCreator: (creator) => apiService.getWorldsByCreator(creator),
  getValidWorlds: () => apiService.getValidWorlds(),
  getRecentWorlds: (limit) => apiService.getRecentWorlds(limit),
  getWorldSolutions: (worldId) => apiService.getWorldSolutions(worldId),
  deleteWorld: (worldId) => apiService.deleteWorld(worldId),
  updateWorldSet: (worldId, setNumber) => apiService.updateWorldSet(worldId, setNumber),
  getSolverStats: (params) => apiService.getSolverStats(params),
  getCreatorStats: (params) => apiService.getCreatorStats(params)
}

export default apiService