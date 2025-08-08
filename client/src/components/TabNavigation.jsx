import { Globe, Brain, FileText, BarChart3 } from 'lucide-react'

function TabNavigation({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'results', label: 'Results', icon: BarChart3 },
    { id: 'worlds', label: 'Worlds', icon: Globe },
    { id: 'solvers', label: 'Solvers', icon: Brain },
    { id: 'about', label: 'About', icon: FileText }
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
      <nav className="flex space-x-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-100 text-primary-700 border border-primary-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default TabNavigation