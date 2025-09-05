import { navigate } from 'astro:transitions/client';
import { lispLexer } from '@/utils/actions/lispLexer';
import { preParseAction } from '@/utils/actions/preParse_Action';
import { preParseImpression } from '@/utils/actions/preParse_Impression';
import type { ImpressionNode } from '@/types/compositorTypes';
import type { BrandConfig } from '@/types/tractstack';

interface ImpressionProps {
  payload: ImpressionNode;
  currentPage: {
    id: string;
    slug: string;
    title: string;
  };
  config: BrandConfig;
}

const Impression = ({ payload, currentPage, config }: ImpressionProps) => {
  // Parse the actionsLisp to get button payload and action URL
  const thisButtonPayload = lispLexer(payload.actionsLisp);
  const actionPayload = preParseAction(
    thisButtonPayload,
    currentPage.slug,
    false, // isContext - using false as default
    config
  );

  // Create impression event using legacy logic
  const event = preParseImpression(
    payload.id,
    payload.title,
    currentPage.id, // using currentPage.id as parentId equivalent
    thisButtonPayload,
    config
  );

  const pushEvent = async function (): Promise<void> {
    if (!event) return;

    // Send analytics event (simplified V2 pattern)
    try {
      const tractStackConfig = window.TRACTSTACK_CONFIG;
      if (tractStackConfig?.sessionId) {
        const formData: { [key: string]: string } = {
          beliefId: payload.id,
          beliefType: 'Impression',
          beliefValue: 'CLICKED',
          paneId: payload.parentId || '',
        };

        await fetch(`${tractStackConfig.backendUrl}/api/v1/state`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Tenant-ID': tractStackConfig.tenantId,
            'X-TractStack-Session-ID': tractStackConfig.sessionId,
            'X-StoryFragment-ID': tractStackConfig.storyfragmentId,
          },
          body: new URLSearchParams(formData),
        });
      }
    } catch (error) {
      console.error('Failed to send impression analytics event:', error);
    }

    // Navigate to action URL if available
    if (actionPayload) {
      navigate(actionPayload);
    }
  };

  // Validate payload
  if (typeof payload !== 'object' || !payload) {
    return <div className="hidden" />;
  }

  // Legacy styling: simple container with inline text and link
  return (
    <div className="p-3">
      <h3 className="text-md font-action leading-6 text-black">
        {payload.title}
      </h3>
      <div className="xs:flex xs:items-start xs:justify-between mt-2">
        <div className="max-w-xl text-sm text-black">
          <p>
            {payload.body}
            {` `}
            <a
              onClick={() => pushEvent()}
              className="hover:text-myorange cursor-pointer text-black underline underline-offset-4"
              href={actionPayload || '#'}
            >
              {payload.buttonText}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Impression;
