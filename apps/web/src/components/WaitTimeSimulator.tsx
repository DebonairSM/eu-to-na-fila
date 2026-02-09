import { useState, useMemo } from 'react';
import type { Service } from '@eutonafila/shared';

interface WaitTimeSimulatorProps {
  services: Service[];
}

/**
 * Client-side wait-time calculator.
 *
 * Uses the same wave-based simulation as the backend:
 * build an array of `barberCount` zeros (each barber's availability),
 * for each person in queue assign to the earliest-free barber and add
 * the service duration, then the result is the minimum of the array.
 */
export function WaitTimeSimulator({ services }: WaitTimeSimulatorProps) {
  const [barberCount, setBarberCount] = useState(2);
  const [queueSize, setQueueSize] = useState(5);
  const [selectedServiceId, setSelectedServiceId] = useState<number | ''>('');

  const activeServices = services.filter((s) => s.isActive);
  const serviceDuration =
    selectedServiceId !== ''
      ? activeServices.find((s) => s.id === selectedServiceId)?.duration ?? 30
      : 30;

  const estimate = useMemo(() => {
    if (barberCount <= 0 || queueSize <= 0) return 0;

    const availability = Array.from({ length: barberCount }, () => 0);

    for (let i = 0; i < queueSize; i++) {
      const minTime = Math.min(...availability);
      const minIdx = availability.indexOf(minTime);
      availability[minIdx] += serviceDuration;
    }

    return Math.ceil(Math.min(...availability));
  }, [barberCount, queueSize, serviceDuration]);

  const waves = barberCount > 0 ? Math.ceil(queueSize / barberCount) : 0;

  return (
    <div className="mt-4 border border-white/10 rounded-lg p-4 bg-white/[0.03]">
      <h4 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-base text-white/50">calculate</span>
        Simulador de Tempo de Espera
      </h4>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-white/50 text-xs block mb-1">Barbeiros</label>
          <input
            type="number"
            min={1}
            max={20}
            value={barberCount}
            onChange={(e) => setBarberCount(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm"
          />
        </div>
        <div>
          <label className="text-white/50 text-xs block mb-1">Pessoas na fila</label>
          <input
            type="number"
            min={0}
            max={200}
            value={queueSize}
            onChange={(e) => setQueueSize(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm"
          />
        </div>
        <div>
          <label className="text-white/50 text-xs block mb-1">Servico</label>
          {activeServices.length > 0 ? (
            <select
              value={selectedServiceId}
              onChange={(e) =>
                setSelectedServiceId(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm"
            >
              <option value="">Padrao (30 min)</option>
              {activeServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.duration} min)
                </option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              min={1}
              value={serviceDuration}
              readOnly
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white/50 text-sm"
            />
          )}
        </div>
      </div>

      {/* Result */}
      <div className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
        <div className="text-white/60 text-xs">
          {waves} {waves === 1 ? 'rodada' : 'rodadas'} &middot; {serviceDuration} min/servico
        </div>
        <div className="text-right">
          <span className="text-white text-lg font-semibold">{estimate}</span>
          <span className="text-white/50 text-xs ml-1">min de espera</span>
        </div>
      </div>
    </div>
  );
}
