import { Database } from 'lucide-react'

function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary-600 rounded-lg">
              <Database className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">CVRB</h1>
          </div>
          <div className="text-sm text-gray-500">
            Code Verified Reasoning Benchmark
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header