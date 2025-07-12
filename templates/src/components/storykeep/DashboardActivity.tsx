import { useState, useEffect, useMemo } from "react";
import ResponsiveLine from "./ResponsiveLine";

interface DashboardActivityProps {
  data: Array<{
    id: string;
    data: Array<{ x: any; y: number }>;
  }>;
  duration: "daily" | "weekly" | "monthly";
}

const DashboardActivity = ({ data, duration }: DashboardActivityProps) => {
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
        .filter((point) => point.x !== null && point.y !== null && point.y !== 0)
        .sort((a, b) => Number(a.x) - Number(b.x)),
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
      <div style={{ height: "400px" }}>
        <ResponsiveLine data={processedData} duration={duration} />
      </div>
    </>
  );
};

export default DashboardActivity;
