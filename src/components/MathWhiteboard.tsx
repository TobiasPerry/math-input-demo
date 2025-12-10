import { useState } from 'react';
import MathLiveMultilineEditor from './MathLiveMultilineEditor';

/**
 * Normalizes LaTeX fractions so "\frac32" becomes "\frac{3}{2}".
 * MathLive can emit compact fractions; this makes them explicit for parsers.
 */
const normalizeLatexFractions = (line: string) =>
  line.replace(/\\frac\s*([^{\s])\s*([^{\s])/g, (_match, num, den) => `\\frac{${num}}{${den}}`);

const MathWhiteboard = () => {
  const [lines, setLines] = useState<string[]>(['']);

  const filteredLines = lines.filter(line => line.trim().length > 0);
  const normalizedLines = filteredLines.map(normalizeLatexFractions);

  const send = (type: string) => {
    const context = {
      equations: normalizedLines,
      raw: filteredLines,
    };
    console.log('[MathWhiteboard] postMessage', { type, context });
    if (typeof window !== 'undefined' && window.parent) {
      window.parent.postMessage({ type, context }, '*');
    }
  };

  const handleSendWork = () => send('whiteboard_submit');
  const handleRequestHint = () => send('whiteboard_hint');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        width: '100%',
        maxWidth: '960px',
        margin: '0 auto',
      }}
    >
      <h2 style={{ margin: 0, color: '#1f2937' }}>Math Whiteboard</h2>
      <p style={{ margin: 0, color: 'rgba(31, 41, 55, 0.8)' }}>
        Type your steps below. We’ll send LaTeX (normalized fractions) to the host app.
      </p>

      <MathLiveMultilineEditor
        initialEquations={lines}
        onChange={setLines}
        minLines={1}
        showLineNumbers
      />

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button
          onClick={handleRequestHint}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: '#f3f4f6',
            color: '#111827',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          💡 Request Hint
        </button>
        <button
          onClick={handleSendWork}
          style={{
            padding: '0.75rem 1.4rem',
            backgroundColor: '#4f46e5',
            color: 'white',
            border: '1px solid #4338ca',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          🚀 Send Work
        </button>
      </div>
    </div>
  );
};

export default MathWhiteboard;

