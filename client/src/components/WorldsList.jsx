import { useRef, useEffect } from 'react'
import { Loader2, Globe, CheckCircle, XCircle, AlertCircle, RefreshCw, Trash2, Copy } from 'lucide-react'
import { worldsAPI } from '../services/api'

function WorldsList({ selectedWorld, onWorldSelect, worlds, allWorldsCount, loading, error, onRefresh, onWorldDelete, onWorldSetUpdate, setFilter, onSetFilterChange, scrollPosition, onScrollPositionChange }) {
  // Determine admin role based on env vars
  const isAdmin = import.meta.env.VITE_ADMIN_API_KEY && import.meta.env.VITE_ROLE === 'admin'
  const scrollRef = useRef(null)
  const isRestoringRef = useRef(false)
  const scrollTimeoutRef = useRef(null)

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getValidationIcon = (isValid) => {
    if (isValid === true) return <CheckCircle className="w-4 h-4 text-green-500" />
    if (isValid === false) return <XCircle className="w-4 h-4 text-red-500" />
    return <AlertCircle className="w-4 h-4 text-yellow-500" />
  }

  const handleDeleteWorld = async (world, e) => {
    e.stopPropagation() // Prevent CVRB selection when clicking delete
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${world.world_name || 'Unnamed World'}"?\n\nThis will permanently delete the world and all of its solutions. This action cannot be undone.`
    )
    
    if (!confirmed) return

    try {
      await worldsAPI.deleteWorld(world.id)
      onWorldDelete(world.id)
    } catch (error) {
      console.error('Failed to delete CVRB:', error)
      alert('Failed to delete CVRB. Please try again.')
    }
  }

  const handleSetChange = async (world, newSet, e) => {
    e.stopPropagation() // Prevent CVRB selection when changing set
    
    try {
      const response = await worldsAPI.updateWorldSet(world.id, newSet)
      onWorldSetUpdate(world.id, newSet)
    } catch (error) {
      console.error('Failed to update CVRB set:', error)
      alert('Failed to update CVRB set. Please try again.')
    }
  }

  const copyWorldToClipboard = (world, e) => {
    e.stopPropagation() // Prevent CVRB selection when clicking copy
    
    const worldInfo = world.world_info || {}
    
    let content = `World: ${worldInfo.name || world.world_name || 'Unnamed World'}\n`
    content += `ID: ${world.id}\n\n`
    
    if (worldInfo.description) {
      content += `Description:\n${worldInfo.description}\n\n`
    }
    
    if (worldInfo.spec) {
      content += `World Specifications:\n`
      Object.entries(worldInfo.spec).forEach(([key, value]) => {
        content += `${key.replace(/_/g, ' ').toUpperCase()}:\n${value}\n\n`
      })
    }
    
    if (worldInfo.questions && worldInfo.questions.length > 0) {
      content += `Questions:\n`
      worldInfo.questions.forEach((question, index) => {
        content += `Question ${index + 1}:\n${question.text}\n`
        if (question.parameters) {
          content += `Parameters: ${JSON.stringify(question.parameters, null, 2)}\n`
        }
        content += '\n'
      })
    }
    
    if (world.world_code) {
      content += `World Code:\n${world.world_code}\n`
    }
    
    navigator.clipboard.writeText(content).then(() => {
      // You could add a toast notification here if desired
      console.log('World content copied to clipboard')
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err)
    })
  }

  // Restore scroll position when scrollPosition changes (returning to tab) or content loads
  useEffect(() => {
    if (scrollRef.current && scrollPosition && !loading && worlds.length > 0) {
      const currentScrollTop = scrollRef.current.scrollTop
      
      // Only restore if current position is different from target position
      if (Math.abs(currentScrollTop - scrollPosition) > 5) {
        isRestoringRef.current = true
        
        const timeoutId = setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollPosition
            // Mark restoration as complete after scroll is set
            setTimeout(() => {
              isRestoringRef.current = false
            }, 150)
          }
        }, 50)
        
        return () => {
          clearTimeout(timeoutId)
          isRestoringRef.current = false
        }
      }
    }
  }, [scrollPosition, loading, worlds.length])

  // Reset scroll position when filtering results in empty list
  useEffect(() => {
    if (scrollRef.current && worlds.length === 0) {
      onScrollPositionChange(0)
    }
  }, [worlds.length, onScrollPositionChange])

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      isRestoringRef.current = false
    }
  }, [])

  // Save scroll position when user scrolls (not during restoration)
  const handleScroll = () => {
    if (scrollRef.current && onScrollPositionChange && !isRestoringRef.current) {
      // Clear previous timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      
      // Debounce the scroll position update
      scrollTimeoutRef.current = setTimeout(() => {
        if (scrollRef.current && onScrollPositionChange && !isRestoringRef.current) {
          onScrollPositionChange(scrollRef.current.scrollTop)
        }
      }, 100)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-600">Loading worlds...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center h-64 flex items-center justify-center">
          <div>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">{error}</p>
            <button 
              onClick={onRefresh}
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Worlds</h2>
              <span className="text-sm text-gray-500">
                ({worlds.length}{allWorldsCount && worlds.length !== allWorldsCount ? ` of ${allWorldsCount}` : ''})
              </span>
            </div>
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
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
            title="Refresh worlds"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-y-auto max-h-[calc(100vh-300px)]"
      >
        {worlds.length === 0 ? (
          <div className="p-8 text-center">
            <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No worlds found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {worlds.map((world) => (
              <div
                key={world.id}
                onClick={() => onWorldSelect(world)}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedWorld?.id === world.id 
                    ? 'bg-blue-100 border-l-4 border-blue-600 shadow-md' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      {getValidationIcon(world.is_valid)}
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {world.world_name || 'Unnamed World'}
                      </h3>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-400 font-mono">
                          #{world.id}
                        </span>
                        <button
                          onClick={(e) => copyWorldToClipboard(world, e)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="Copy world content to clipboard"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">
                      Creator: <span className="font-medium">{world.creator}</span>
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {formatDate(world.createdAt)}
                      </p>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-500">Quality:</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          world.quality_score >= 8 ? 'bg-green-100 text-green-700' :
                          world.quality_score >= 6 ? 'bg-yellow-100 text-yellow-700' :
                          world.quality_score >= 4 ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {(world.quality_score || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center space-x-2">
                      <select
                        value={world.set || 0}
                        onChange={(e) => handleSetChange(world, parseInt(e.target.value), e)}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 hover:border-gray-400 focus:outline-none focus:border-blue-500"
                        title="Set number"
                      >
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                          <option key={num} value={num}>Set {num}</option>
                        ))}
                      </select>
                      <button
                        onClick={(e) => handleDeleteWorld(world, e)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete world"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default WorldsList