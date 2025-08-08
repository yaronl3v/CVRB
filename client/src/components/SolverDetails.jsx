import { useState } from 'react'
import { Brain, Trophy, Target, CheckCircle, XCircle, BarChart3, ChevronDown, ChevronRight, Copy } from 'lucide-react'

function SolverDetails({ solution, selectedWorld }) {
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    breakdown: true,
    responses: false
  })

  if (!solution) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Solution</h3>
          <p className="text-gray-500">Choose a solver from the list to view its solution details.</p>
        </div>
      </div>
    )
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  const getCorrectAnswer = (questionId, world) => {
    if (!world?.world_info?.questions) {
      return null
    }
    const question = world.world_info.questions.find(q => q.id === questionId)
    return question ? question.answer : null
  }

  const getModelDisplayName = (model) => {
    return model.replace(/google\/|anthropic\/|openai\//, '').replace(/-/g, ' ')
  }

  const getScoreColor = (score, maxScore = 100) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    if (percentage >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const results = solution.results || {}
  const breakdown = results.breakdown || {}

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
              <Brain className="w-6 h-6 text-primary-600" />
              <span>{getModelDisplayName(solution.model)}</span>
            </h2>
            <div className="flex items-center space-x-4 mt-2">
              <span className="text-sm text-gray-600">
                World: <span className="font-medium">{selectedWorld?.world_name || 'Unknown'}</span>
              </span>
              <span className="text-sm text-gray-600">
                Solved: <span className="font-medium">{formatDate(solution.createdAt)}</span>
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            ID: {solution.id}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
        
        {/* Overview Stats */}
        <div>
          <button
            onClick={() => toggleSection('overview')}
            className="flex items-center space-x-2 text-lg font-medium text-gray-900 mb-4 hover:text-primary-600"
          >
            {expandedSections.overview ? 
              <ChevronDown className="w-5 h-5" /> : 
              <ChevronRight className="w-5 h-5" />
            }
            <BarChart3 className="w-5 h-5" />
            <span>Performance Overview</span>
          </button>
          
          {expandedSections.overview && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Total Score</span>
                </div>
                <p className={`text-2xl font-bold mt-1 ${getScoreColor(solution.score || 0)}`}>
                  {solution.score || 0}
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Correct</span>
                </div>
                <p className="text-2xl font-bold text-green-700 mt-1">
                  {results.total_correct_answers || 0}
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-900">Errors</span>
                </div>
                <p className="text-2xl font-bold text-red-700 mt-1">
                  {results.error_count || 0}
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Accuracy</span>
                </div>
                <p className="text-2xl font-bold text-purple-700 mt-1">
                  {results.score_percentage || 0}%
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Question Breakdown */}
        {Object.keys(breakdown).length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('breakdown')}
              className="flex items-center space-x-2 text-lg font-medium text-gray-900 mb-4 hover:text-primary-600"
            >
              {expandedSections.breakdown ? 
                <ChevronDown className="w-5 h-5" /> : 
                <ChevronRight className="w-5 h-5" />
              }
              <Target className="w-5 h-5" />
              <span>Question Breakdown</span>
            </button>
            
            {expandedSections.breakdown && (
              <div className="space-y-3">
                {Object.entries(breakdown).map(([question, isCorrect]) => {
                  const responseData = solution.raw_responses?.[question] || {}
                  const modelAnswer = typeof responseData === 'object' ? responseData.answer : responseData
                  const explanation = typeof responseData === 'object' ? responseData.explanation : null
                  const correctAnswer = getCorrectAnswer(question, selectedWorld)
                  return (
                    <div key={question} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          <span className="font-medium text-gray-900 capitalize">
                            {question.replace(/q(\d+)/, 'Question $1')}
                          </span>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <div className="flex items-center space-x-3">
                            <span className={`font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                              {isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
                              Answer: {typeof modelAnswer === 'object' && modelAnswer !== null ? JSON.stringify(modelAnswer) : String(modelAnswer || '')}
                              {correctAnswer !== null && (
                                <span className="text-green-700 font-semibold ml-1">({typeof correctAnswer === 'object' && correctAnswer !== null ? JSON.stringify(correctAnswer) : String(correctAnswer)})</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {explanation && (
                        <div className="text-sm text-gray-700 mt-3 p-3 bg-white rounded border-l-4 border-blue-300">
                          <span className="font-medium text-gray-800">Explanation:</span>
                          <p className="mt-2 text-gray-700 leading-relaxed">{typeof explanation === 'object' && explanation !== null ? JSON.stringify(explanation) : String(explanation || '')}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Raw Responses */}
        {solution.raw_responses && Object.keys(solution.raw_responses).length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('responses')}
              className="flex items-center space-x-2 text-lg font-medium text-gray-900 mb-4 hover:text-primary-600"
            >
              {expandedSections.responses ? 
                <ChevronDown className="w-5 h-5" /> : 
                <ChevronRight className="w-5 h-5" />
              }
              <span>Raw Responses</span>
            </button>
            
            {expandedSections.responses && (
              <div className="bg-gray-900 rounded-lg p-4 relative">
                <button
                  onClick={() => copyToClipboard(JSON.stringify(solution.raw_responses, null, 2))}
                  className="absolute top-3 right-3 p-2 text-gray-400 hover:text-white transition-colors"
                  title="Copy responses"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <pre className="text-sm text-gray-100 overflow-x-auto pr-10">
                  <code>{JSON.stringify(solution.raw_responses, null, 2)}</code>
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SolverDetails