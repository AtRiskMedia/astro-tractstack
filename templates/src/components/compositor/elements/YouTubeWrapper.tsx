export const YouTubeWrapper = ({
  embedCode,
  title,
}: {
  embedCode: string;
  title: string;
}) => {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '0',
        paddingBottom: '56.25%',
      }}
    >
      <iframe
        src={`https://www.youtube.com/embed/${embedCode}`}
        title={title}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};
