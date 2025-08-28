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
    contractId?: string;
    functionName?: string;
    args?: any[];
    auth?: any[];
    result?: any;
    events?: any[];
    hostFunctionType?: string;
    footprint?: any;
    resourceFee?: string;
    sourceAccount?: string;
    funder?: string;
    minimumBalance?: string;
    sequence?: string;
    assetIssuer?: string;
    memo?: string;
    memoType?: string;
    setFlagNames?: string[];
    clearFlagNames?: string[];
    assetCode?: string;
    sponsor?: string;
    sponsoredId?: string;
    action?: string;
    sendAmount?: string;
    sendMax?: string;
    sendAsset?: string;
    destAmount?: string;
    destMin?: string;
    destAsset?: string;
    path?: any[];
    selling?: string;
    buying?: string;
    price?: string;
    offerId?: string;
    buyAmount?: string;
    bumpTo?: string;
    inflationDest?: string;
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
      case 'path_payment_strict_receive':
      case 'path_payment_strict_send':
        return <CircleDollarSign className="w-5 h-5 text-green-600" />;
      case 'create_account':
        return <ArrowRightCircle className="w-5 h-5 text-blue-600" />;
      case 'set_trust_line_flags':
        return <Key className="w-5 h-5 text-red-600" />;
      case 'begin_sponsoring_future_reserves':
      case 'end_sponsoring_future_reserves':
      case 'revoke_sponsorship':
        return <Shield className="w-5 h-5 text-purple-600" />;
      case 'account_merge':
        return <Users className="w-5 h-5 text-purple-600" />;
      case 'set_options':
      case 'bump_sequence':
        return <Settings className="w-5 h-5 text-orange-600" />;
      case 'change_trust':
        return <Shield className="w-5 h-5 text-indigo-600" />;
      case 'allow_trust':
        return <Key className="w-5 h-5 text-teal-600" />;
      case 'manage_offer':
      case 'manage_sell_offer':
      case 'manage_buy_offer':
      case 'create_passive_sell_offer':
        return <TrendingUp className="w-5 h-5 text-yellow-600" />;
      case 'invoke_host_function':
      case 'invokeHostFunction':
        return <Code className="w-5 h-5 text-purple-600" />;
      case 'clawback':
      case 'clawback_claimable_balance':
        return <Zap className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatAccountId = (accountId: string) => {
    if (!accountId) return '';
    return `${accountId.slice(0, 6)}…${accountId.slice(-6)}`;
  };

  const getOperationDetails = () => {
    switch (data.type) {
      case 'invoke_host_function':
      case 'invokeHostFunction':
        return (
          <div className="space-y-1">
            <p className="text-base text-gray-600 break-words">
              <span className="font-medium text-purple-600">Contract Call</span>
            </p>
            <p className="text-sm text-gray-600 break-words">
              Caller: <span className="font-mono text-purple-600">{formatAccountId(data.sourceAccount || '')}</span>
            </p>
            {data.contractId && data.contractId !== 'Unknown Contract' && data.contractId !== 'Unknown' && (
              <p className="text-sm text-gray-600 break-words bg-blue-50 p-2 rounded">
                Contract: <span className="font-mono text-blue-600">
                  {data.contractId.startsWith('C') && data.contractId.length === 56 
                    ? formatAccountId(data.contractId)
                    : data.contractId
                  }
                </span>
              </p>
            )}
            {(!data.contractId || data.contractId === 'Unknown Contract' || data.contractId === 'Unknown' || data.contractId.startsWith('Contract_')) && (
              <p className="text-sm text-amber-600 break-words bg-amber-50 p-2 rounded">
                Contract: <span className="font-mono text-amber-600">
                  {data.contractId?.startsWith('Contract_') ? data.contractId : 'Unable to extract ID'}
                </span>
              </p>
            )}
            <p className="text-sm text-gray-600 break-words">
              Function: <span className="font-medium text-green-600">{data.functionName || 'invoke'}</span>
            </p>
            {data.args && data.args.length > 0 && (
              <p className="text-sm text-gray-600 break-words">
                Args: <span className="font-mono text-orange-600">{data.args.length} parameters</span>
              </p>
            )}
            {data.auth && data.auth.length > 0 && (
              <p className="text-sm text-gray-600 break-words">
                Auth: <span className="font-mono text-cyan-600">{data.auth.length} authorizations</span>
              </p>
            )}
            {data.hostFunctionType && (
              <p className="text-sm text-gray-600 break-words">
                Type: <span className="font-medium text-indigo-600">{data.hostFunctionType}</span>
              </p>
            )}
            {data.footprint && (
              <p className="text-sm text-gray-600 break-words">
                Footprint: <span className="font-mono text-gray-500">
                  R:{data.footprint.readOnly?.length || 0} W:{data.footprint.readWrite?.length || 0}
                </span>
              </p>
            )}
            {data.resourceFee && (
              <p className="text-sm text-gray-600 break-words">
                Resource Fee: <span className="font-mono text-red-600">{data.resourceFee} stroops</span>
              </p>
            )}
            {data.result && (
              <div className="mt-1 p-2 bg-green-50 rounded border-l-2 border-green-400">
                <p className="text-sm text-green-600 break-words">
                  ✅ <span className="font-medium">Success</span>
                </p>
                <p className="text-sm text-green-700 break-words">
                  Result: {typeof data.result === 'object' ? 'Object returned' : String(data.result).substring(0, 30)}
                </p>
              </div>
            )}
            {data.error && (
              <div className="mt-1 p-2 bg-red-50 rounded border-l-2 border-red-400">
                <p className="text-sm text-red-600 break-words">
                  ❌ <span className="font-medium">Failed</span>
                </p>
                <p className="text-sm text-red-700 break-words">
                  Error: {data.error.substring(0, 50)}...
                </p>
              </div>
            )}
            {data.events && data.events.length > 0 && (
              <div className="mt-1 p-2 bg-blue-50 rounded border-l-2 border-blue-400">
                <p className="text-sm text-blue-600 break-words">
                  📡 <span className="font-medium">Events Emitted: {data.events.length}</span>
                </p>
                {data.events.slice(0, 2).map((event: any, idx: number) => (
                  <p key={idx} className="text-sm text-blue-700 break-words">
                    {event.type}: {typeof event.data === 'string' ? event.data.substring(0, 20) : 'Object'}
                  </p>
                ))}
                {data.events.length > 2 && (
                  <p className="text-sm text-blue-600">...and {data.events.length - 2} more</p>
                )}
              </div>
            )}
          </div>
        );

      case 'create_account':
        return (
          <div className="space-y-1">
            <p className="text-base text-gray-600 break-words">
              <span className="font-medium text-blue-600">Creating account</span>
            </p>
            {data.destination && (
              <p className="text-sm text-gray-600 break-words">
                For: <span className="font-mono text-blue-600">{data.destination}</span>
              </p>
            )}
            {!data.destination && (
              <p className="text-sm text-red-500 break-words">
                For: <span className="font-mono">Unknown destination</span>
              </p>
            )}
            {data.startingBalance && (
              <p className="text-sm text-gray-600 break-words">
                Starting Balance: <span className="font-medium text-green-600">{data.startingBalance} XLM</span>
              </p>
            )}
            {!data.startingBalance && (
              <p className="text-sm text-red-500 break-words">
                Starting Balance: <span className="font-medium">Unknown amount</span>
              </p>
            )}
            <p className="text-sm text-gray-600 break-words">
              Funded by: <span className="font-mono text-orange-600">{formatAccountId(data.funder || data.sourceAccount || '')}</span>
            </p>
            {data.minimumBalance && (
              <p className="text-sm text-gray-500 italic break-words">
                Min reserve: {data.minimumBalance} XLM
              </p>
            )}
            {data.sequence && (
              <p className="text-sm text-gray-500 break-words">
                Sequence: <span className="font-mono">{data.sequence}</span>
              </p>
            )}
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-1">
            <p className="text-base text-gray-600 break-words">
              <span className="font-medium text-green-600">Payment Transfer</span>
            </p>
            <p className="text-sm text-gray-600 break-words">
              From: <span className="font-mono text-blue-600">{formatAccountId(data.from || '')}</span>
            </p>
            <p className="text-sm text-gray-600 break-words">
              To: <span className="font-mono text-blue-600">{formatAccountId(data.to || '')}</span>
            </p>
            <p className="text-sm text-gray-600 break-words">
              Amount: <span className="font-medium text-green-600">{data.amount} {data.asset}</span>
            </p>
            {data.assetIssuer && data.asset !== 'XLM' && (
              <p className="text-sm text-gray-500 break-words">
                Issuer: <span className="font-mono">{formatAccountId(data.assetIssuer)}</span>
              </p>
            )}
            {data.memo && (
              <p className="text-sm text-gray-500 italic break-words">
                Memo: {data.memo}
              </p>
            )}
            {data.memoType && (
              <p className="text-sm text-gray-500 break-words">
                Memo Type: <span className="font-mono">{data.memoType}</span>
              </p>
            )}
          </div>
        );

      case 'set_trust_line_flags':
        return (
          <div className="space-y-1">
            <p className="text-base text-gray-600 break-words">
              <span className="font-medium text-red-600">Set Trustline Flags</span>
            </p>
            <p className="text-sm text-gray-600 break-words">
              Issuer: <span className="font-mono text-blue-600">{formatAccountId(data.sourceAccount || '')}</span>
            </p>
            <p className="text-sm text-gray-600 break-words">
              For: <span className="font-mono text-blue-600">{formatAccountId(data.trustor || '')}</span>
            </p>
            <p className="text-sm text-gray-600 break-words">
              Asset: <span className="font-medium text-green-600">{data.assetCode}</span>
            </p>
            {data.setFlagNames && data.setFlagNames.length > 0 && (
              <p className="text-sm text-green-600 break-words">
                ✅ Set: {data.setFlagNames.join(', ')}
              </p>
            )}
            {data.clearFlagNames && data.clearFlagNames.length > 0 && (
              <p className="text-sm text-red-600 break-words">
                ❌ Clear: {data.clearFlagNames.join(', ')}
              </p>
            )}
          </div>
        );

      case 'begin_sponsoring_future_reserves':
        return (
          <div className="space-y-1">
            <p className="text-base text-gray-600 break-words">
              <span className="font-medium text-purple-600">Starting Sponsorship</span>
            </p>
            <p className="text-sm text-gray-600 break-words">
              Sponsor: <span className="font-mono text-purple-600">{formatAccountId(data.sponsor || data.sourceAccount || '')}</span>
            </p>
            <p className="text-sm text-gray-600 break-words">
              For: <span className="font-mono text-blue-600">{formatAccountId(data.sponsoredId || '')}</span>
            </p>
            <p className="text-sm text-gray-500 italic break-words">
              Will pay reserves
            </p>
          </div>
        );

      case 'end_sponsoring_future_reserves':
        return (
          <div className="space-y-1">
            <p className="text-base text-gray-600 break-words">
              <span className="font-medium text-purple-600">Ending Sponsorship</span>
            </p>
            <p className="text-sm text-gray-600 break-words">
              By: <span className="font-mono text-purple-600">{formatAccountId(data.sourceAccount || '')}</span>
            </p>
            <p className="text-sm text-gray-500 italic break-words">
              Account pays own reserves
            </p>
          </div>
        );

      default:
        return (
          <div className="space-y-1">
            <p className="text-base text-gray-600 break-words">
              <span className="font-medium text-gray-600 capitalize">{data.type.replace(/_/g, ' ')}</span>
            </p>
            <p className="text-sm text-gray-600 break-words">
              Source: <span className="font-mono text-blue-600">{formatAccountId(data.sourceAccount || '')}</span>
            </p>
          </div>
        );
    }
  };

  return (
    <div className={`px-4 py-3 bg-white rounded-lg shadow-md border-2 ${
      data.error ? 'border-red-200' : 'border-gray-100'
    } min-w-[450px] max-w-[550px] w-auto`}>
      <Handle type="target" position={Position.Left} className="!bg-blue-400" />
      <div className="flex items-start gap-2">
        <div className="p-1 bg-gray-50 rounded">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 capitalize text-base mb-2 break-words">
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
                      <p className="text-sm text-purple-700 font-medium break-words">
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
                        <p className="text-sm text-gray-500">Arguments:</p>
                        <pre className="text-sm bg-gray-50 p-2 rounded overflow-x-auto max-h-40">
                          {JSON.stringify(data.sorobanOperation.args, null, 2)}
                        </pre>
                      </div>
                      {data.sorobanOperation.result && (
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500">Result:</p>
                          <pre className="text-sm bg-gray-50 p-2 rounded overflow-x-auto max-h-40">
                            {JSON.stringify(data.sorobanOperation.result, null, 2)}
                          </pre>
                        </div>
                      )}
                      {data.sorobanOperation.events && data.sorobanOperation.events.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500">Events:</p>
                          <div className="space-y-1">
                            {data.sorobanOperation.events.map((event, idx) => (
                              <div key={idx} className="text-sm bg-purple-50 p-2 rounded">
                                <p className="font-medium">{event.type}</p>
                                <p className="text-purple-600 break-all">{event.data}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {data.sorobanOperation.error && (
                        <p className="text-sm text-red-600">
                          Error: {data.sorobanOperation.error}
                        </p>
                      )}
                    </div>
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-blue-400" />
    </div>
  );
}
