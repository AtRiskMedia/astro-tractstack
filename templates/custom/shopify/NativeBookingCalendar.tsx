import { useState, useEffect, useMemo } from 'react';
import { bookingHelpers } from '@/utils/api/bookingHelpers';

interface TimeBlock {
  start: string;
  end: string;
}

interface SchedulingConfig {
  timezone: string;
  bufferGapsMinutes: number;
  businessHours: Record<string, TimeBlock>;
  unavailableHours: TimeBlock[];
}

interface Booking {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface NativeBookingCalendarProps {
  resourceIds: string[];
  totalDurationMinutes: number;
  onSlotSelected: (start: Date, end: Date, timeZone: string) => void;
}

function getUtcFromWallTime(wallTimeIso: string, timeZone: string): Date {
  const [datePart, timePart] = wallTimeIso.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const pseudoUtc = new Date(
    `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00Z`
  );

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(pseudoUtc);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value;

  const tzDate = new Date(
    `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}:00Z`
  );
  const diff = pseudoUtc.getTime() - tzDate.getTime();

  return new Date(pseudoUtc.getTime() + diff);
}

export const NativeBookingCalendar = ({
  resourceIds,
  totalDurationMinutes,
  onSlotSelected,
}: NativeBookingCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availability, setAvailability] = useState<{
    bookings: Booking[];
    scheduling: SchedulingConfig;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        setLoading(true);
        const start = new Date();
        const end = new Date();
        end.setDate(end.getDate() + 14);

        const response = await bookingHelpers.getAvailability(
          resourceIds,
          start.toISOString(),
          end.toISOString()
        );

        if (response && response.scheduling) {
          setAvailability({
            bookings: response.bookings || [],
            scheduling: response.scheduling,
          });
          setError(null);
        } else {
          setError(response.message || 'Failed to load availability.');
        }
      } catch (err) {
        setError('A network error occurred while fetching availability.');
      } finally {
        setLoading(false);
      }
    };

    if (resourceIds.length > 0) {
      fetchAvailability();
    }
  }, [resourceIds]);

  const slots = useMemo(() => {
    if (!availability || !selectedDate) return [];
    const shopTz = availability.scheduling.timezone;

    const dayName = selectedDate
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase();

    const businessHours = availability.scheduling.businessHours?.[dayName];
    if (!businessHours) return [];

    const baseDateIso = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}T`;
    let iterUtc = getUtcFromWallTime(
      `${baseDateIso}${businessHours.start}`,
      shopTz
    );
    const dayEndUtc = getUtcFromWallTime(
      `${baseDateIso}${businessHours.end}`,
      shopTz
    );
    const bufferGap = availability.scheduling.bufferGapsMinutes || 0;
    const daySlots = [];

    while (
      iterUtc.getTime() + totalDurationMinutes * 60000 <=
      dayEndUtc.getTime()
    ) {
      const slotStart = new Date(iterUtc);
      const slotEnd = new Date(
        iterUtc.getTime() + totalDurationMinutes * 60000
      );
      const slotEndWithBuffer = new Date(slotEnd.getTime() + bufferGap * 60000);

      const isBlocked =
        availability.bookings.some((b) => {
          const bStart = new Date(b.startTime);
          const bEnd = new Date(b.endTime);
          return slotStart < bEnd && slotEndWithBuffer > bStart;
        }) ||
        availability.scheduling.unavailableHours.some((u) => {
          const uStart = new Date(u.start);
          const uEnd = new Date(u.end);
          return slotStart < uEnd && slotEndWithBuffer > uStart;
        });

      daySlots.push({
        start: slotStart,
        end: slotEnd,
        isAvailable: !isBlocked,
      });
      iterUtc = new Date(iterUtc.getTime() + 15 * 60000);
    }
    return daySlots;
  }, [availability, selectedDate, totalDurationMinutes]);

  const handleSlotClick = (start: Date, end: Date) => {
    setSelectedSlot({ start, end });
    if (availability?.scheduling.timezone) {
      onSlotSelected(start, end, availability.scheduling.timezone);
    }
  };

  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const shopTz = availability?.scheduling?.timezone;
  const isDiffTz = Boolean(userTz && shopTz && userTz !== shopTz);

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">
        Loading availability...
      </div>
    );
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <h3 className="text-lg font-bold text-gray-900">
          Select an Appointment
        </h3>
        <div className="text-sm text-gray-500">
          Duration: {totalDurationMinutes} mins
        </div>
      </div>

      {isDiffTz && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            <strong>Please Note:</strong> Appointments are booked in{' '}
            <strong>{shopTz}</strong> time. Your local timezone is {userTz}.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <label className="block text-sm text-gray-700">Date</label>
          <input
            type="date"
            value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`}
            onChange={(e) => {
              const [y, m, d] = e.target.value.split('-');
              setSelectedDate(
                new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
              );
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <div className="space-y-4">
          <label className="block text-sm text-gray-700">Available Times</label>
          <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-2">
            {slots.length > 0 ? (
              slots.map((slot, i) => (
                <button
                  key={i}
                  disabled={!slot.isAvailable}
                  onClick={() => handleSlotClick(slot.start, slot.end)}
                  className={`rounded-md border p-2 text-sm transition-colors ${selectedSlot?.start.getTime() === slot.start.getTime() ? 'border-black bg-black text-white' : slot.isAvailable ? 'bg-white text-gray-700 hover:border-black' : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300'}`}
                >
                  <span className="block font-bold">
                    {slot.start.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: shopTz,
                    })}
                  </span>
                  {isDiffTz && (
                    <span className="mt-0.5 block text-xs opacity-75">
                      (
                      {slot.start.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: userTz,
                      })}{' '}
                      local)
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="col-span-2 py-4 text-center text-sm text-gray-400">
                No slots available for this day.
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedSlot && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-900">
            Selected:{' '}
            <span className="font-bold">
              {selectedSlot.start.toLocaleDateString('en-US', {
                timeZone: shopTz,
              })}{' '}
              at{' '}
              {selectedSlot.start.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: shopTz,
              })}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};
