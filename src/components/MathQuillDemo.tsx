import { useState } from 'react';
import { addStyles, EditableMathField } from 'react-mathquill';
import './Demo.css';

// Add MathQuill styles
addStyles();

const MathQuillDemo = () => {
  const [latex, setLatex] = useState('x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}');

  const handleChange = (mathField: any) => {
    setLatex(mathField.latex());
  };

  return (
    <div className="demo-container">
      <div className="demo-header">
        <h1>MathQuill Demo</h1>
        <p>Type or edit mathematical expressions using MathQuill</p>
      </div>
      
      <div className="demo-content">
        <div className="input-section">
          <h2>Math Input Field</h2>
          <div className="mathquill-wrapper">
            <EditableMathField
              latex={latex}
              onChange={handleChange}
              style={{
                fontSize: '24px',
                padding: '1rem',
                border: '2px solid #646cff',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                minHeight: '60px',
                width: '100%',
              }}
            />
          </div>
        </div>

        <div className="output-section">
          <h2>LaTeX Output</h2>
          <textarea
            value={latex}
            onChange={(e) => {
              setLatex(e.target.value);
            }}
            className="latex-output"
            rows={4}
            placeholder="LaTeX will appear here..."
          />
        </div>

        <div className="info-section">
          <h3>Features</h3>
          <ul>
            <li>Easy-to-use math editor</li>
            <li>Converts keystrokes to LaTeX</li>
            <li>Visual math editing interface</li>
            <li>Supports standard mathematical notation</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MathQuillDemo;

