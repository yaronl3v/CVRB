import { useState, useEffect } from 'react'
import { BarChart3, RefreshCw, Users, CheckCircle, XCircle, Info } from 'lucide-react'
import { apiService } from '../services/api'
import DetailedResultsVisualization from './DetailedResultsVisualization'

function ResultsTab({ setFilter, onSetFilterChange, onNavigateToTab }) {
  const [solverStats, setSolverStats] = useState([])
  const [detailedStats, setDetailedStats] = useState({})
  const [creatorStats, setCreatorStats] = useState({ passed: [], failed: [] })
  const [loading, setLoading] = useState(true)
  const [creatorLoading, setCreatorLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creatorError, setCreatorError] = useState(null)

  const isAdmin = import.meta.env.VITE_ADMIN_API_KEY && import.meta.env.VITE_ROLE === 'admin'

  useEffect(() => {
    fetchSolverStats()
    fetchCreatorStats()
  }, [setFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSolverStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = setFilter === 'all' ? {} : { set: parseInt(setFilter) }
      const response = await apiService.getSolverStats(params)
      // The data is directly in response.data (axios unwraps the response)
      setSolverStats(response.data || [])
      // Also capture detailed stats for the new visualization
      setDetailedStats(response.detailedStats || {})
    } catch (err) {
      setError('Failed to fetch solver statistics')
      console.error('Error fetching solver stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCreatorStats = async () => {
    try {
      setCreatorLoading(true)
      setCreatorError(null)
      const params = setFilter === 'all' ? {} : { set: parseInt(setFilter) }
      const response = await apiService.getCreatorStats(params)
      
      // Response now contains { passed: [], failed: [] }
      setCreatorStats(response.data || { passed: [], failed: [] })
    } catch (err) {
      setCreatorError('Failed to fetch creator statistics')
      console.error('Error fetching creator stats:', err)
    } finally {
      setCreatorLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading solver statistics...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchSolverStats}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* CVRB Leaderboard Header */}
      <div className="max-w-4xl xl:max-w-5xl mx-auto text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">CVRB Leaderboard</h1>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-6 py-4 shadow-sm">
          <p className="text-base text-gray-800 leading-relaxed">
            CVRB measures deep reasoning automatically: models create deterministic "worlds" that are code-simulated, and solutions are code-evaluated — making it an evergreen benchmark.{' '}
            <button
              type="button"
              onClick={() => onNavigateToTab && onNavigateToTab('about')}
              className="underline text-blue-700 hover:text-blue-900"
            >
              Learn more in About
            </button>
            .
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 max-w-4xl xl:max-w-5xl mx-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">Solvers Scores</h2>
              </div>
              {isAdmin && (
                <select
                  value={setFilter}
                  onChange={(e) => onSetFilterChange(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 hover:border-gray-400 focus:outline-none focus:border-blue-500"
                  title="Filter by set"
                >
                  <option value="all">All Sets</option>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <option key={num} value={num}>Set {num}</option>
                  ))}
                </select>
              )}
            </div>
            <button
              onClick={() => {
                fetchSolverStats()
                fetchCreatorStats()
              }}
              disabled={loading || creatorLoading}
              className="px-3 py-1 text-sm text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
              title="Refresh statistics"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Performance ranking across {setFilter === 'all' ? 'all solved worlds' : `Set ${setFilter} worlds`}
          </p>
        </div>
        
        <div className="overflow-x-auto">
          {solverStats.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No solver statistics available yet
            </div>
          ) : (
            <table className="w-full table-auto max-w-none">
              <thead className="bg-gray-50">
                <tr>
                  <th className="pl-6 pr-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                    #
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Model Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-auto">
                    Results
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-auto">
                    % Correct
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-auto">
                    Beats Next
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-auto">
                    95% CI
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {solverStats.map((stats, index) => (
                  <tr key={stats.model} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="pl-6 pr-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900 w-16">
                      {index + 1}
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{stats.model}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stats.correct_answers} / {stats.total_attempts}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {parseFloat(stats.percent_correct).toFixed(1)}%
                        </div>
                        <div className="ml-3 w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.min(parseFloat(stats.percent_correct), 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stats.beats_next_percent === '-' ? '-' : `${parseFloat(stats.beats_next_percent).toFixed(1)}%`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(() => {
                        const attempts = parseInt(stats.total_attempts, 10);
                        if (!attempts) return 'N/A';
                        const percent = parseFloat(stats.percent_correct);
                        const margin = parseFloat(stats.ci_margin);
                        const lower = parseFloat(stats.ci_lower);
                        const upper = parseFloat(stats.ci_upper);
                        return `${percent.toFixed(0)} ± ${margin.toFixed(0)} pp (${lower.toFixed(0)}–${upper.toFixed(0)}%)`;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Creator Statistics Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 max-w-4xl xl:max-w-5xl mx-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">World Creator Performance</h2>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Models capability to create valid worlds {setFilter === 'all' ? 'across all sets' : `in Set ${setFilter}`}
          </p>
        </div>
        
        <div className="overflow-x-auto">
          {creatorLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
              <span className="ml-2 text-gray-600">Loading creator statistics...</span>
            </div>
          ) : creatorError ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{creatorError}</p>
              <button
                onClick={fetchCreatorStats}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (creatorStats.passed.length === 0 && creatorStats.failed.length === 0) ? (
            <div className="text-center py-8 text-gray-500">
              No creator statistics available yet
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 max-w-3xl mx-auto">
              {/* Pass Column */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center mb-4">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-green-800">Pass</h3>
                  <Info 
                    className="w-4 h-4 text-green-500 ml-2 cursor-help" 
                    title="These models successfully created consistent worlds and passed validation"
                  />
                  <span className="ml-2 text-sm text-green-600 bg-green-100 px-2 py-1 rounded">
                    {creatorStats.passed.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {creatorStats.passed.length > 0 ? (
                    creatorStats.passed.map((model) => (
                      <div 
                        key={model} 
                        className="text-sm text-green-700 bg-green-100 rounded px-3 py-2 border border-green-200"
                      >
                        {model}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-green-600 italic">No models have passed yet</div>
                  )}
                </div>
              </div>

              {/* Fail Column */}
              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center mb-4">
                  <XCircle className="w-5 h-5 text-red-600 mr-2" />
                  <h3 className="text-lg font-semibold text-red-800">Fail</h3>
                  <Info 
                    className="w-4 h-4 text-red-500 ml-2 cursor-help" 
                    title="These models failed to create consistent worlds, failed validation, failed to produce JSON structured responses, or didn't respond at all"
                  />
                  <span className="ml-2 text-sm text-red-600 bg-red-100 px-2 py-1 rounded">
                    {creatorStats.failed.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {creatorStats.failed.length > 0 ? (
                    creatorStats.failed.map((model) => (
                      <div 
                        key={model} 
                        className="text-sm text-red-700 bg-red-100 rounded px-3 py-2 border border-red-200"
                      >
                        {model}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-red-600 italic">All models have passed</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Performance Matrix */}
      <DetailedResultsVisualization 
        detailedStats={detailedStats} 
        setFilter={setFilter}
      />
    </div>
  )
}

export default ResultsTab