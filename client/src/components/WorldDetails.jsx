import { useState } from 'react'
import { Code, FileText, HelpCircle, CheckCircle, XCircle, AlertCircle, Copy, ChevronDown, ChevronRight } from 'lucide-react'

function WorldDetails({ world }) {
  const [activeSection, setActiveSection] = useState('overview')
  const [expandedSections, setExpandedSections] = useState({
    spec: false,
    questions: false,
    code: false,
    validation: false
  })
  const [expandedValidators, setExpandedValidators] = useState({})

  if (!world) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a World</h3>
          <p className="text-gray-500">Choose a world from the list to view its details.</p>
        </div>
      </div>
    )
  }

  const getValidationStatus = () => {
    if (world.is_valid === true) {
      return {
        icon: <CheckCircle className="w-5 h-5 text-green-500" />,
        text: 'Valid',
        color: 'text-green-700'
      }
    }
    if (world.is_valid === false) {
      return {
        icon: <XCircle className="w-5 h-5 text-red-500" />,
        text: 'Invalid',
        color: 'text-red-700'
      }
    }
    return {
      icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
      text: 'Pending',
      color: 'text-yellow-700'
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  const copyWorldToClipboard = () => {
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
      console.log('World content copied to clipboard')
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err)
    })
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const toggleValidator = (questionIndex) => {
    setExpandedValidators(prev => ({
      ...prev,
      [questionIndex]: !prev[questionIndex]
    }))
  }

  const worldInfo = world.world_info || {}
  const validationStatus = getValidationStatus()

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {worldInfo.name || world.world_name || 'Unnamed World'}
            </h2>
            <div className="flex items-center space-x-4 mt-2">
              <span className="text-sm text-gray-600">
                Creator: <span className="font-medium">{world.creator}</span>
              </span>
              <div className="flex items-center space-x-1">
                {validationStatus.icon}
                <span className={`text-sm font-medium ${validationStatus.color}`}>
                  {validationStatus.text}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-sm text-gray-600">Quality:</span>
                <span className={`text-sm font-medium px-2 py-1 rounded-full ${
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
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              ID: {world.id}
            </span>
            <button
              onClick={copyWorldToClipboard}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Copy world content to clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
        
        {/* Description */}
        {worldInfo.description && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed">{worldInfo.description}</p>
            </div>
          </div>
        )}

        {/* World Specification */}
        {worldInfo.spec && (
          <div>
            <button
              onClick={() => toggleSection('spec')}
              className="flex items-center space-x-2 text-lg font-medium text-gray-900 mb-3 hover:text-primary-600"
            >
              {expandedSections.spec ? 
                <ChevronDown className="w-5 h-5" /> : 
                <ChevronRight className="w-5 h-5" />
              }
              <span>World Specification</span>
            </button>
            
            {expandedSections.spec && (
              <div className="space-y-4">
                {Object.entries(worldInfo.spec).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 capitalize">
                      {key.replace(/_/g, ' ')}
                    </h4>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border">
                      {value}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Questions */}
        {worldInfo.questions && worldInfo.questions.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('questions')}
              className="flex items-center space-x-2 text-lg font-medium text-gray-900 mb-3 hover:text-primary-600"
            >
              {expandedSections.questions ? 
                <ChevronDown className="w-5 h-5" /> : 
                <ChevronRight className="w-5 h-5" />
              }
              <HelpCircle className="w-5 h-5" />
              <span>Questions ({worldInfo.questions.length})</span>
            </button>
            
            {expandedSections.questions && (
              <div className="space-y-4">
                {worldInfo.questions.map((question, index) => (
                  <div key={question.id || index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        Question {index + 1}
                        {question.difficulty && (
                          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                            question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                            question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {question.difficulty}
                          </span>
                        )}
                      </h4>
                    </div>
                    <p className="text-gray-700 mb-3">{question.text}</p>
                    
                    {question.parameters && (
                      <div className="bg-white rounded p-3 border mb-3">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Parameters:</h5>
                        <pre className="text-xs text-gray-700 font-mono overflow-x-auto">
                          {JSON.stringify(question.parameters, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {question.validator_fn && (
                      <div className="bg-white rounded p-3 border">
                        <button
                          onClick={() => toggleValidator(index)}
                          className="flex items-center space-x-2 text-sm font-medium text-gray-900 mb-2 hover:text-primary-600 w-full text-left"
                        >
                          {expandedValidators[index] ? 
                            <ChevronDown className="w-4 h-4" /> : 
                            <ChevronRight className="w-4 h-4" />
                          }
                          <Code className="w-4 h-4" />
                          <span>Validator Function</span>
                        </button>
                        
                        {expandedValidators[index] && (
                          <div className="bg-gray-900 rounded p-3 relative">
                            <button
                              onClick={() => copyToClipboard(question.validator_fn)}
                              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white transition-colors"
                              title="Copy validator function"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <pre className="text-xs text-gray-100 overflow-x-auto pr-8 font-mono">
                              <code>{question.validator_fn}</code>
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* World Code */}
        <div>
          <button
            onClick={() => toggleSection('code')}
            className="flex items-center space-x-2 text-lg font-medium text-gray-900 mb-3 hover:text-primary-600"
          >
            {expandedSections.code ? 
              <ChevronDown className="w-5 h-5" /> : 
              <ChevronRight className="w-5 h-5" />
            }
            <Code className="w-5 h-5" />
            <span>World Code</span>
          </button>
          
          {expandedSections.code && (
            <div className="bg-gray-900 rounded-lg p-4 relative">
              <button
                onClick={() => copyToClipboard(world.world_code)}
                className="absolute top-3 right-3 p-2 text-gray-400 hover:text-white transition-colors"
                title="Copy code"
              >
                <Copy className="w-4 h-4" />
              </button>
              <pre className="text-sm text-gray-100 overflow-x-auto pr-10">
                <code>{world.world_code}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Validation Report */}
        {world.validation_notes && world.validation_notes.report && (
          <div>
            <button
              onClick={() => toggleSection('validation')}
              className="flex items-center space-x-2 text-lg font-medium text-gray-900 mb-3 hover:text-primary-600"
            >
              {expandedSections.validation ? 
                <ChevronDown className="w-5 h-5" /> : 
                <ChevronRight className="w-5 h-5" />
              }
              <CheckCircle className="w-5 h-5" />
              <span>Validation Report</span>
            </button>
            
            {expandedSections.validation && (
              <div className="space-y-4">
              
              {/* Summary Section */}
              {world.validation_notes.report.summary && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    {world.validation_notes.report.summary.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 mr-2" />
                    )}
                    Validation Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`ml-2 font-medium ${
                        world.validation_notes.report.summary.success ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {world.validation_notes.report.summary.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Agreement:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {world.validation_notes.report.summary.agreementRatio} ({world.validation_notes.report.summary.agreementPercentage}%)
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Total Validators:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {world.validation_notes.report.summary.totalValidators}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Valid Task:</span>
                      <span className={`ml-2 font-medium ${
                        world.validation_notes.report.validTask ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {world.validation_notes.report.validTask ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* World Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">World Name:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {world.validation_notes.report.worldName || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Timestamp:</span>
                    <span className="ml-2 text-sm text-gray-700">
                      {world.validation_notes.report.timestamp ? 
                        new Date(world.validation_notes.report.timestamp).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Validators */}
              {world.validation_notes.report.validators && world.validation_notes.report.validators.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Validators</h4>
                  <div className="space-y-2">
                    {world.validation_notes.report.validators.map((validator, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {validator.success ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="font-medium text-gray-900">{validator.modelName}</span>
                          <span className="text-sm text-gray-600">({validator.apiName})</span>
                        </div>
                        <span className={`text-sm font-medium ${
                          validator.success ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {validator.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default WorldDetails