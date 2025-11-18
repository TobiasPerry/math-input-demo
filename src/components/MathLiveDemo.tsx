import { useRef, useEffect, useState } from 'react';
import 'mathlive';
import './Demo.css';

const MathLiveDemo = () => {
  const mathFieldRef = useRef<HTMLElement>(null);
  const [latex, setLatex] = useState('x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}');

  useEffect(() => {
    if (mathFieldRef.current) {
      const mathField = mathFieldRef.current as any;
      mathField.value = latex;
      
      mathField.addEventListener('input', (evt: any) => {
        setLatex(evt.target.value);
      });
    }
  }, []);

  const handleLatexChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newLatex = e.target.value;
    setLatex(newLatex);
    if (mathFieldRef.current) {
      (mathFieldRef.current as any).value = newLatex;
    }
  };

  return (
    <div className="demo-container">
      <div className="demo-header">
        <h1>MathLive Demo</h1>
        <p>Type or edit mathematical expressions using MathLive</p>
      </div>
      
      <div className="demo-content">
        <div className="input-section">
          <h2>Math Input Field</h2>
          <math-field
            ref={mathFieldRef}
            style={{
              fontSize: '32px',
              padding: '1rem',
              border: '2px solid #646cff',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              minHeight: '60px',
              width: '100%',
            }}
          ></math-field>
        </div>

        <div className="output-section">
          <h2>LaTeX Output</h2>
          <textarea
            value={latex}
            onChange={handleLatexChange}
            className="latex-output"
            rows={4}
            placeholder="LaTeX will appear here..."
          />
        </div>

        <div className="info-section">
          <h3>Features</h3>
          <ul>
            <li>Accessible math input with keyboard navigation</li>
            <li>Real-time LaTeX rendering</li>
            <li>Supports complex mathematical expressions</li>
            <li>Mobile-friendly touch input</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MathLiveDemo;

