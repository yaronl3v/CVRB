import { useState, useEffect } from 'react'
import { Loader2, Brain, Trophy, Target, AlertCircle } from 'lucide-react'
import { worldsAPI } from '../services/api'

function SolversList({ selectedWorld, selectedSolution, onSolutionSelect }) {
  const [solutions, setSolutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (selectedWorld) {
      fetchSolutions()
    }
  }, [selectedWorld])

  // Auto-select first solution when solutions are loaded and no solution is selected
  useEffect(() => {
    if (solutions.length > 0 && !selectedSolution) {
      onSolutionSelect(solutions[0])
    }
  }, [solutions, selectedSolution, onSolutionSelect])

  // Clear solution selection when CVRB changes
  useEffect(() => {
    if (selectedSolution && selectedSolution.world_id !== selectedWorld?.id) {
      onSolutionSelect(null)
    }
  }, [selectedWorld, selectedSolution, onSolutionSelect])

  const fetchSolutions = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await worldsAPI.getWorldSolutions(selectedWorld.id)
      setSolutions(data.data || [])
    } catch (err) {
      setError('Failed to fetch solutions')
      console.error('Error fetching solutions:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getScoreColor = (score, maxScore = 100) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    if (percentage >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getModelDisplayName = (model) => {
    // Clean up model names for better display
    return model.replace(/google\/|anthropic\/|openai\//, '').replace(/-/g, ' ')
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-600">Loading solutions...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center h-64 flex items-center justify-center">
          <div>
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">{error}</p>
            <button 
              onClick={fetchSolutions}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Solvers</h2>
          <span className="text-sm text-gray-500">({solutions.length})</span>
        </div>
        {selectedWorld && (
          <p className="text-sm text-gray-600 mt-1">
            Solutions for: <span className="font-medium">{selectedWorld.world_name || 'Unnamed World'}</span> #{selectedWorld.id}
          </p>
        )}
      </div>
      
      <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
        {solutions.length === 0 ? (
          <div className="p-8 text-center">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No solutions found for this world</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {solutions.map((solution) => (
              <div
                key={solution.id}
                onClick={() => onSolutionSelect(solution)}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedSolution?.id === solution.id 
                    ? 'bg-blue-100 border-l-4 border-blue-600 shadow-md' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <Brain className="w-4 h-4 text-gray-500" />
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {getModelDisplayName(solution.model)}
                      </h3>
                    </div>
                    
                    <div className="flex items-center space-x-4 mb-2">
                      <div className="flex items-center space-x-1">
                        <Trophy className="w-3 h-3 text-gray-400" />
                        <span className={`text-sm font-semibold ${getScoreColor(solution.score || 0)}`}>
                          {solution.score || 0}%
                        </span>
                        {solution.results?.total_questions && (
                          <span className="text-xs text-gray-500">
                            ({solution.results.total_correct_answers || 0}/{solution.results.total_questions})
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      {formatDate(solution.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SolversList