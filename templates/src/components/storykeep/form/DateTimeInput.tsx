import { useId, useMemo } from 'react';
import { DatePicker } from '@ark-ui/react/date-picker';
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
  /**
   * Display format for the date picker
   * - 'date': Date only
   * - 'datetime': Date and time
   * - 'time': Time only
   */
  displayFormat?: 'date' | 'datetime' | 'time';

  /**
   * Minimum selectable date (Unix timestamp)
   */
  min?: number;

  /**
   * Maximum selectable date (Unix timestamp)
   */
  max?: number;

  /**
   * Whether to show the time picker
   */
  withTime?: boolean;

  /**
   * Time step in minutes (for time picker)
   */
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

  // Convert Unix timestamp to CalendarDate/CalendarDateTime for Ark UI
  const dateValue = useMemo((): DateValue | undefined => {
    if (!value || value === 0) return undefined;

    // Create Date from UTC timestamp
    const utcDate = new Date(value * 1000);

    if (withTime && displayFormat !== 'date') {
      // Use CalendarDateTime for date + time - show in local timezone
      const year = utcDate.getFullYear();
      const month = utcDate.getMonth() + 1;
      const day = utcDate.getDate();
      const hour = utcDate.getHours();
      const minute = utcDate.getMinutes();
      return new CalendarDateTime(year, month, day, hour, minute);
    } else {
      // Use CalendarDate for date only - show in local timezone
      const year = utcDate.getFullYear();
      const month = utcDate.getMonth() + 1;
      const day = utcDate.getDate();
      return new CalendarDate(year, month, day);
    }
  }, [value, withTime, displayFormat]);

  // Convert min/max timestamps to CalendarDate objects (local timezone for display)
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

  // Handle date change - convert DateValue back to UTC Unix timestamp
  const handleDateChange = (details: { value: DateValue[] }) => {
    if (!details.value || details.value.length === 0) {
      onChange(0);
      return;
    }

    const selectedDate = details.value[0];

    // Convert to Date object in local timezone, then get UTC timestamp
    let localDate: Date;
    if ('hour' in selectedDate && 'minute' in selectedDate) {
      // CalendarDateTime or ZonedDateTime with time - treat as local time
      localDate = new Date(
        selectedDate.year,
        selectedDate.month - 1,
        selectedDate.day,
        selectedDate.hour,
        selectedDate.minute
      );
    } else {
      // CalendarDate - use noon local time to avoid timezone edge cases
      localDate = new Date(
        selectedDate.year,
        selectedDate.month - 1,
        selectedDate.day,
        12,
        0,
        0
      );
    }

    // Get UTC timestamp (getTime() returns UTC milliseconds)
    const timestamp = Math.floor(localDate.getTime() / 1000);
    onChange(timestamp);
  };

  // Format display value
  const getDisplayValue = () => {
    if (!dateValue) return '';

    // Convert DateValue to JS Date for formatting (already in local timezone)
    let localDate: Date;
    if ('hour' in dateValue && 'minute' in dateValue) {
      // CalendarDateTime or ZonedDateTime
      localDate = new Date(
        dateValue.year,
        dateValue.month - 1,
        dateValue.day,
        dateValue.hour,
        dateValue.minute
      );
    } else {
      // CalendarDate
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
        positioning={{ sameWidth: true }}
      >
        <DatePicker.Control className="relative">
          <DatePicker.Input
            id={id}
            placeholder={placeholder}
            className={classNames(
              'w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors',
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
              {/* Calendar View */}
              <DatePicker.View view="day">
                <DatePicker.Context>
                  {(api) => (
                    <>
                      {/* Month/Year Header */}
                      <div className="mb-4 flex items-center justify-between">
                        <DatePicker.PrevTrigger className="rounded p-1 hover:bg-gray-100">
                          <ChevronLeftIcon className="h-4 w-4" />
                        </DatePicker.PrevTrigger>

                        <div className="flex items-center space-x-2">
                          <DatePicker.ViewTrigger className="rounded px-3 py-1 text-sm font-medium hover:bg-gray-100">
                            {api.focusedValue.month}/{api.focusedValue.year}
                          </DatePicker.ViewTrigger>
                        </div>

                        <DatePicker.NextTrigger className="rounded p-1 hover:bg-gray-100">
                          <ChevronRightIcon className="h-4 w-4" />
                        </DatePicker.NextTrigger>
                      </div>

                      {/* Days Grid */}
                      <DatePicker.Table className="w-full">
                        <DatePicker.TableHead>
                          <DatePicker.TableRow className="grid grid-cols-7 gap-1">
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
                            <DatePicker.TableRow
                              key={id}
                              className="grid grid-cols-7 gap-1"
                            >
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

              {/* Month View */}
              <DatePicker.View view="month">
                <DatePicker.Context>
                  {(api) => (
                    <>
                      <div className="mb-4 flex items-center justify-between">
                        <DatePicker.PrevTrigger className="rounded p-1 hover:bg-gray-100">
                          <ChevronLeftIcon className="h-4 w-4" />
                        </DatePicker.PrevTrigger>

                        <DatePicker.ViewTrigger className="rounded px-3 py-1 text-sm font-medium hover:bg-gray-100">
                          {api.focusedValue.year}
                        </DatePicker.ViewTrigger>

                        <DatePicker.NextTrigger className="rounded p-1 hover:bg-gray-100">
                          <ChevronRightIcon className="h-4 w-4" />
                        </DatePicker.NextTrigger>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {api.getMonths().map((month, id) => (
                          <DatePicker.TableCell key={id} value={month.value}>
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
                      </div>
                    </>
                  )}
                </DatePicker.Context>
              </DatePicker.View>

              {/* Year View */}
              <DatePicker.View view="year">
                <DatePicker.Context>
                  {(api) => (
                    <>
                      <div className="mb-4 flex items-center justify-between">
                        <DatePicker.PrevTrigger className="rounded p-1 hover:bg-gray-100">
                          <ChevronLeftIcon className="h-4 w-4" />
                        </DatePicker.PrevTrigger>

                        <span className="px-3 py-1 text-sm font-medium">
                          {api.getDecade().start} - {api.getDecade().end}
                        </span>

                        <DatePicker.NextTrigger className="rounded p-1 hover:bg-gray-100">
                          <ChevronRightIcon className="h-4 w-4" />
                        </DatePicker.NextTrigger>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {api.getYears().map((year, id) => (
                          <DatePicker.TableCell key={id} value={year.value}>
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
                      </div>
                    </>
                  )}
                </DatePicker.Context>
              </DatePicker.View>

              {/* Time Picker (if enabled) */}
              {withTime && displayFormat !== 'date' && (
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <div className="mb-2 text-center text-xs text-gray-500">
                    Time selection (use +/- buttons or type values)
                  </div>
                  <DatePicker.Context>
                    {(api) => (
                      <div className="flex items-center justify-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={
                            api.value[0] && 'hour' in api.value[0]
                              ? api.value[0].hour
                              : 12
                          }
                          onChange={(e) => {
                            const hour = parseInt(e.target.value, 10);
                            if (
                              api.value[0] &&
                              'hour' in api.value[0] &&
                              'minute' in api.value[0]
                            ) {
                              const current = api.value[0];
                              const newDateTime = new CalendarDateTime(
                                current.year,
                                current.month,
                                current.day,
                                isNaN(hour)
                                  ? 0
                                  : Math.max(0, Math.min(23, hour)),
                                current.minute
                              );
                              api.setValue([newDateTime] as any);
                            }
                          }}
                          className="w-12 rounded border px-2 py-1 text-center text-sm"
                        />
                        <span className="text-gray-500">:</span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={
                            api.value[0] && 'minute' in api.value[0]
                              ? api.value[0].minute
                              : 0
                          }
                          onChange={(e) => {
                            const minute = parseInt(e.target.value, 10);
                            if (
                              api.value[0] &&
                              'hour' in api.value[0] &&
                              'minute' in api.value[0]
                            ) {
                              const current = api.value[0];
                              const newDateTime = new CalendarDateTime(
                                current.year,
                                current.month,
                                current.day,
                                current.hour,
                                isNaN(minute)
                                  ? 0
                                  : Math.max(0, Math.min(59, minute))
                              );
                              api.setValue([newDateTime] as any);
                            }
                          }}
                          className="w-12 rounded border px-2 py-1 text-center text-sm"
                        />
                      </div>
                    )}
                  </DatePicker.Context>
                </div>
              )}
            </DatePicker.Content>
          </DatePicker.Positioner>
        </Portal>
      </DatePicker.Root>

      {/* Error Message */}
      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Help Text */}
      <p id={helpTextId} className="text-xs text-gray-500">
        {displayFormat === 'date' && 'Select a date (displayed in local time)'}
        {displayFormat === 'datetime' &&
          'Select date and time (displayed in local time, stored as UTC)'}
        {displayFormat === 'time' && 'Select a time (displayed in local time)'}
        {value > 0 && ` (UTC Timestamp: ${value})`}
      </p>
    </div>
  );
};

export default DateTimeInput;
