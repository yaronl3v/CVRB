import { useMemo, useEffect } from 'react'
import WorldsList from './WorldsList'
import WorldDetails from './WorldDetails'

function WorldsTab({ selectedWorld, onWorldSelect, worlds, loading, error, onRefresh, onWorldDelete, onWorldSetUpdate, scrollPosition, onScrollPositionChange, setFilter, onSetFilterChange }) {

  // Filter worlds based on selected set
  const filteredWorlds = useMemo(() => {
    if (setFilter === 'all') {
      return worlds
    }
    const filterSet = parseInt(setFilter)
    return worlds.filter(world => (world.set || 0) === filterSet)
  }, [worlds, setFilter])

  // Auto-select first CVRB from filtered results if current selection is not in filtered results
  useEffect(() => {
    if (selectedWorld && filteredWorlds.length > 0) {
      const isSelectedWorldInFiltered = filteredWorlds.some(world => world.id === selectedWorld.id)
      if (!isSelectedWorldInFiltered) {
        onWorldSelect(filteredWorlds[0])
      }
    }
  }, [filteredWorlds, selectedWorld, onWorldSelect])

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
      {/* Left panel - 30% width */}
      <div className="col-span-12 lg:col-span-4">
        <WorldsList 
          selectedWorld={selectedWorld} 
          onWorldSelect={onWorldSelect}
          worlds={filteredWorlds}
          allWorldsCount={worlds.length}
          loading={loading}
          error={error}
          onRefresh={onRefresh}
          onWorldDelete={onWorldDelete}
          onWorldSetUpdate={onWorldSetUpdate}
          setFilter={setFilter}
          onSetFilterChange={onSetFilterChange}
          scrollPosition={scrollPosition}
          onScrollPositionChange={onScrollPositionChange}
        />
      </div>
      
      {/* Right panel - 70% width */}
      <div className="col-span-12 lg:col-span-8">
        <WorldDetails world={selectedWorld} />
      </div>
    </div>
  )
}

export default WorldsTab