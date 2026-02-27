import type { Port } from '../../types';

interface PortInfoProps {
  inputs: Port[];
  outputs: Port[];
}

export function PortInfo({ inputs, outputs }: PortInfoProps) {
  return (
    <div className="border-t border-gray-700 pt-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">Ports</h3>
      <div className="space-y-2">
        <div>
          <span className="text-xs text-gray-500">Inputs:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {inputs.map((port) => (
              <span
                key={port.id}
                className={`
                  text-[10px] px-1.5 py-0.5 rounded
                  ${port.type === 'midi' ? 'bg-green-900/50 text-green-300' : ''}
                  ${port.type === 'audio' ? 'bg-orange-900/50 text-orange-300' : ''}
                  ${port.type === 'cv' ? 'bg-yellow-900/50 text-yellow-300' : ''}
                `}
              >
                {port.label}
              </span>
            ))}
          </div>
        </div>
        <div>
          <span className="text-xs text-gray-500">Outputs:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {outputs.map((port) => (
              <span
                key={port.id}
                className={`
                  text-[10px] px-1.5 py-0.5 rounded
                  ${port.type === 'midi' ? 'bg-blue-900/50 text-blue-300' : ''}
                  ${port.type === 'audio' ? 'bg-red-900/50 text-red-300' : ''}
                  ${port.type === 'cv' ? 'bg-purple-900/50 text-purple-300' : ''}
                `}
              >
                {port.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
