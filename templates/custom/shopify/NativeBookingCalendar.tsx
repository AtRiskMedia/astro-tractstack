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
  onSlotSelected: (start: Date, end: Date) => void;
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

        if (response && response.bookings) {
          setAvailability(response.data);
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

    const dayName = selectedDate
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase();
    const businessHours = availability.scheduling.businessHours[dayName];
    if (!businessHours) return [];

    const daySlots: { start: Date; end: Date; isAvailable: boolean }[] = [];
    const [startH, startM] = businessHours.start.split(':').map(Number);
    const [endH, endM] = businessHours.end.split(':').map(Number);

    const iter = new Date(selectedDate);
    iter.setHours(startH, startM, 0, 0);

    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(endH, endM, 0, 0);

    const slotStep = 15;

    while (iter.getTime() + totalDurationMinutes * 60000 <= dayEnd.getTime()) {
      const slotStart = new Date(iter);
      const slotEnd = new Date(iter.getTime() + totalDurationMinutes * 60000);

      const isBlocked =
        availability.bookings.some((b) => {
          const bStart = new Date(b.startTime);
          const bEnd = new Date(b.endTime);
          return slotStart < bEnd && slotEnd > bStart;
        }) ||
        availability.scheduling.unavailableHours.some((u) => {
          const uStart = new Date(u.start);
          const uEnd = new Date(u.end);
          return slotStart < uEnd && slotEnd > uStart;
        });

      daySlots.push({
        start: slotStart,
        end: slotEnd,
        isAvailable: !isBlocked,
      });

      iter.setMinutes(iter.getMinutes() + slotStep);
    }

    return daySlots;
  }, [availability, selectedDate, totalDurationMinutes]);

  const handleSlotClick = (start: Date, end: Date) => {
    setSelectedSlot({ start, end });
    onSlotSelected(start, end);
  };

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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <label className="block text-sm text-gray-700">Date</label>
          <input
            type="date"
            min={new Date().toISOString().split('T')[0]}
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e: any) => setSelectedDate(new Date(e.target.value))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
          {availability?.scheduling.timezone && (
            <p className="text-xs text-gray-400">
              Shop Timezone: {availability.scheduling.timezone}
            </p>
          )}
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
                  className={`rounded-md border p-2 text-sm transition-colors ${
                    selectedSlot?.start.getTime() === slot.start.getTime()
                      ? 'border-black bg-black text-white'
                      : slot.isAvailable
                        ? 'bg-white text-gray-700 hover:border-black'
                        : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300'
                  }`}
                >
                  {slot.start.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
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
              {selectedSlot.start.toLocaleDateString()} at{' '}
              {selectedSlot.start.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Local Time: {selectedSlot.start.toString()}
          </p>
        </div>
      )}
    </div>
  );
};
