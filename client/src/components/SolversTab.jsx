import SolversList from './SolversList'
import SolverDetails from './SolverDetails'

function SolversTab({ selectedWorld, selectedSolution, onSolutionSelect }) {

  if (!selectedWorld) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <span className="text-gray-400 font-semibold">!</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No World Selected</h3>
          <p className="text-gray-500">Please select a world from the Worlds tab to view solver solutions.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
      {/* Left panel - 30% width */}
      <div className="col-span-12 lg:col-span-4">
        <SolversList 
          selectedWorld={selectedWorld}
          selectedSolution={selectedSolution} 
          onSolutionSelect={onSolutionSelect} 
        />
      </div>
      
      {/* Right panel - 70% width */}
      <div className="col-span-12 lg:col-span-8">
        <SolverDetails 
          solution={selectedSolution} 
          selectedWorld={selectedWorld}
        />
      </div>
    </div>
  )
}

export default SolversTab