import { useState, useEffect } from 'react'
import Header from './components/Header'
import TabNavigation from './components/TabNavigation'
import ResultsTab from './components/ResultsTab'
import WorldsTab from './components/WorldsTab'
import SolversTab from './components/SolversTab'
import AboutTab from './components/AboutTab'
import { worldsAPI } from './services/api'

function App() {
  // Determine admin role once per render
  const isAdmin = import.meta.env.VITE_ADMIN_API_KEY && import.meta.env.VITE_ROLE === 'admin'

  const [activeTab, setActiveTab] = useState('results')
  const [selectedWorld, setSelectedWorld] = useState(null)
  const [selectedSolution, setSelectedSolution] = useState(null)
  const [worlds, setWorlds] = useState([])
  const [worldsLoading, setWorldsLoading] = useState(true)
  const [worldsError, setWorldsError] = useState(null)
  const [worldsScrollPosition, setWorldsScrollPosition] = useState(0)
  const [worldsSetFilter, setWorldsSetFilter] = useState(() => {
    return localStorage.getItem('worldsSetFilter') || 'all'
  })
  const [resultsSetFilter, setResultsSetFilter] = useState(() => {
    return localStorage.getItem('resultsSetFilter') || (isAdmin ? 'all' : '1')
  })

  // Fetch worlds once on app load
  useEffect(() => {
    fetchWorlds()
  }, [])

  // Auto-select first CVRB when worlds are loaded and no CVRB is selected
  useEffect(() => {
    if (worlds.length > 0 && !selectedWorld) {
      setSelectedWorld(worlds[0])
    }
  }, [worlds, selectedWorld])

  // Save worlds set filter to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('worldsSetFilter', worldsSetFilter)
  }, [worldsSetFilter])

  // Save results set filter to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('resultsSetFilter', resultsSetFilter)
  }, [resultsSetFilter])

  const fetchWorlds = async () => {
    try {
      setWorldsLoading(true)
      setWorldsError(null)
      const response = await worldsAPI.getWorlds({ limit: 50 })
      setWorlds(response.data || [])
    } catch (err) {
      setWorldsError('Failed to fetch worlds')
      console.error('Error fetching worlds:', err)
    } finally {
      setWorldsLoading(false)
    }
  }

  const handleWorldDelete = (deletedWorldId) => {
    // Remove the deleted CVRB from the state
    setWorlds(prevWorlds => prevWorlds.filter(world => world.id !== deletedWorldId))
    
    // If the deleted CVRB was selected, clear the selection
    if (selectedWorld?.id === deletedWorldId) {
      setSelectedWorld(null)
      setSelectedSolution(null)
    }
  }

  const handleWorldSetUpdate = (worldId, newSet) => {
    // Update the CVRB's set in the state
    setWorlds(prevWorlds => 
      prevWorlds.map(world => 
        world.id === worldId ? { ...world, set: newSet } : world
      )
    )
    
    // If the updated CVRB is selected, update the selected CVRB too
    if (selectedWorld?.id === worldId) {
      setSelectedWorld(prevSelected => ({ ...prevSelected, set: newSet }))
    }
  }

  const handleWorldsSetFilterChange = (newSetFilter) => {
    setWorldsSetFilter(newSetFilter)
  }

  const handleResultsSetFilterChange = (newSetFilter) => {
    setResultsSetFilter(newSetFilter)
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'results':
        return (
          <ResultsTab 
            setFilter={resultsSetFilter}
            onSetFilterChange={handleResultsSetFilterChange}
            onNavigateToTab={setActiveTab}
          />
        )
      case 'worlds':
        return (
          <WorldsTab 
            selectedWorld={selectedWorld} 
            onWorldSelect={setSelectedWorld}
            worlds={worlds}
            loading={worldsLoading}
            error={worldsError}
            onRefresh={fetchWorlds}
            onWorldDelete={handleWorldDelete}
            onWorldSetUpdate={handleWorldSetUpdate}
            scrollPosition={worldsScrollPosition}
            onScrollPositionChange={setWorldsScrollPosition}
            setFilter={worldsSetFilter}
            onSetFilterChange={handleWorldsSetFilterChange}
          />
        )
      case 'solvers':
        return (
          <SolversTab 
            selectedWorld={selectedWorld}
            selectedSolution={selectedSolution}
            onSolutionSelect={setSelectedSolution}
          />
        )
      case 'about':
        return <AboutTab />
      default:
        return (
          <ResultsTab 
            setFilter={resultsSetFilter}
            onSetFilterChange={handleResultsSetFilterChange}
            onNavigateToTab={setActiveTab}
          />
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-6">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="mt-6">
          {renderActiveTab()}
        </div>
      </div>
    </div>
  )
}

export default App
