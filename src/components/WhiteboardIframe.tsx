const WhiteboardIframe = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        height: '100vh',
        padding: '1rem',
        boxSizing: 'border-box',
      }}
    >
      <h2 style={{ margin: 0, color: '#1f2937' }}>Embedded Whiteboard</h2>
      <p style={{ margin: 0, color: 'rgba(31, 41, 55, 0.8)' }}>
        This loads the hosted whiteboard inside an iframe.
      </p>
      <div style={{ flex: 1, minHeight: 0 }}>
        <iframe
          title="Whiteboard Iframe"
          src="https://teclastaticwebsite.z21.web.core.windows.net/tools/whiteboard/dist/whiteboard.html"
          style={{
            width: '100%',
            height: '100%',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
          }}
          allow="clipboard-write"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default WhiteboardIframe;

