import { useState, useMemo } from 'react'
import { BarChart, Table, TrendingUp, Info, Eye, EyeOff } from 'lucide-react'
import { DetailedStatsProcessor, CorrelationAnalyzer } from '../services/visualization_helpers'

function DetailedResultsVisualization({ detailedStats, setFilter }) {
  const [viewMode, setViewMode] = useState('table') // 'table' or 'chart'
  const [showCorrelation, setShowCorrelation] = useState(false)

  // Process the detailed stats using our helper class
  const processedData = useMemo(() => {
    return DetailedStatsProcessor.processDetailedStats(detailedStats)
  }, [detailedStats])

  // Calculate correlation analysis
  const correlationData = useMemo(() => {
    return CorrelationAnalyzer.analyzeCorrelation(processedData.matrix)
  }, [processedData.matrix])

  // Sort matrix by overall score
  const sortedMatrix = useMemo(() => {
    return DetailedStatsProcessor.sortMatrixByOverallScore(processedData.matrix, 'desc')
  }, [processedData.matrix])

  // Prepare chart data
  const chartData = useMemo(() => {
    return DetailedStatsProcessor.prepareChartData(processedData)
  }, [processedData])

  if (!detailedStats || Object.keys(detailedStats).length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8 text-gray-500">
          No detailed performance data available yet
        </div>
      </div>
    )
  }

  const renderTableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full table-auto">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
              Model
            </th>
            {processedData.worlds.map(worldId => (
              <th key={worldId} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-20">
                {processedData.worldNames[worldId] || `W${worldId}`}
              </th>
            ))}
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 font-semibold">
              Total Score
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedMatrix.map((modelData, modelIndex) => (
            <tr key={modelData.model} className={modelIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 z-10 bg-inherit">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: DetailedStatsProcessor.getColorForIndex(modelIndex) }}
                  ></div>
                  <span>{modelData.model}</span>
                </div>
              </td>
              {modelData.worlds.map(worldData => (
                <td key={worldData.worldId} className="px-3 py-3 text-center text-sm">
                  {worldData.hasData ? (
                    <div className="space-y-1">
                      <div className={`font-medium ${
                        worldData.score >= 80 ? 'text-green-600' :
                        worldData.score >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {worldData.score.toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        {worldData.correct}/{worldData.total}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
              ))}
              <td className="px-4 py-3 text-center bg-blue-50">
                <div className="font-semibold text-blue-900">
                  {modelData.totalScore.toFixed(1)}%
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderChartView = () => (
    <div className="space-y-6">
      {/* Simple line chart representation */}
      <div className="relative">
        <svg viewBox="0 0 800 400" className="w-full h-96 border border-gray-200 rounded-lg bg-gray-50">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(y => (
            <g key={y}>
              <line
                x1="60"
                y1={350 - (y * 2.9)}
                x2="750"
                y2={350 - (y * 2.9)}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x="45"
                y={355 - (y * 2.9)}
                className="text-xs fill-gray-500"
                textAnchor="end"
              >
                {y}%
              </text>
            </g>
          ))}
          
          {/* World labels */}
          {processedData.worlds.map((worldId, index) => {
            const x = 60 + (index * (690 / Math.max(1, processedData.worlds.length - 1)))
            return (
              <text
                key={worldId}
                x={x}
                y="380"
                className="text-xs fill-gray-600"
                textAnchor="middle"
              >
                {processedData.worldNames[worldId]?.replace('World ', 'W') || `W${worldId}`}
              </text>
            )
          })}

          {/* Data lines */}
          {sortedMatrix.slice(0, 8).map((modelData, modelIndex) => {
            const color = DetailedStatsProcessor.getColorForIndex(modelIndex)
            const points = modelData.worlds
              .map((worldData, worldIndex) => {
                if (!worldData.hasData) return null
                const x = 60 + (worldIndex * (690 / Math.max(1, processedData.worlds.length - 1)))
                const y = 350 - (worldData.score * 2.9)
                return `${x},${y}`
              })
              .filter(point => point !== null)
              .join(' ')

            return (
              <g key={modelData.model}>
                <polyline
                  points={points}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  className="opacity-80"
                />
                {/* Data points */}
                {modelData.worlds.map((worldData, worldIndex) => {
                  if (!worldData.hasData) return null
                  const x = 60 + (worldIndex * (690 / Math.max(1, processedData.worlds.length - 1)))
                  const y = 350 - (worldData.score * 2.9)
                  return (
                    <circle
                      key={`${modelData.model}-${worldData.worldId}`}
                      cx={x}
                      cy={y}
                      r="4"
                      fill={color}
                      className="opacity-90"
                    />
                  )
                })}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        {sortedMatrix.slice(0, 8).map((modelData, index) => (
          <div key={modelData.model} className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: DetailedStatsProcessor.getColorForIndex(index) }}
            ></div>
            <span className="text-gray-700 truncate" title={modelData.model}>
              {modelData.model}
            </span>
          </div>
        ))}
      </div>
      
      {sortedMatrix.length > 8 && (
        <p className="text-sm text-gray-500 italic">
          Showing top 8 models. Switch to table view to see all models.
        </p>
      )}
    </div>
  )

  const renderCorrelationAnalysis = () => (
    <div className="bg-blue-50 rounded-lg p-4 mt-4">
      <div className="flex items-center space-x-2 mb-3">
        <TrendingUp className="w-5 h-5 text-blue-600" />
        <h4 className="text-sm font-semibold text-blue-900">Correlation Analysis</h4>
        <Info 
          className="w-4 h-4 text-blue-500 cursor-help" 
          title="Shows how well individual world performance correlates with overall model performance"
        />
      </div>
      
      <div className="space-y-2 text-sm text-blue-800">
        {correlationData.insights.map((insight, index) => (
          <div key={index}>• {insight}</div>
        ))}
      </div>
      
      {Object.keys(correlationData.worldCorrelations).length > 0 && (
        <div className="mt-3">
          <h5 className="text-xs font-medium text-blue-900 mb-2">Individual World Correlations:</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {Object.entries(correlationData.worldCorrelations)
              .sort(([,a], [,b]) => b.correlation - a.correlation)
              .map(([worldId, data]) => (
                <div key={worldId} className="bg-white rounded px-2 py-1">
                  <div className="font-medium">{data.worldName}</div>
                  <div className={`${
                    data.correlation > 0.7 ? 'text-green-600' :
                    data.correlation > 0.3 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    r = {data.correlation.toFixed(3)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 max-w-6xl mx-auto">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <BarChart className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Detailed Performance Matrix</h2>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* View mode toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Table className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'chart'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <BarChart className="w-4 h-4" />
              </button>
            </div>

            {/* Correlation toggle */}
            <button
              onClick={() => setShowCorrelation(!showCorrelation)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                showCorrelation
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {showCorrelation ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>Correlation</span>
            </button>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mt-2">
          Individual world performance by model {setFilter === 'all' ? 'across all sets' : `in Set ${setFilter}`}. 
          Colors indicate model ranking by total score.
        </p>
      </div>

      <div className="p-6">
        {viewMode === 'table' ? renderTableView() : renderChartView()}
        
        {showCorrelation && renderCorrelationAnalysis()}
      </div>
    </div>
  )
}

export default DetailedResultsVisualization