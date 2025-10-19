import { useState, useEffect } from 'react';
import ActionBuilderTimeSelector from './ActionBuilderTimeSelector';

interface BunnyMomentSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function BunnyMomentSelector({
  value,
  onChange,
}: BunnyMomentSelectorProps) {
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [timestamp, setTimestamp] = useState('0');

  useEffect(() => {
    if (!value || value.trim() === '()') {
      setSelectedVideoId('');
      setTimestamp('0');
      return;
    }

    try {
      const match = value.match(/^\(\s*([^\s]+)\s+(\d+)\s*\)$/);
      if (match && match[1] && match[2]) {
        setSelectedVideoId(match[1]);
        setTimestamp(match[2]);
      } else {
        console.warn('Could not parse BunnyMoment value:', value);
        setSelectedVideoId('');
        setTimestamp('0');
      }
    } catch (e) {
      console.error('Error parsing value:', e);
      setSelectedVideoId('');
      setTimestamp('0');
    }
  }, [value]);

  const handleTimeSelect = (time: string, videoId?: string) => {
    const finalVideoId = videoId || selectedVideoId;
    if (!finalVideoId) return;

    setSelectedVideoId(finalVideoId);
    setTimestamp(time);
    updateValue(finalVideoId, time);
  };

  const updateValue = (videoId: string, time: string) => {
    if (!videoId) {
      onChange('');
      return;
    }
    onChange(`(bunnyMoment (${videoId} ${time}))`);
  };

  return (
    <div className="space-y-4">
      <ActionBuilderTimeSelector
        value={timestamp}
        videoId={selectedVideoId}
        onSelect={handleTimeSelect}
        label="Bunny Video Moment"
        placeholder="Select a video and timestamp"
      />
    </div>
  );
}
