// TractStack Counter Component - React Example
import { useState } from 'react';
import type { BaseComponentProps } from '../types/tractstack.ts';

interface CounterProps extends BaseComponentProps {
  /** Initial count value */
  initialCount?: number;

  /** Whether to sync with Go backend */
  syncWithBackend?: boolean;
}

export default function Counter({
  initialCount = 0,
  syncWithBackend = false,
  class: className = '',
  style
}: CounterProps) {
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleIncrement = async () => {
    if (syncWithBackend) {
      setIsLoading(true);
      try {
        // Example API call to Go backend
        const response = await fetch('/api/counter/increment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ current: count }),
        });

        if (response.ok) {
          const data = await response.json();
          setCount(data.count);
        } else {
          // Fallback to client-side increment
          setCount(prev => prev + 1);
        }
      } catch (error) {
        // Fallback to client-side increment
        setCount(prev => prev + 1);
      } finally {
        setIsLoading(false);
      }
    } else {
      setCount(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    setCount(prev => Math.max(0, prev - 1));
  };

  const handleReset = () => {
    setCount(initialCount);
  };

  return (
    <div
      className={`tractstack-counter ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem',
        border: '1px solid #ddd',
        borderRadius: '8px',
        background: '#f9f9f9',
        ...style
      }}
    >
      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', minWidth: '3rem', textAlign: 'center' }}>
        {count}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={handleDecrement}
          disabled={isLoading || count <= 0}
          style={{
            padding: '0.5rem 1rem',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: count <= 0 || isLoading ? 'not-allowed' : 'pointer',
            opacity: count <= 0 || isLoading ? 0.5 : 1,
          }}
        >
          −
        </button>

        <button
          onClick={handleIncrement}
          disabled={isLoading}
          style={{
            padding: '0.5rem 1rem',
            background: isLoading ? '#9ca3af' : '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? '...' : '+'}
        </button>

        <button
          onClick={handleReset}
          disabled={isLoading}
          style={{
            padding: '0.5rem 1rem',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          Reset
        </button>
      </div>

      {syncWithBackend && (
        <div style={{ fontSize: '0.8rem', color: '#666' }}>
          {isLoading ? 'Syncing...' : 'Backend sync enabled'}
        </div>
      )}
    </div>
  );
}
