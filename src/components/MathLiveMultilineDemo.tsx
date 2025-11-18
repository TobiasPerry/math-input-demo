import { useState } from 'react';
import MathLiveMultilineEditor from './MathLiveMultilineEditor';
import './Demo.css';

const MathLiveMultilineDemo = () => {
  const [equations, setEquations] = useState([
    'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}',
    'y = mx + b',
    'E = mc^2',
  ]);

  const handleLatexChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const lines = e.target.value.split('\n');
    setEquations(lines.length > 0 ? lines : ['']);
  };

  return (
    <div className="demo-container">
      <div className="demo-header">
        <h1>MathLive Multi-line Demo</h1>
        <p>Type equations and press Enter to create a new line. Press the keyboard icon to open the math keyboard.</p>
      </div>
      
      <div className="demo-content">
        <div className="input-section">
          <h2>Equations</h2>
          <MathLiveMultilineEditor
            initialEquations={equations}
            onChange={setEquations}
            minLines={1}
            showLineNumbers={true}
            virtualKeyboard={true}
          />
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            💡 Tip: Press Enter to create a new line, Backspace on empty line to delete it
          </div>
        </div>

        <div className="output-section">
          <h2>LaTeX Output (one per line)</h2>
          <textarea
            value={equations.join('\n')}
            onChange={handleLatexChange}
            className="latex-output"
            rows={6}
            placeholder="Enter LaTeX equations, one per line..."
          />
        </div>

        <div className="info-section">
          <h3>Features</h3>
          <ul>
            <li>Press Enter to create a new equation line</li>
            <li>Press Backspace on empty line to delete it</li>
            <li>Numbered lines for easy reference</li>
            <li>Document-like seamless editing experience</li>
            <li>Virtual keyboard support (click keyboard icon in field)</li>
            <li>Auto-focus next line when pressing Enter</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MathLiveMultilineDemo;
