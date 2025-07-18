import { Switch } from '@ark-ui/react/switch';
import { classNames } from '@/utils/helpers';

interface BooleanToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  description?: string;
  required?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const BooleanToggle = ({
  value,
  onChange,
  label,
  error,
  disabled = false,
  description,
  required = false,
  className,
  size = 'md',
}: BooleanToggleProps) => {
  const handleCheckedChange = (details: { checked: boolean }) => {
    console.log('Toggle changed:', details.checked);
    onChange(details.checked);
  };

  // Simple inline styles for reliable animation
  const controlStyle = {
    width: size === 'sm' ? '28px' : size === 'lg' ? '44px' : '36px',
    height: size === 'sm' ? '16px' : size === 'lg' ? '24px' : '20px',
  };

  const thumbStyle = {
    width: size === 'sm' ? '12px' : size === 'lg' ? '20px' : '16px',
    height: size === 'sm' ? '12px' : size === 'lg' ? '20px' : '16px',
    transform: value
      ? `translateX(${size === 'sm' ? '12px' : size === 'lg' ? '20px' : '16px'})`
      : 'translateX(0px)',
    transition: 'transform 0.2s ease-in-out',
  };

  return (
    <div className={classNames('space-y-2', className || '')}>
      <Switch.Root
        checked={value}
        onCheckedChange={handleCheckedChange}
        disabled={disabled}
      >
        <div className="flex items-center space-x-3">
          <Switch.Control
            className={classNames(
              'relative inline-flex items-center rounded-full border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2',
              value ? 'bg-cyan-600' : 'bg-gray-200',
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            )}
            style={controlStyle}
          >
            <Switch.Thumb
              className="rounded-full bg-white shadow-lg"
              style={thumbStyle}
            />
          </Switch.Control>

          {(label || description) && (
            <div className="flex-1">
              {label && (
                <Switch.Label className="block cursor-pointer text-sm font-bold text-gray-700">
                  {label}
                  {required && <span className="ml-1 text-red-500">*</span>}
                </Switch.Label>
              )}
              {description && (
                <p className="mt-1 text-sm text-gray-500">{description}</p>
              )}
            </div>
          )}
        </div>
        <Switch.HiddenInput />
      </Switch.Root>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default BooleanToggle;
