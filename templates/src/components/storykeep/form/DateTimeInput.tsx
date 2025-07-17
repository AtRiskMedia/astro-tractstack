import { useId, useMemo, useState, useEffect } from 'react';
import { DatePicker } from '@ark-ui/react/date-picker';
import { NumberInput } from '@ark-ui/react/number-input';
import { Portal } from '@ark-ui/react/portal';
import {
  CalendarDate,
  CalendarDateTime,
  type DateValue,
} from '@internationalized/date';
import CalendarDaysIcon from '@heroicons/react/24/outline/CalendarDaysIcon';
import ChevronLeftIcon from '@heroicons/react/24/outline/ChevronLeftIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import { classNames } from '../../../utils/helpers';
import type { BaseFormComponentProps } from '../../../types/formTypes';

export interface DateTimeInputProps extends BaseFormComponentProps<number> {
  displayFormat?: 'date' | 'datetime' | 'time';
  min?: number;
  max?: number;
  withTime?: boolean;
  timeStep?: number;
}

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

  // Local state for time inputs - separate from DatePicker
  const [localHour12, setLocalHour12] = useState(6); // Default 6 PM
  const [localMinute, setLocalMinute] = useState(0);
  const [localIsPM, setLocalIsPM] = useState(true);

  // Sync local time state with the incoming value
  useEffect(() => {
    if (value && value > 0) {
      const localDate = new Date(value * 1000);
      const hour24 = localDate.getHours();
      const minute = localDate.getMinutes();

      setLocalHour12(hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24);
      setLocalMinute(minute);
      setLocalIsPM(hour24 >= 12);
    }
  }, [value]);

  // Helper to convert local time to UTC timestamp and call onChange
  const updateTimestamp = (
    hour12: number,
    minute: number,
    isPM: boolean,
    selectedDate?: DateValue
  ) => {
    // Convert 12-hour to 24-hour
    let hour24 = hour12;
    if (isPM && hour12 !== 12) {
      hour24 += 12;
    } else if (!isPM && hour12 === 12) {
      hour24 = 0;
    }

    // Use the selected date or current date value
    let targetDate: Date;
    if (selectedDate) {
      targetDate = new Date(
        'year' in selectedDate ? selectedDate.year : new Date().getFullYear(),
        'month' in selectedDate
          ? selectedDate.month - 1
          : new Date().getMonth(),
        'day' in selectedDate ? selectedDate.day : new Date().getDate(),
        hour24,
        minute
      );
    } else if (value && value > 0) {
      const existingDate = new Date(value * 1000);
      targetDate = new Date(
        existingDate.getFullYear(),
        existingDate.getMonth(),
        existingDate.getDate(),
        hour24,
        minute
      );
    } else {
      // Default to today with the specified time
      const today = new Date();
      targetDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        hour24,
        minute
      );
    }

    const utcTimestamp = Math.floor(targetDate.getTime() / 1000);
    onChange(utcTimestamp);
  };

  const dateValue = useMemo((): DateValue | undefined => {
    if (!value || value === 0) return undefined;

    // Convert UTC timestamp to local time for display
    const localDate = new Date(value * 1000);

    if (withTime && displayFormat !== 'date') {
      const year = localDate.getFullYear();
      const month = localDate.getMonth() + 1;
      const day = localDate.getDate();
      const hour = localDate.getHours();
      const minute = localDate.getMinutes();
      return new CalendarDateTime(year, month, day, hour, minute);
    } else {
      const year = localDate.getFullYear();
      const month = localDate.getMonth() + 1;
      const day = localDate.getDate();
      return new CalendarDate(year, month, day);
    }
  }, [value, withTime, displayFormat]);

  const minDate = useMemo((): DateValue | undefined => {
    if (!min) return undefined;
    const date = new Date(min * 1000);
    return new CalendarDate(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    );
  }, [min]);

  const maxDate = useMemo((): DateValue | undefined => {
    if (!max) return undefined;
    const date = new Date(max * 1000);
    return new CalendarDate(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    );
  }, [max]);

  const handleDateChange = (details: { value: DateValue[] }) => {
    if (!details.value || details.value.length === 0) {
      onChange(0);
      return;
    }

    const selectedDate = details.value[0];

    if (withTime && displayFormat !== 'date') {
      // Use current local time state with the new date
      updateTimestamp(localHour12, localMinute, localIsPM, selectedDate);
    } else {
      // For date-only, use noon local time
      const localDate = new Date(
        selectedDate.year,
        selectedDate.month - 1,
        selectedDate.day,
        12,
        0,
        0
      );
      const utcTimestamp = Math.floor(localDate.getTime() / 1000);
      onChange(utcTimestamp);
    }
  };

  const getDisplayValue = () => {
    if (!dateValue) return '';

    let localDate: Date;
    if ('hour' in dateValue && 'minute' in dateValue) {
      localDate = new Date(
        dateValue.year,
        dateValue.month - 1,
        dateValue.day,
        dateValue.hour,
        dateValue.minute
      );
    } else {
      localDate = new Date(dateValue.year, dateValue.month - 1, dateValue.day);
    }

    const formatOptions: Intl.DateTimeFormatOptions = {};

    switch (displayFormat) {
      case 'date':
        formatOptions.year = 'numeric';
        formatOptions.month = 'short';
        formatOptions.day = 'numeric';
        break;
      case 'time':
        formatOptions.hour = '2-digit';
        formatOptions.minute = '2-digit';
        break;
      case 'datetime':
      default:
        formatOptions.year = 'numeric';
        formatOptions.month = 'short';
        formatOptions.day = 'numeric';
        formatOptions.hour = '2-digit';
        formatOptions.minute = '2-digit';
        break;
    }

    return localDate.toLocaleDateString('en-US', formatOptions);
  };

  return (
    <div className={classNames('space-y-1', className || '')}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      <DatePicker.Root
        value={dateValue ? [dateValue] : undefined}
        onValueChange={handleDateChange}
        min={minDate}
        max={maxDate}
        disabled={disabled}
        closeOnSelect={false}
        positioning={{ sameWidth: true }}
      >
        <DatePicker.Control className="relative max-w-xs">
          <DatePicker.Input
            id={id}
            placeholder={placeholder}
            className={classNames(
              'w-full max-w-xs rounded-md border px-3 py-2 text-sm shadow-sm transition-colors',
              'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300',
              disabled ? 'cursor-not-allowed bg-gray-50 text-gray-500' : ''
            )}
            value={getDisplayValue()}
            readOnly
            disabled={disabled}
            aria-describedby={
              classNames(error ? errorId : '', helpTextId).trim() || undefined
            }
            aria-invalid={!!error}
            aria-required={required}
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
                        <DatePicker.ViewTrigger className="rounded px-3 py-1 text-sm font-medium hover:bg-gray-100">
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
                                className="p-2 text-center text-xs font-medium text-gray-500"
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
                                      'h-8 w-8 rounded text-sm transition-colors hover:bg-blue-50',
                                      'data-[selected]:bg-blue-600 data-[selected]:text-white',
                                      'data-[outside-range]:text-gray-300',
                                      'data-[today]:bg-gray-100 data-[today]:font-semibold'
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
                        <DatePicker.ViewTrigger className="rounded px-3 py-1 text-sm font-medium hover:bg-gray-100">
                          <DatePicker.RangeText />
                        </DatePicker.ViewTrigger>
                        <DatePicker.NextTrigger className="rounded p-1 hover:bg-gray-100">
                          <ChevronRightIcon className="h-4 w-4" />
                        </DatePicker.NextTrigger>
                      </DatePicker.ViewControl>

                      <DatePicker.Table>
                        <DatePicker.TableBody>
                          {api
                            .getMonthsGrid({ columns: 4, format: 'short' })
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
                        <DatePicker.ViewTrigger className="rounded px-3 py-1 text-sm font-medium hover:bg-gray-100">
                          <DatePicker.RangeText />
                        </DatePicker.ViewTrigger>
                        <DatePicker.NextTrigger className="rounded p-1 hover:bg-gray-100">
                          <ChevronRightIcon className="h-4 w-4" />
                        </DatePicker.NextTrigger>
                      </DatePicker.ViewControl>

                      <DatePicker.Table>
                        <DatePicker.TableBody>
                          {api.getYearsGrid({ columns: 4 }).map((years, id) => (
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

              {withTime && displayFormat !== 'date' && (
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <div className="mb-2 text-center text-xs text-gray-500">
                    Time selection (local timezone)
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <NumberInput.Root
                        value={localHour12.toString()}
                        onValueChange={(details) => {
                          const newHour = parseInt(details.value, 10);
                          if (
                            !isNaN(newHour) &&
                            newHour >= 1 &&
                            newHour <= 12
                          ) {
                            setLocalHour12(newHour);
                            updateTimestamp(newHour, localMinute, localIsPM);
                          }
                        }}
                        min={1}
                        max={12}
                        allowMouseWheel={false}
                      >
                        <NumberInput.Input className="w-14 rounded border px-2 py-1 text-center text-sm" />
                      </NumberInput.Root>
                      <span className="text-xs text-gray-500">hr</span>
                    </div>
                    <span className="text-gray-500">:</span>
                    <div className="flex items-center space-x-1">
                      <NumberInput.Root
                        value={localMinute.toString().padStart(2, '0')}
                        onValueChange={(details) => {
                          const newMinute = parseInt(details.value, 10);
                          if (
                            !isNaN(newMinute) &&
                            newMinute >= 0 &&
                            newMinute <= 59
                          ) {
                            setLocalMinute(newMinute);
                            updateTimestamp(localHour12, newMinute, localIsPM);
                          }
                        }}
                        min={0}
                        max={59}
                        allowMouseWheel={false}
                      >
                        <NumberInput.Input className="w-14 rounded border px-2 py-1 text-center text-sm" />
                      </NumberInput.Root>
                      <span className="text-xs text-gray-500">min</span>
                    </div>
                    <select
                      value={localIsPM ? 'PM' : 'AM'}
                      onChange={(e) => {
                        const newIsPM = e.target.value === 'PM';
                        setLocalIsPM(newIsPM);
                        updateTimestamp(localHour12, localMinute, newIsPM);
                      }}
                      className="rounded border px-2 py-1 text-sm"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              )}
            </DatePicker.Content>
          </DatePicker.Positioner>
        </Portal>
      </DatePicker.Root>

      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <p id={helpTextId} className="text-xs text-gray-500">
        <strong>⚠️ Local Timezone Alert:</strong> All dates/times are displayed
        in your local timezone but stored as UTC timestamps.
        {value > 0 && ` Current UTC timestamp: ${value}`}
      </p>
    </div>
  );
};

export default DateTimeInput;
