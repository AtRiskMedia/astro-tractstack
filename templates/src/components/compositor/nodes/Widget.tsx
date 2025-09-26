import { memo, type ReactElement } from 'react';
import { getCtx, NodesContext } from '@/stores/nodes';
import { viewportKeyStore } from '@/stores/storykeep';
import { Belief } from '@/components/compositor/elements/Belief';
import { IdentifyAs } from '@/components/compositor/elements/IdentifyAs';
import { ToggleBelief } from '@/components/compositor/elements/ToggleBelief';
import { YouTubeWrapper } from '@/components/compositor/elements/YouTubeWrapper';
import { SignUp } from '@/components/compositor/elements/SignUp';
import BunnyVideo from '@/components/compositor/elements/BunnyVideo';

export interface WidgetProps {
  nodeId: string;
  ctx?: NodesContext;
  hook: string | null;
  value1: string | null;
  value2: string | null;
  value3: string;
}

const getWidgetElement = (
  props: WidgetProps,
  classNames: string
): ReactElement | null => {
  const { hook, value1, value2, value3, nodeId } = props;
  if (!hook || !value1) return null;

  switch (hook) {
    case 'youtube':
      return value2 ? (
        <div className={`${classNames} pointer-events-none`}>
          <YouTubeWrapper embedCode={value1} title={value2} />
        </div>
      ) : null;

    case 'signup':
      return (
        <div className={`${classNames} pointer-events-none`}>
          <SignUp
            id={nodeId}
            persona={value1 ?? 'Major Updates Only'}
            prompt={value2 ?? 'Keep in touch!'}
            clarifyConsent={value3 === 'true'}
          />
        </div>
      );

    case 'belief':
      return value2 ? (
        <div className={`${classNames} pointer-events-none`}>
          <Belief value={{ slug: value1, scale: value2, extra: value3 }} />
        </div>
      ) : null;

    case 'identifyAs':
      return value2 ? (
        <IdentifyAs
          classNames={`${classNames} pointer-events-none`}
          value={{ slug: value1, target: value2, extra: value3 || `` }}
        />
      ) : null;

    case 'toggle':
      return value2 ? (
        <div className={`${classNames} pointer-events-none`}>
          <ToggleBelief prompt={value2} />
        </div>
      ) : null;

    case 'resource':
      return (
        <div className={`${classNames} pointer-events-none`}>
          <div>
            <strong>Resource Template (not yet implemented):</strong> {value1},{' '}
            {value2}
          </div>
        </div>
      );

    case 'bunny':
      return value1 ? (
        <div className={`${classNames} pointer-events-none`}>
          <BunnyVideo videoId={value1} title={value2 || 'Bunny Video'} />
        </div>
      ) : null;

    default:
      return null;
  }
};

export const Widget = memo((props: WidgetProps) => {
  const classNames = getCtx(props).getNodeClasses(
    props.nodeId,
    viewportKeyStore.get().value
  );
  const content = getWidgetElement(props, classNames);
  if (!content) return null;

  return (
    <div
      contentEditable={false}
      suppressContentEditableWarning={true}
      onClick={(e) => {
        getCtx(props).setClickedNodeId(props.nodeId);
        e.stopPropagation();
      }}
      onDoubleClick={(e) => {
        getCtx(props).setClickedNodeId(props.nodeId, true);
        e.stopPropagation();
      }}
    >
      {content}
    </div>
  );
});
