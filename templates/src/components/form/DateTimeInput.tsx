import { useId, useMemo, useState, useEffect } from 'react';
import { DatePicker } from '@ark-ui/react/date-picker';
import { Select } from '@ark-ui/react/select';
import { Portal } from '@ark-ui/react/portal';
import { createListCollection } from '@ark-ui/react/collection';
import { CalendarDate, type DateValue } from '@internationalized/date';
import CalendarDaysIcon from '@heroicons/react/24/outline/CalendarDaysIcon';
import ChevronLeftIcon from '@heroicons/react/24/outline/ChevronLeftIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import ChevronUpDownIcon from '@heroicons/react/24/outline/ChevronUpDownIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import { classNames } from '@/utils/helpers';
import type { BaseFormComponentProps } from '@/types/formTypes';

export interface DateTimeInputProps extends BaseFormComponentProps<number> {
  displayFormat?: 'date' | 'datetime' | 'time';
  min?: number;
  max?: number;
  withTime?: boolean;
  timeStep?: number;
}

// Hour options (1-12 for 12-hour format)
const hourOptions = Array.from({ length: 12 }, (_, i) => ({
  value: (i + 1).toString(),
  label: (i + 1).toString().padStart(2, '0'),
}));

// Minute options (00, 15, 30, 45)
const minuteOptions = [
  { value: '0', label: '00' },
  { value: '15', label: '15' },
  { value: '30', label: '30' },
  { value: '45', label: '45' },
];

// AM/PM options
const ampmOptions = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
];

const DateTimeInput = ({
  value,
  onChange,
  label,
  error,
  disabled = false,
  required = false,
  className,
  displayFormat = 'datetime',
  min,
  max,
  withTime = true,
  timeStep = 15,
  placeholder = 'Select date and time',
}: DateTimeInputProps) => {
  const id = useId();
  const errorId = `${id}-error`;
  const helpTextId = `${id}-help`;

  // Local state for date and time components
  const [selectedDate, setSelectedDate] = useState<CalendarDate | null>(null);
  const [selectedHour, setSelectedHour] = useState<string>('7'); // Default 7 PM
  const [selectedMinute, setSelectedMinute] = useState<string>('0'); // Default :00
  const [selectedAmPm, setSelectedAmPm] = useState<string>('PM'); // Default PM

  // Create collections for Ark UI Select components
  const hourCollection = useMemo(
    () => createListCollection({ items: hourOptions }),
    []
  );
  const minuteCollection = useMemo(
    () => createListCollection({ items: minuteOptions }),
    []
  );
  const ampmCollection = useMemo(
    () => createListCollection({ items: ampmOptions }),
    []
  );

  // Sync local state with incoming UTC timestamp value
  useEffect(() => {
    if (value && value > 0) {
      const localDate = new Date(value * 1000);

      // Set date
      const newDate = new CalendarDate(
        localDate.getFullYear(),
        localDate.getMonth() + 1,
        localDate.getDate()
      );

      // Set time components in local timezone
      const hour24 = localDate.getHours();
      const minute = localDate.getMinutes();

      // Convert to 12-hour format
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const isPM = hour24 >= 12;

      // Only update if different to prevent loops
      setSelectedDate(newDate);
      setSelectedHour(hour12.toString());
      setSelectedMinute(minute.toString());
      setSelectedAmPm(isPM ? 'PM' : 'AM');
    }
  }, [value]); // Remove selectedDate from dependencies

  // Helper to calculate UTC timestamp from local date/time components
  const calculateUtcTimestamp = (
    date: CalendarDate,
    hour: string,
    minute: string,
    ampm: string
  ): number => {
    // Convert 12-hour to 24-hour
    let hour24 = parseInt(hour, 10);
    if (ampm === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (ampm === 'AM' && hour24 === 12) {
      hour24 = 0;
    }

    // Create local date object
    const localDateTime = new Date(
      date.year,
      date.month - 1, // JavaScript months are 0-indexed
      date.day,
      hour24,
      parseInt(minute, 10),
      0, // seconds
      0 // milliseconds
    );

    // Convert to UTC timestamp
    return Math.floor(localDateTime.getTime() / 1000);
  };

  // Update UTC timestamp when any component changes
  const updateTimestamp = (
    date?: CalendarDate,
    hour?: string,
    minute?: string,
    ampm?: string
  ) => {
    const currentDate = date || selectedDate;
    const currentHour = hour || selectedHour;
    const currentMinute = minute || selectedMinute;
    const currentAmPm = ampm || selectedAmPm;

    if (currentDate) {
      const utcTimestamp = calculateUtcTimestamp(
        currentDate,
        currentHour,
        currentMinute,
        currentAmPm
      );
      onChange(utcTimestamp);
    }
  };

  // Handle date selection
  const handleDateChange = (details: { value: DateValue[] }) => {
    if (details.value && details.value.length > 0) {
      const newDate = details.value[0] as CalendarDate;
      setSelectedDate(newDate);

      // If this is the first time selecting a date, set default time
      if (!selectedDate) {
        setSelectedHour('7');
        setSelectedMinute('0');
        setSelectedAmPm('PM');
        updateTimestamp(newDate, '7', '0', 'PM');
      } else {
        updateTimestamp(newDate);
      }
    } else {
      setSelectedDate(null);
      onChange(0);
    }
  };

  // Handle hour selection
  const handleHourChange = (details: { value: string[] }) => {
    if (details.value && details.value.length > 0) {
      const newHour = details.value[0];
      setSelectedHour(newHour);
      updateTimestamp(undefined, newHour);
    }
  };

  // Handle minute selection
  const handleMinuteChange = (details: { value: string[] }) => {
    if (details.value && details.value.length > 0) {
      const newMinute = details.value[0];
      setSelectedMinute(newMinute);
      updateTimestamp(undefined, undefined, newMinute);
    }
  };

  // Handle AM/PM selection
  const handleAmPmChange = (details: { value: string[] }) => {
    if (details.value && details.value.length > 0) {
      const newAmPm = details.value[0];
      setSelectedAmPm(newAmPm);
      updateTimestamp(undefined, undefined, undefined, newAmPm);
    }
  };

  // Calculate min/max dates for DatePicker
  const minDate = useMemo((): CalendarDate | undefined => {
    if (!min) return undefined;
    const date = new Date(min * 1000);
    return new CalendarDate(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    );
  }, [min]);

  const maxDate = useMemo((): CalendarDate | undefined => {
    if (!max) return undefined;
    const date = new Date(max * 1000);
    return new CalendarDate(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    );
  }, [max]);

  // Format display value for current selection
  const getDisplaySummary = () => {
    if (!selectedDate) {
      return 'No date selected';
    }

    const dateStr = `${selectedDate.month}/${selectedDate.day}/${selectedDate.year}`;

    if (withTime && displayFormat !== 'date') {
      const timeStr = `${selectedHour.padStart(2, '0')}:${selectedMinute.padStart(2, '0')} ${selectedAmPm}`;
      return `${dateStr} at ${timeStr}`;
    }

    return dateStr;
  };

  return (
    <div className={classNames('space-y-4', className || '')}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-bold text-gray-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      {/* Date Picker Section */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-gray-600">Date</div>
        <DatePicker.Root
          value={selectedDate ? [selectedDate] : []}
          onValueChange={handleDateChange}
          min={minDate}
          max={maxDate}
          disabled={disabled}
          closeOnSelect={true}
          positioning={{ sameWidth: false }}
        >
          <DatePicker.Control className="relative w-fit">
            <DatePicker.Input
              placeholder="Select date"
              className={classNames(
                'w-40 rounded-md border px-3 py-2 text-sm shadow-sm transition-colors',
                'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                error
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300',
                disabled ? 'cursor-not-allowed bg-gray-50 text-gray-500' : ''
              )}
              disabled={disabled}
              readOnly
            />
            <DatePicker.Trigger
              className={classNames(
                'absolute right-2 top-1/2 -translate-y-1/2 rounded p-1',
                'text-gray-400 transition-colors hover:text-gray-600',
                disabled ? 'cursor-not-allowed opacity-50' : ''
              )}
              disabled={disabled}
            >
              <CalendarDaysIcon className="h-4 w-4" />
            </DatePicker.Trigger>
          </DatePicker.Control>

          <Portal>
            <DatePicker.Positioner>
              <DatePicker.Content className="z-50 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                <DatePicker.View view="day">
                  <DatePicker.Context>
                    {(api) => (
                      <>
                        <DatePicker.ViewControl className="mb-4 flex items-center justify-between">
                          <DatePicker.PrevTrigger className="rounded p-1 hover:bg-gray-100">
                            <ChevronLeftIcon className="h-4 w-4" />
                          </DatePicker.PrevTrigger>
                          <DatePicker.ViewTrigger className="rounded px-3 py-1 text-sm font-bold hover:bg-gray-100">
                            <DatePicker.RangeText />
                          </DatePicker.ViewTrigger>
                          <DatePicker.NextTrigger className="rounded p-1 hover:bg-gray-100">
                            <ChevronRightIcon className="h-4 w-4" />
                          </DatePicker.NextTrigger>
                        </DatePicker.ViewControl>

                        <DatePicker.Table className="w-full">
                          <DatePicker.TableHead>
                            <DatePicker.TableRow>
                              {api.weekDays.map((weekDay, id) => (
                                <DatePicker.TableHeader
                                  key={id}
                                  className="p-2 text-center text-xs font-bold text-gray-500"
                                >
                                  {weekDay.short}
                                </DatePicker.TableHeader>
                              ))}
                            </DatePicker.TableRow>
                          </DatePicker.TableHead>
                          <DatePicker.TableBody>
                            {api.weeks.map((week, id) => (
                              <DatePicker.TableRow key={id}>
                                {week.map((day, id) => (
                                  <DatePicker.TableCell key={id} value={day}>
                                    <DatePicker.TableCellTrigger
                                      className={classNames(
                                        'h-8 w-8 rounded p-0 text-sm transition-colors',
                                        'hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500',
                                        'data-[selected]:bg-blue-600 data-[selected]:text-white',
                                        'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40',
                                        'data-[outside-range]:text-gray-400'
                                      )}
                                    >
                                      {day.day}
                                    </DatePicker.TableCellTrigger>
                                  </DatePicker.TableCell>
                                ))}
                              </DatePicker.TableRow>
                            ))}
                          </DatePicker.TableBody>
                        </DatePicker.Table>
                      </>
                    )}
                  </DatePicker.Context>
                </DatePicker.View>

                <DatePicker.View view="month">
                  <DatePicker.Context>
                    {(api) => (
                      <>
                        <DatePicker.ViewControl className="mb-4 flex items-center justify-between">
                          <DatePicker.PrevTrigger className="rounded p-1 hover:bg-gray-100">
                            <ChevronLeftIcon className="h-4 w-4" />
                          </DatePicker.PrevTrigger>
                          <DatePicker.ViewTrigger className="rounded px-3 py-1 text-sm font-bold hover:bg-gray-100">
                            <DatePicker.RangeText />
                          </DatePicker.ViewTrigger>
                          <DatePicker.NextTrigger className="rounded p-1 hover:bg-gray-100">
                            <ChevronRightIcon className="h-4 w-4" />
                          </DatePicker.NextTrigger>
                        </DatePicker.ViewControl>

                        <DatePicker.Table>
                          <DatePicker.TableBody>
                            {api
                              .getMonthsGrid({ columns: 4 })
                              .map((months, id) => (
                                <DatePicker.TableRow key={id}>
                                  {months.map((month, id) => (
                                    <DatePicker.TableCell
                                      key={id}
                                      value={month.value}
                                    >
                                      <DatePicker.TableCellTrigger
                                        className={classNames(
                                          'w-full rounded p-2 text-sm transition-colors hover:bg-blue-50',
                                          'data-[selected]:bg-blue-600 data-[selected]:text-white'
                                        )}
                                      >
                                        {month.label}
                                      </DatePicker.TableCellTrigger>
                                    </DatePicker.TableCell>
                                  ))}
                                </DatePicker.TableRow>
                              ))}
                          </DatePicker.TableBody>
                        </DatePicker.Table>
                      </>
                    )}
                  </DatePicker.Context>
                </DatePicker.View>

                <DatePicker.View view="year">
                  <DatePicker.Context>
                    {(api) => (
                      <>
                        <DatePicker.ViewControl className="mb-4 flex items-center justify-between">
                          <DatePicker.PrevTrigger className="rounded p-1 hover:bg-gray-100">
                            <ChevronLeftIcon className="h-4 w-4" />
                          </DatePicker.PrevTrigger>
                          <DatePicker.ViewTrigger className="rounded px-3 py-1 text-sm font-bold hover:bg-gray-100">
                            <DatePicker.RangeText />
                          </DatePicker.ViewTrigger>
                          <DatePicker.NextTrigger className="rounded p-1 hover:bg-gray-100">
                            <ChevronRightIcon className="h-4 w-4" />
                          </DatePicker.NextTrigger>
                        </DatePicker.ViewControl>

                        <DatePicker.Table>
                          <DatePicker.TableBody>
                            {api
                              .getYearsGrid({ columns: 4 })
                              .map((years, id) => (
                                <DatePicker.TableRow key={id}>
                                  {years.map((year, id) => (
                                    <DatePicker.TableCell
                                      key={id}
                                      value={year.value}
                                    >
                                      <DatePicker.TableCellTrigger
                                        className={classNames(
                                          'w-full rounded p-2 text-sm transition-colors hover:bg-blue-50',
                                          'data-[selected]:bg-blue-600 data-[selected]:text-white'
                                        )}
                                      >
                                        {year.label}
                                      </DatePicker.TableCellTrigger>
                                    </DatePicker.TableCell>
                                  ))}
                                </DatePicker.TableRow>
                              ))}
                          </DatePicker.TableBody>
                        </DatePicker.Table>
                      </>
                    )}
                  </DatePicker.Context>
                </DatePicker.View>
              </DatePicker.Content>
            </DatePicker.Positioner>
          </Portal>
        </DatePicker.Root>
      </div>

      {/* Time Picker Section (only show if withTime is true and not date-only) */}
      {withTime && displayFormat !== 'date' && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-gray-600">
            Time (Local Timezone)
          </div>
          <div className="flex items-center space-x-2">
            {/* Hour Select */}
            <div className="w-16">
              <Select.Root
                collection={hourCollection}
                value={[selectedHour]}
                onValueChange={handleHourChange}
                disabled={disabled}
                positioning={{ sameWidth: true }}
              >
                <Select.Control>
                  <Select.Trigger
                    className={classNames(
                      'flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm',
                      'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                      error
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300',
                      disabled
                        ? 'cursor-not-allowed bg-gray-50 text-gray-500'
                        : ''
                    )}
                    disabled={disabled}
                  >
                    <Select.ValueText placeholder="Hr" />
                    <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
                  </Select.Trigger>
                </Select.Control>

                <Portal>
                  <Select.Positioner>
                    <Select.Content className="z-50 max-h-60 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                      {hourOptions.map((option) => (
                        <Select.Item
                          key={option.value}
                          item={option}
                          className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-blue-50 data-[highlighted]:bg-blue-50"
                        >
                          <Select.ItemText>{option.label}</Select.ItemText>
                          <Select.ItemIndicator>
                            <CheckIcon className="h-4 w-4" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Portal>
              </Select.Root>
            </div>

            <span className="text-gray-500">:</span>

            {/* Minute Select */}
            <div className="w-16">
              <Select.Root
                collection={minuteCollection}
                value={[selectedMinute]}
                onValueChange={handleMinuteChange}
                disabled={disabled}
                positioning={{ sameWidth: true }}
              >
                <Select.Control>
                  <Select.Trigger
                    className={classNames(
                      'flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm',
                      'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                      error
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300',
                      disabled
                        ? 'cursor-not-allowed bg-gray-50 text-gray-500'
                        : ''
                    )}
                    disabled={disabled}
                  >
                    <Select.ValueText placeholder="Min" />
                    <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
                  </Select.Trigger>
                </Select.Control>

                <Portal>
                  <Select.Positioner>
                    <Select.Content className="z-50 max-h-60 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                      {minuteOptions.map((option) => (
                        <Select.Item
                          key={option.value}
                          item={option}
                          className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-blue-50 data-[highlighted]:bg-blue-50"
                        >
                          <Select.ItemText>{option.label}</Select.ItemText>
                          <Select.ItemIndicator>
                            <CheckIcon className="h-4 w-4" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Portal>
              </Select.Root>
            </div>

            {/* AM/PM Select */}
            <div className="w-20">
              <Select.Root
                collection={ampmCollection}
                value={[selectedAmPm]}
                onValueChange={handleAmPmChange}
                disabled={disabled}
                positioning={{ sameWidth: true }}
              >
                <Select.Control>
                  <Select.Trigger
                    className={classNames(
                      'flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm',
                      'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                      error
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300',
                      disabled
                        ? 'cursor-not-allowed bg-gray-50 text-gray-500'
                        : ''
                    )}
                    disabled={disabled}
                  >
                    <Select.ValueText placeholder="AM/PM" />
                    <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
                  </Select.Trigger>
                </Select.Control>

                <Portal>
                  <Select.Positioner>
                    <Select.Content className="z-50 max-h-60 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                      {ampmOptions.map((option) => (
                        <Select.Item
                          key={option.value}
                          item={option}
                          className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-blue-50 data-[highlighted]:bg-blue-50"
                        >
                          <Select.ItemText>{option.label}</Select.ItemText>
                          <Select.ItemIndicator>
                            <CheckIcon className="h-4 w-4" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Portal>
              </Select.Root>
            </div>
          </div>
        </div>
      )}

      {/* Current Selection Summary */}
      <div className="rounded-md bg-gray-50 p-3">
        <div className="mb-1 text-xs font-bold text-gray-600">
          Current Selection:
        </div>
        <div className="text-sm text-gray-900">{getDisplaySummary()}</div>
        {value > 0 && (
          <div className="mt-1 text-xs text-gray-500">
            UTC Timestamp: {value}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Help Text */}
      <p id={helpTextId} className="text-xs text-gray-500">
        <strong>⚠️ Timezone Info:</strong> All times are displayed in your local
        timezone but stored as UTC timestamps for consistency across time zones.
      </p>
    </div>
  );
};

export default DateTimeInput;
