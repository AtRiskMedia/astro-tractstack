import { useEffect } from 'react';
import Cal, { getCalApi } from '@calcom/embed-react';

interface CalDotComBookingProps {
  calSlug: string;
  traceId: string;
  name: string;
  email: string;
  onSuccess: () => void;
}

export default function CalDotComBooking({
  calSlug,
  traceId,
  name,
  email,
  onSuccess,
}: CalDotComBookingProps) {
  useEffect(() => {
    (async function () {
      const cal = await getCalApi();
      cal('on', {
        action: 'bookingSuccessful',
        callback: () => {
          onSuccess();
        },
      });
    })();
  }, [onSuccess]);

  return (
    <Cal
      calLink={calSlug}
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
      config={{
        name,
        email,
        metadata: {
          traceId,
        },
      }}
    />
  );
}
