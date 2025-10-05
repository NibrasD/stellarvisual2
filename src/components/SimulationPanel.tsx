import React from 'react';
import { Cpu, AlertTriangle, Clock, Activity, Database, ChevronDown, ChevronRight, Bug, Zap } from 'lucide-react';
import type { SimulationResult } from '../types/stellar';

interface SimulationPanelProps {
  result: SimulationResult;
}

export function SimulationPanel({ result }: SimulationPanelProps) {
  const [showLogs, setShowLogs] = React.useState(false);
  const [showStackTrace, setShowStackTrace] = React.useState(false);
  const [showOperationBreakdown, setShowOperationBreakdown] = React.useState(false);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Simulation Results</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {result.success ? 'Success' : 'Failed'}
        </span>
      </div>

      {/* Enhanced Resource Usage */}
      {result.enhancedDebugInfo?.resourceUsage && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-5 h-5 text-blue-600" />
              <p className="text-sm font-medium text-blue-800">CPU & Memory</p>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-blue-600">CPU Instructions</p>
                <p className="text-lg font-bold text-blue-800">
                  {result.enhancedDebugInfo.resourceUsage.cpuInstructions.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-600">Memory Usage</p>
                <p className="text-sm font-medium text-blue-700">
                  {result.enhancedDebugInfo.resourceUsage.memoryBytes.toLocaleString()} bytes
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-5 h-5 text-green-600" />
              <p className="text-sm font-medium text-green-800">I/O Operations</p>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-green-600">Read Operations</p>
                <p className="text-sm font-medium text-green-700">
                  {result.enhancedDebugInfo.resourceUsage.readLedgerEntries} entries 
                  ({result.enhancedDebugInfo.resourceUsage.readBytes.toLocaleString()} bytes)
                </p>
              </div>
              <div>
                <p className="text-xs text-green-600">Write Operations</p>
                <p className="text-sm font-medium text-green-700">
                  {result.enhancedDebugInfo.resourceUsage.writeLedgerEntries} entries 
                  ({result.enhancedDebugInfo.resourceUsage.writeBytes.toLocaleString()} bytes)
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-purple-600" />
              <p className="text-sm font-medium text-purple-800">Performance</p>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-purple-600">Simulation Time</p>
                <p className="text-lg font-bold text-purple-800">
                  {result.enhancedDebugInfo.timing.simulationTime}ms
                </p>
              </div>
              <div>
                <p className="text-xs text-purple-600">Network Latency</p>
                <p className="text-sm font-medium text-purple-700">
                  {result.enhancedDebugInfo.timing.networkLatency}ms
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Basic Resource Usage (fallback) */}
      {!result.enhancedDebugInfo?.resourceUsage && (result.resourceUsage.cpuUsage > 0 || result.resourceUsage.memoryUsage > 0) && (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-gray-600" />
              <p className="text-sm font-medium text-gray-700">Resource Usage</p>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500">CPU Instructions</p>
                <p className="text-sm font-medium">{result.resourceUsage.cpuUsage.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Memory Usage</p>
                <p className="text-sm font-medium">{result.resourceUsage.memoryUsage.toLocaleString()} bytes</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Fee */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm font-medium text-gray-700 mb-2">Transaction Fee</p>
        <div>
          <p className="text-sm">{result.estimatedFee} stroops</p>
          <p className="text-xs text-gray-500">
            ({(parseInt(result.estimatedFee) / 10000000).toFixed(7)} XLM)
          </p>
        </div>
      </div>

      {/* Operation Breakdown */}
      {result.enhancedDebugInfo?.operationBreakdown && (
        <div className="bg-white rounded-lg border border-gray-200">
          <button
            onClick={() => setShowOperationBreakdown(!showOperationBreakdown)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Operation Breakdown</span>
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                {result.enhancedDebugInfo.operationBreakdown.length} operations
              </span>
            </div>
            {showOperationBreakdown ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {showOperationBreakdown && (
            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="space-y-3 mt-3">
                {result.enhancedDebugInfo.operationBreakdown.map((op, index) => (
                  <div key={index} className={`p-3 rounded-lg border-l-4 ${
                    op.success ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        Operation {op.operation + 1}: {op.type}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        op.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {op.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                    {op.logs.map((log, logIndex) => (
                      <p key={logIndex} className="text-xs text-gray-600 font-mono">
                        {log}
                      </p>
                    ))}
                    {op.error && (
                      <p className="text-xs text-red-600 font-medium mt-1">
                        Error: {op.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Real-time Logs */}
      {result.enhancedDebugInfo?.logs && (
        <div className="bg-white rounded-lg border border-gray-200">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Real-time Debug Logs</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {result.enhancedDebugInfo.logs.length} entries
              </span>
            </div>
            {showLogs ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {showLogs && (
            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="bg-black text-green-400 p-3 rounded mt-3 font-mono text-xs max-h-60 overflow-y-auto">
                {result.enhancedDebugInfo.logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stack Traces */}
      {result.enhancedDebugInfo?.stackTrace && result.enhancedDebugInfo.stackTrace.length > 0 && (
        <div className="bg-white rounded-lg border border-red-200">
          <button
            onClick={() => setShowStackTrace(!showStackTrace)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-red-50 rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">Stack Traces</span>
              <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                {result.enhancedDebugInfo.stackTrace.length} errors
              </span>
            </div>
            {showStackTrace ? (
              <ChevronDown className="w-4 h-4 text-red-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-red-500" />
            )}
          </button>
          
          {showStackTrace && (
            <div className="px-4 pb-4 border-t border-red-100">
              <div className="space-y-3 mt-3">
                {result.enhancedDebugInfo.stackTrace.map((trace, index) => (
                  <div key={index} className="bg-red-50 p-3 rounded border-l-4 border-red-400">
                    <p className="text-sm font-medium text-red-800 mb-2">
                      {trace.operation !== undefined ? `Operation ${trace.operation + 1}` : trace.phase} Error
                    </p>
                    <p className="text-xs text-red-600 mb-2">{trace.error}</p>
                    {trace.stack && (
                      <pre className="text-xs bg-red-100 p-2 rounded overflow-x-auto max-h-32 text-red-700">
                        {trace.stack}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {result.potentialErrors.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-medium text-gray-700">
              {result.success ? 'Potential Issues' : 'Errors'}
            </p>
          </div>
          <ul className="space-y-2">
            {result.potentialErrors.map((error, index) => (
              <li key={index} className={`text-sm p-2 rounded ${
                result.success ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
              }`}>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}