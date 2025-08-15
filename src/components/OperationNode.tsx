import React from 'react';
import { Handle, Position } from 'reactflow';
import { CircleDollarSign, ArrowRightCircle, AlertCircle, Code, Cpu, Zap, UserPlus, Settings, TrendingUp, Shield, Key, Users } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface OperationNodeProps {
  data: {
    type: string;
    operation: any;
    amount?: string;
    asset?: string;
    from?: string;
    to?: string;
    destination?: string;
    startingBalance?: string;
    account?: string;
    trustor?: string;
    authorize?: boolean;
    limit?: string;
    homeDomain?: string;
    setFlags?: number;
    clearFlags?: number;
    masterWeight?: number;
    lowThreshold?: number;
    medThreshold?: number;
    highThreshold?: number;
    signer?: any;
    error?: string;
    sorobanOperation?: {
      functionName: string;
      args: any[];
      result?: any;
      error?: string;
      events?: any[];
    };
  };
}

export function OperationNodeComponent({ data }: OperationNodeProps) {
  const getIcon = () => {
    switch (data.type) {
      case 'payment':
        return <CircleDollarSign className="w-5 h-5 text-green-600" />;
      case 'create_account':
        return <ArrowRightCircle className="w-5 h-5 text-blue-600" />;
      case 'begin_sponsoring_future_reserves':
      case 'end_sponsoring_future_reserves':
        return <Shield className="w-5 h-5 text-purple-600" />;
      case 'account_merge':
        return <Users className="w-5 h-5 text-purple-600" />;
      case 'set_options':
        return <Settings className="w-5 h-5 text-orange-600" />;
      case 'change_trust':
        return <Shield className="w-5 h-5 text-indigo-600" />;
      case 'allow_trust':
        return <Key className="w-5 h-5 text-teal-600" />;
      case 'manage_offer':
      case 'create_passive_sell_offer':
        return <TrendingUp className="w-5 h-5 text-yellow-600" />;
      case 'invoke_host_function':
        return <Code className="w-5 h-5 text-purple-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatAccountId = (accountId: string) => {
    if (!accountId) return '';
    return `${accountId.slice(0, 4)}…${accountId.slice(-4)}`;
  };

  const getOperationDetails = () => {
    switch (data.type) {
      case 'create_account':
        console.log('Rendering create_account with data:', {
          destination: data.destination,
          startingBalance: data.startingBalance,
          sourceAccount: data.sourceAccount,
          operation: data.operation
        });
        
        return (
          <div className="space-y-0.5">
            <p className="text-xs text-gray-600 truncate">
              <span className="font-medium text-blue-600">Creating account</span>
            </p>
            {data.destination && (
              <p className="text-xs text-gray-600 truncate">
                For: <span className="font-mono text-blue-600">{formatAccountId(data.destination)}</span>
              </p>
            )}
            {!data.destination && (
              <p className="text-xs text-red-500 truncate">
                For: <span className="font-mono">Unknown destination</span>
              </p>
            )}
            {data.startingBalance && (
              <p className="text-xs text-gray-600 truncate">
                Starting: <span className="font-medium text-green-600">{data.startingBalance} XLM</span>
              </p>
            )}
            {!data.startingBalance && (
              <p className="text-xs text-red-500 truncate">
                Starting: <span className="font-medium">Unknown amount</span>
              </p>
            )}
            <p className="text-xs text-gray-600 truncate">
              Funded by: <span className="font-mono text-orange-600">{formatAccountId(data.sourceAccount)}</span>
            </p>
          </div>
        );
      
      case 'payment':
        return (
          <div className="space-y-0.5">
            <p className="text-xs text-gray-600 truncate">
              <span className="font-medium text-green-600">Payment Transfer</span>
            </p>
            <p className="text-xs text-gray-600 truncate">
              From: <span className="font-mono text-blue-600">{formatAccountId(data.from || '')}</span>
            </p>
            <p className="text-xs text-gray-600 truncate">
              To: <span className="font-mono text-blue-600">{formatAccountId(data.to || '')}</span>
            </p>
            <p className="text-xs text-gray-600 truncate">
              Amount: <span className="font-medium text-green-600">{data.amount} {data.asset}</span>
            </p>
          </div>
        );
      
      case 'begin_sponsoring_future_reserves':
        return (
          <div className="space-y-0.5">
            <p className="text-xs text-gray-600 truncate">
              <span className="font-medium text-purple-600">Starting Sponsorship</span>
            </p>
            <p className="text-xs text-gray-600 truncate">
              Sponsor: <span className="font-mono text-purple-600">{formatAccountId(data.sourceAccount || '')}</span>
            </p>
            <p className="text-xs text-gray-600 truncate">
              For: <span className="font-mono text-blue-600">{formatAccountId(data.sponsoredId || '')}</span>
            </p>
            <p className="text-xs text-gray-500 italic">
              Will pay reserves
            </p>
          </div>
        );
      
      case 'end_sponsoring_future_reserves':
        return (
          <div className="space-y-0.5">
            <p className="text-xs text-gray-600 truncate">
              <span className="font-medium text-purple-600">Ending Sponsorship</span>
            </p>
            <p className="text-xs text-gray-600 truncate">
              By: <span className="font-mono text-purple-600">{formatAccountId(data.sourceAccount || '')}</span>
            </p>
            <p className="text-xs text-gray-500 italic">
              Account pays own reserves
            </p>
          </div>
        );
      
      case 'invoke_host_function':
        return (
          <div className="space-y-0.5">
            <p className="text-xs text-gray-600 truncate">
              <span className="font-medium text-purple-600">Contract Call</span>
            </p>
            <p className="text-xs text-gray-600 truncate">
              Caller: <span className="font-mono text-purple-600">{formatAccountId(data.sourceAccount || '')}</span>
            </p>
            {data.sorobanOperation?.contractId && (
              <p className="text-xs text-gray-600 truncate">
                Contract: <span className="font-mono text-blue-600">{formatAccountId(data.sorobanOperation.contractId)}</span>
              </p>
            )}
            {data.sorobanOperation?.functionName && (
              <p className="text-xs text-gray-600 truncate">
                Function: <span className="font-medium text-green-600">{data.sorobanOperation.functionName}</span>
              </p>
            )}
          </div>
        );
      
      case 'set_options':
        return (
          <div className="space-y-0.5">
            <p className="text-xs text-gray-600 truncate">
              <span className="font-medium text-orange-600">Account Settings</span>
            </p>
            <p className="text-xs text-gray-600 truncate">
              Account: <span className="font-mono text-blue-600">{formatAccountId(data.sourceAccount || '')}</span>
            </p>
            {data.homeDomain && (
              <p className="text-xs text-gray-600 truncate">
                Domain: <span className="font-medium">{data.homeDomain}</span>
              </p>
            )}
            {data.setFlags !== undefined && (
              <p className="text-xs text-gray-600">
                Flags: <span className="font-mono">{data.setFlags}</span>
              </p>
            )}
            {data.masterWeight !== undefined && (
              <p className="text-xs text-gray-600">
                Weight: <span className="font-medium">{data.masterWeight}</span>
              </p>
            )}
            {data.signer && (
              <p className="text-xs text-gray-600 truncate">
                Signer: <span className="font-mono text-blue-600">{formatAccountId(data.signer.key)}</span>
              </p>
            )}
          </div>
        );
      
      case 'change_trust':
        return (
          <div className="space-y-0.5">
            <p className="text-xs text-gray-600 truncate">
              <span className="font-medium text-indigo-600">Trust Line</span>
            </p>
            <p className="text-xs text-gray-600 truncate">
              Account: <span className="font-mono text-blue-600">{formatAccountId(data.sourceAccount || '')}</span>
            </p>
            <p className="text-xs text-gray-600 truncate">
              Asset: <span className="font-medium">{data.asset}</span>
            </p>
            {data.limit && (
              <p className="text-xs text-gray-600">
                Limit: <span className="font-medium">{data.limit}</span>
              </p>
            )}
          </div>
        );
      
      case 'allow_trust':
        return (
          <div className="space-y-0.5">
            <p className="text-xs text-gray-600 truncate">
              <span className="font-medium text-teal-600">Trust Authorization</span>
            </p>
            <p className="text-xs text-gray-600 truncate">
              Issuer: <span className="font-mono text-blue-600">{formatAccountId(data.sourceAccount || '')}</span>
            </p>
            <p className="text-xs text-gray-600 truncate">
              For: <span className="font-mono text-blue-600">{formatAccountId(data.trustor || '')}</span>
            </p>
            <p className="text-xs text-gray-600 truncate">
              Status: <span className="font-medium">{data.authorize ? 'Authorized' : 'Revoked'}</span>
            </p>
          </div>
        );
      
      case 'account_merge':
        return (
          <div className="space-y-0.5">
            <p className="text-xs text-gray-600 truncate">
              <span className="font-medium text-purple-600">Account Merge</span>
            </p>
            <p className="text-xs text-gray-600 truncate">
              From: <span className="font-mono text-blue-600">{formatAccountId(data.sourceAccount || '')}</span>
            </p>
            <p className="text-xs text-gray-600 truncate">
              Into: <span className="font-mono text-blue-600">{formatAccountId(data.destination || '')}</span>
            </p>
            <p className="text-xs text-gray-500 italic">
              Transfers all funds
            </p>
          </div>
        );
      
      case 'manage_offer':
      case 'create_passive_sell_offer':
        return (
          <div className="space-y-0.5">
            <p className="text-xs text-gray-600 truncate">
              <span className="font-medium text-yellow-600">Trading Offer</span>
            </p>
            <p className="text-xs text-gray-600 truncate">
              Trader: <span className="font-mono text-blue-600">{formatAccountId(data.sourceAccount || '')}</span>
            </p>
            {data.selling && (
              <p className="text-xs text-gray-600 truncate">
                Sell: <span className="font-medium text-red-600">{data.amount} {data.selling}</span>
              </p>
            )}
            {data.buying && (
              <p className="text-xs text-gray-600 truncate">
                Buy: <span className="font-medium text-green-600">{data.buying}</span>
              </p>
            )}
            {data.price && (
              <p className="text-xs text-gray-600">
                Price: <span className="font-medium">{data.price}</span>
              </p>
            )}
          </div>
        );
      
      default:
        return (
          <div className="space-y-0.5">
            <p className="text-xs text-gray-600 truncate">
              <span className="font-medium text-gray-600">Operation</span>
            </p>
            <p className="text-xs text-gray-600 truncate">
              Source: <span className="font-mono text-blue-600">{formatAccountId(data.sourceAccount || '')}</span>
            </p>
          </div>
        );
    }
  };

  return (
    <div className={`px-3 py-2 bg-white rounded-lg shadow-md border-2 ${
      data.error ? 'border-red-200' : 'border-gray-100'
    } min-w-[280px] max-w-[320px] w-auto`}>
      <Handle type="target" position={Position.Left} className="!bg-blue-400" />
      <div className="flex items-start gap-2">
        <div className="p-1 bg-gray-50 rounded">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 capitalize text-xs mb-1 truncate">
            {data.type.replace(/([A-Z])/g, ' $1').trim()}
          </p>
          {getOperationDetails()}
          {data.sorobanOperation && (
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <div className="mt-1 p-1 bg-purple-50 rounded cursor-help">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-3 h-3 text-purple-600" />
                      <p className="text-xs text-purple-700 font-medium truncate">
                        {data.sorobanOperation.functionName}
                      </p>
                    </div>
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 max-w-2xl z-50"
                    sideOffset={5}
                  >
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Contract Interaction</p>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">Arguments:</p>
                        <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto max-h-40">
                          {JSON.stringify(data.sorobanOperation.args, null, 2)}
                        </pre>
                      </div>
                      {data.sorobanOperation.result && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">Result:</p>
                          <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto max-h-40">
                            {JSON.stringify(data.sorobanOperation.result, null, 2)}
                          </pre>
                        </div>
                      )}
                      {data.sorobanOperation.events && data.sorobanOperation.events.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">Events:</p>
                          <div className="space-y-1">
                            {data.sorobanOperation.events.map((event, idx) => (
                              <div key={idx} className="text-xs bg-purple-50 p-2 rounded">
                                <p className="font-medium">{event.type}</p>
                                <p className="text-purple-600 break-all">{event.data}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {data.sorobanOperation.error && (
                        <p className="text-xs text-red-600">
                          Error: {data.sorobanOperation.error}
                        </p>
                      )}
                    </div>
                    <Tooltip.Arrow className="fill-white" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          )}
          {data.error && (
            <div className="text-xs text-red-600 mt-1 bg-red-50 p-2 rounded border-l-2 border-red-400">
              <p className="font-medium text-red-700 text-xs">Failed</p>
              <p className="text-xs truncate">
                {data.error}
              </p>
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-blue-400" />
    </div>
  );
}