import { useState } from 'react';
import type { BrandConfigState, TimeBlock } from '@/types/tractstack';
import type { FormStateReturn } from '@/hooks/useFormState';

interface SchedulingSectionProps {
  formState: FormStateReturn<BrandConfigState>;
}

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const TIMEZONE_OPTIONS = [
  {
    group: 'Americas',
    zones: [
      { label: 'Eastern Time (New York)', value: 'America/New_York' },
      { label: 'Central Time (Chicago)', value: 'America/Chicago' },
      { label: 'Mountain Time (Denver)', value: 'America/Denver' },
      { label: 'Pacific Time (Los Angeles)', value: 'America/Los_Angeles' },
      { label: 'Toronto / Montreal', value: 'America/Toronto' },
      { label: 'Mexico City', value: 'America/Mexico_City' },
    ],
  },
  {
    group: 'Europe & Africa',
    zones: [
      { label: 'London / Dublin', value: 'Europe/London' },
      { label: 'Paris / Berlin / Rome', value: 'Europe/Paris' },
      { label: 'Athens / Cairo', value: 'Europe/Athens' },
      { label: 'Lagos', value: 'Africa/Lagos' },
      { label: 'Johannesburg', value: 'Africa/Johannesburg' },
    ],
  },
  {
    group: 'Asia & Oceania',
    zones: [
      { label: 'Dubai', value: 'Asia/Dubai' },
      { label: 'Singapore / HK', value: 'Asia/Singapore' },
      { label: 'Tokyo', value: 'Asia/Tokyo' },
      { label: 'Sydney / Melbourne', value: 'Australia/Sydney' },
      { label: 'Auckland', value: 'Pacific/Auckland' },
    ],
  },
  { label: 'UTC / GMT', value: 'UTC' },
];

export default function SchedulingSection({
  formState,
}: SchedulingSectionProps) {
  const { state, updateField } = formState;
  const config = state.scheduling;
  const [newBlock, setNewBlock] = useState<TimeBlock>({ start: '', end: '' });

  const updateHours = (day: string, field: keyof TimeBlock, value: string) => {
    const updatedHours = { ...config.businessHours };
    if (!updatedHours[day]) {
      updatedHours[day] = { start: '09:00', end: '17:00' };
    }
    updatedHours[day] = { ...updatedHours[day], [field]: value };
    updateField('scheduling', { ...config, businessHours: updatedHours });
  };

  const toggleDay = (day: string) => {
    const updatedHours = { ...config.businessHours };
    if (updatedHours[day]) {
      delete updatedHours[day];
    } else {
      updatedHours[day] = { start: '09:00', end: '17:00' };
    }
    updateField('scheduling', { ...config, businessHours: updatedHours });
  };

  const addUnavailableBlock = () => {
    if (!newBlock.start || !newBlock.end) return;

    const updated = [
      ...config.unavailableHours,
      {
        start: new Date(newBlock.start).toISOString(),
        end: new Date(newBlock.end).toISOString(),
      },
    ];
    updateField('scheduling', { ...config, unavailableHours: updated });
    setNewBlock({ start: '', end: '' });
  };

  const removeUnavailableBlock = (index: number) => {
    const updated = config.unavailableHours.filter((_, i) => i !== index);
    updateField('scheduling', { ...config, unavailableHours: updated });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-xl font-extrabold text-gray-900">
        Native Scheduling
      </h3>

      <div className="space-y-10 divide-y divide-gray-100">
        <div className="pt-2">
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-6 xl:grid-cols-12">
            <div className="md:col-span-3 xl:col-span-4">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500">
                Store Timezone
              </label>
              <select
                value={config.timezone}
                onChange={(e) =>
                  updateField('scheduling', {
                    ...config,
                    timezone: e.target.value,
                  })
                }
                className="mt-2 block w-full rounded-md border-gray-300 bg-white px-2 py-3 focus:border-cyan-700 focus:ring-cyan-700 md:text-sm"
              >
                {TIMEZONE_OPTIONS.map((opt) =>
                  opt.group ? (
                    <optgroup key={opt.group} label={opt.group}>
                      {opt.zones.map((z) => (
                        <option key={z.value} value={z.value}>
                          {z.label}
                        </option>
                      ))}
                    </optgroup>
                  ) : (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  )
                )}
              </select>
              <p className="mt-1 text-xs font-bold uppercase text-gray-400">
                Stored: {config.timezone}
              </p>
            </div>
            <div className="md:col-span-3 xl:col-span-4">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500">
                Buffer Gap (Minutes)
              </label>
              <input
                type="number"
                value={config.bufferGapsMinutes}
                onChange={(e) =>
                  updateField('scheduling', {
                    ...config,
                    bufferGapsMinutes: parseInt(e.target.value) || 0,
                  })
                }
                className="mt-2 block w-full rounded-md border-gray-300 px-2 py-3 focus:border-cyan-700 focus:ring-cyan-700 md:text-sm"
              />
            </div>
          </div>
        </div>

        <div className="pt-10">
          <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">
            Weekly Business Hours
          </h4>
          <div className="mt-6 space-y-6">
            {DAYS.map((day) => (
              <div
                key={day}
                className="flex flex-wrap items-center gap-4 md:flex-nowrap"
              >
                <div className="w-24 text-sm font-bold capitalize text-gray-900 md:w-32">
                  {day}
                </div>
                <button
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2 ${
                    config.businessHours[day] ? 'bg-cyan-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      config.businessHours[day]
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
                {config.businessHours[day] && (
                  <div className="flex items-center space-x-3">
                    <input
                      type="time"
                      value={config.businessHours[day].start}
                      onChange={(e) =>
                        updateHours(day, 'start', e.target.value)
                      }
                      className="rounded-md border-gray-300 px-2 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 md:text-sm"
                    />
                    <span className="text-xs font-bold text-gray-400">TO</span>
                    <input
                      type="time"
                      value={config.businessHours[day].end}
                      onChange={(e) => updateHours(day, 'end', e.target.value)}
                      className="rounded-md border-gray-300 px-2 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 md:text-sm"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-10">
          <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">
            Blackout Dates
          </h4>
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
              <input
                type="datetime-local"
                value={newBlock.start}
                onChange={(e) =>
                  setNewBlock({ ...newBlock, start: e.target.value })
                }
                className="rounded-md border-gray-300 px-2 py-3 focus:border-cyan-700 focus:ring-cyan-700 md:text-sm"
              />
              <input
                type="datetime-local"
                value={newBlock.end}
                onChange={(e) =>
                  setNewBlock({ ...newBlock, end: e.target.value })
                }
                className="rounded-md border-gray-300 px-2 py-3 focus:border-cyan-700 focus:ring-cyan-700 md:text-sm"
              />
              <button
                type="button"
                onClick={addUnavailableBlock}
                className="inline-flex justify-center rounded-md border border-transparent bg-cyan-600 px-6 py-3 text-sm font-black uppercase tracking-widest text-white shadow-sm hover:bg-cyan-500 md:col-span-1"
              >
                Add Blackout
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {config.unavailableHours.map((block: TimeBlock, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-4 shadow-sm"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-black uppercase text-gray-400">
                      Closed Period
                    </span>
                    <span className="text-xs font-bold text-gray-700">
                      {new Date(block.start).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}{' '}
                      —{' '}
                      {new Date(block.end).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  <button
                    onClick={() => removeUnavailableBlock(idx)}
                    className="ml-4 rounded-full p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
