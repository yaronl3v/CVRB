import axios from 'axios'

// Create axios instance with base configuration
// Use relative base URL so it works in both dev (proxied by Vite) and prod (served by Node)
const httpClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY

/**
 * HTTP Layer - handles all actual HTTP requests to the server
 * This layer implements the low-level HTTP communication
 */
class HttpService {
  
  /**
   * Get all worlds with optional filters
   */
  async getWorlds(params = {}) {
    const response = await httpClient.get('/worlds', { params })
    return response.data
  }

  /**
   * Get worlds by creator
   */
  async getWorldsByCreator(creator) {
    const response = await httpClient.get('/worlds', { 
      params: { creator } 
    })
    return response.data
  }

  /**
   * Get valid worlds only
   */
  async getValidWorlds() {
    const response = await httpClient.get('/worlds', { 
      params: { valid_only: 'true' } 
    })
    return response.data
  }

  /**
   * Get recent worlds with limit
   */
  async getRecentWorlds(limit = 10) {
    const response = await httpClient.get('/worlds', { 
      params: { limit } 
    })
    return response.data
  }

  /**
   * Get solutions for a specific CVRB
   */
  async getWorldSolutions(worldId) {
    const response = await httpClient.get(`/worlds/${worldId}/solutions`)
    return response.data
  }

  /**
   * Delete a CVRB and all its solutions
   */
  async deleteWorld(worldId) {
    const config = ADMIN_KEY ? { headers: { 'x-admin-key': ADMIN_KEY } } : {}
    const response = await httpClient.delete(`/worlds/${worldId}`, config)
    return response.data
  }

  /**
   * Update CVRB set number
   */
  async updateWorldSet(worldId, setNumber) {
    const config = ADMIN_KEY ? { headers: { 'x-admin-key': ADMIN_KEY } } : {}
    const response = await httpClient.patch(`/worlds/${worldId}/set`, { set: setNumber }, config)
    return response.data
  }

  /**
   * Get solver statistics aggregated across all worlds
   */
  async getSolverStats(params = {}) {
    const response = await httpClient.get('/solver-stats', { params })
    return response.data
  }

  /**
   * Get creator statistics (which models have created valid worlds)
   */
  async getCreatorStats(params = {}) {
    const response = await httpClient.get('/creator-stats', { params })
    return response.data
  }
}

// Export singleton instance
export const httpService = new HttpService()
export default httpService