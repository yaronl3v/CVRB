import { FileText, Brain, CheckCircle, Target, Database, Globe, Github, ExternalLink } from 'lucide-react'

function AboutTab() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-12">
          <FileText className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Code-Verified Reasoning Benchmark (CVRB)
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            CVRB tests how well large language models can reason and discover patterns in a two-phase{' '}
            <span className="font-semibold text-blue-600">self-play</span> loop: first, Creator models invent miniature deterministic{' '}
            <span className="font-semibold">worlds</span>; then Solver models try to answer questions about those worlds. 
            All answers are verified automatically by running the code, not by humans.
          </p>
        </div>

        {/* GitHub Repository Link */}
        <div className="text-center mb-12">
          <a
            href="https://github.com/yaronl3v/CVRB"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-3 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Github className="w-5 h-5" />
            <span className="font-medium">View on GitHub</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          <p className="text-sm text-gray-500 mt-2">
            Open source • Apache-2.0 License • Contributions welcome
          </p>
        </div>

        {/* What makes CVRB different */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Target className="w-6 h-6 text-blue-600 mr-2" />
            What makes CVRB different?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Self-play benchmarking</h3>
              <p className="text-blue-800">
                The very models we want to evaluate first <em>create</em> brand-new worlds and then <em>solve</em> them, 
                ensuring the test set is always novel and shaped by current capabilities.
              </p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900 mb-3">Evergreen difficulty</h3>
              <p className="text-green-800">
                Because worlds are machine-generated, their complexity can be tuned through the creator prompt or by 
                simply upgrading the Creator model. No human curation is needed.
              </p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-900 mb-3">Code-verified answers</h3>
              <p className="text-purple-800">
                Every solution is checked by running the simulation itself, so results are objective and reproducible.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Brain className="w-6 h-6 text-blue-600 mr-2" />
            How it works
          </h2>
          <p className="text-gray-600 mb-6">CVRB defines three autonomous roles:</p>
          
          <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="border border-gray-200 rounded-lg p-6 bg-blue-50">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Creator</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-medium text-blue-800 mb-1">Input:</h4>
                  <p className="text-blue-700">A high-level prompt that defines the game rules, the JSON schema for questions and acceptable code style.</p>
                </div>
                <div>
                  <h4 className="font-medium text-blue-800 mb-1">Output:</h4>
                  <ul className="list-disc list-inside text-blue-700 space-y-1">
                    <li>A natural-language description of the world and its questions</li>
                    <li>Reference simulation code that produces ground-truth answers</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-blue-800 mb-1">Process:</h4>
                  <p className="text-blue-700">The Creator stores the new world in the database with a temporary status of <em>unvalidated</em> and assigns it to a <strong>set id</strong> (default <code className="bg-blue-100 px-1 rounded">0</code>).</p>
                </div>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-6 bg-green-50">
              <h3 className="text-lg font-semibold text-green-900 mb-4">Validator</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-medium text-green-800 mb-1">Input:</h4>
                  <p className="text-green-700">The world description and the expected answers produced by the Creator's reference code (but <em>not</em> the code itself).</p>
                </div>
                <div>
                  <h4 className="font-medium text-green-800 mb-1">Process:</h4>
                  <p className="text-green-700">The Validator writes its <em>own</em> simulation from scratch and runs it.</p>
                </div>
                <div>
                  <h4 className="font-medium text-green-800 mb-1">Output:</h4>
                  <p className="text-green-700">If the outputs match the Creator's answers bit-for-bit and the run is deterministic (no randomness, no external I/O), the world is marked <strong>validated</strong>; otherwise it is rejected.</p>
                </div>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-6 bg-purple-50">
              <h3 className="text-lg font-semibold text-purple-900 mb-4">Solver</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-medium text-purple-800 mb-1">Input:</h4>
                  <p className="text-purple-700">Only the natural-language world description and its questions; no reference code or answers.</p>
                </div>
                <div>
                  <h4 className="font-medium text-purple-800 mb-1">Process:</h4>
                  <p className="text-purple-700">The Solver generates code or declarative logic that reasons about the simulation and outputs a JSON answer object.</p>
                </div>
                <div>
                  <h4 className="font-medium text-purple-800 mb-1">Recording:</h4>
                  <p className="text-purple-700">The framework executes this code and compares the answers against the ground truth. Each solver attempt is recorded in the <code className="bg-purple-100 px-1 rounded">solutions</code> table with accuracy and run-time metrics.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">The evaluation pipeline is fully automated:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>A Creator model proposes one or more candidate worlds.</li>
              <li>Independent Validators run each world to make sure the rules are met and every question has a unique answer.</li>
              <li>Solver models receive only the natural-language description of the world. They write code that reasons about the simulation and outputs their answers.</li>
              <li>The framework executes that code; outputs are compared against ground-truth generated by running the simulation directly.</li>
            </ol>
          </div>
        </section>

        {/* Scoring */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <CheckCircle className="w-6 h-6 text-blue-600 mr-2" />
            Scoring
          </h2>
          <div className="bg-yellow-50 p-6 rounded-lg">
            <p className="text-gray-700 mb-4">For each batch of questions CVRB reports:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><strong>Accuracy</strong> – percentage of correct answers.</li>
              <li><strong>Failure rate</strong> – percentage of questions a solver attempted but returned an invalid answer (crash, timeout, wrong type, etc.).</li>
              <li><strong>Metadata</strong> such as total run time can be logged but is not part of the core score.</li>
            </ul>
          </div>
        </section>

        {/* Selecting the right worlds */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Globe className="w-6 h-6 text-blue-600 mr-2" />
            Selecting the right worlds
          </h2>
          <p className="text-gray-600 mb-4">
            Not every generated world yields an informative benchmark. Some are trivially easy and are solved by every model; 
            others are impossibly hard and defeat them all. To keep the leaderboard meaningful CVRB follows this strategy:
          </p>
          <div className="bg-indigo-50 p-6 rounded-lg">
            <ol className="list-decimal list-inside space-y-2 text-indigo-800">
              <li><strong>Generate multiple candidate worlds per Creator model.</strong> (Typically 1-3.)</li>
              <li><strong>Run a small panel of diverse Solver models</strong> on each candidate.</li>
              <li><strong>Measure result spread.</strong> A <em>good</em> world produces at least three distinct answer sets across the solvers – evidence that it discriminates between capabilities.</li>
              <li><strong>Select the world with the best spread</strong> and publish only that one to the benchmark.</li>
            </ol>
            <p className="text-indigo-800 mt-4 font-medium">
              This adaptive selection maintains a balanced difficulty curve without manual curation.
            </p>
          </div>
        </section>

        {/* Project layout */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Database className="w-6 h-6 text-blue-600 mr-2" />
            Project layout
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Server</h3>
              <p className="text-gray-600">
                Node.js backend that houses the Creator, Validator and Solver pipelines and stores everything 
                in PostgreSQL (with the PostGIS extension for spatial worlds).
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Client</h3>
              <p className="text-gray-600">
                React application that lets humans browse worlds, solver attempts and scores.
              </p>
            </div>
          </div>
        </section>

        {/* Front-end explorer */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Front-end explorer (React client)</h2>
          <p className="text-gray-600 mb-4">The React interface found in the <code className="bg-gray-100 px-2 py-1 rounded">client/</code> folder lets researchers:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
            <li>Browse a list of all validated worlds.</li>
            <li>Inspect the natural-language description and underlying simulation code.</li>
            <li>View every solver attempt with its answer JSON, justification snippet and score.</li>
            <li>Compare models side-by-side using sortable tables and charts.</li>
          </ul>
          <p className="text-gray-600">
            Each world is assigned a <strong>set id</strong>, which defaults to <code className="bg-gray-100 px-2 py-1 rounded">0</code>. 
            Users can change a world's set id through the front-end to group or select worlds as needed. The UI allows filtering 
            and viewing worlds by set id, making it easy to focus on particular sets or batches.
          </p>
        </section>

        {/* Why you might use CVRB */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Why you might use CVRB</h2>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Benchmark new LLM releases for algorithmic reasoning.</li>
              <li>Stress-test tool-use abilities – models must combine language understanding with code generation.</li>
              <li>Research curriculum learning: gradually increase world complexity to train more capable agents.</li>
              <li>Study emergent behaviour as Creator models iterate and bootstrap increasingly complex worlds.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}

export default AboutTab