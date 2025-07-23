import { useState, useEffect, useMemo } from 'react';
import ResponsiveLine from './ResponsiveLine';

interface DashboardActivityProps {
  data: Array<{
    id: string;
    data: Array<{ x: any; y: number }>;
  }>;
}

const DashboardActivity = ({ data }: DashboardActivityProps) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const processedData = useMemo(() => {
    if (!data) {
      return [];
    }
    const processed = data.map((series) => ({
      ...series,
      data: series.data
        .filter(
          (point) => point.x !== null && point.y !== null && point.y !== 0
        )
        .sort((a, b) => {
          // Sort by UTC timestamp if x is a date string, otherwise by number
          if (typeof a.x === 'string' && typeof b.x === 'string') {
            return new Date(a.x).getTime() - new Date(b.x).getTime();
          }
          return Number(a.x) - Number(b.x);
        }),
    }));
    return processed;
  }, [data]);

  if (!isClient) return null;

  if (!data || data.length === 0) {
    return <div>Loading activity data...</div>;
  }

  if (processedData.length === 0) return <div />;

  return (
    <>
      <div style={{ height: '400px' }}>
        <ResponsiveLine data={processedData} />
      </div>
    </>
  );
};

export default DashboardActivity;
