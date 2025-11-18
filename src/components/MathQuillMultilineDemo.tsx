import { useState } from 'react';
import { addStyles, EditableMathField } from 'react-mathquill';
import './Demo.css';

// Add MathQuill styles
addStyles();

interface Equation {
  id: number;
  latex: string;
}

const MathQuillMultilineDemo = () => {
  const [equations, setEquations] = useState<Equation[]>([
    { id: 1, latex: 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}' },
    { id: 2, latex: 'y = mx + b' },
    { id: 3, latex: 'E = mc^2' },
  ]);
  const [nextId, setNextId] = useState(4);

  const handleEquationChange = (id: number, mathField: any) => {
    setEquations(equations.map(eq => 
      eq.id === id ? { ...eq, latex: mathField.latex() } : eq
    ));
  };

  const handleAddEquation = () => {
    setEquations([...equations, { id: nextId, latex: '' }]);
    setNextId(nextId + 1);
  };

  const handleRemoveEquation = (id: number) => {
    setEquations(equations.filter(eq => eq.id !== id));
  };

  const handleLatexChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const lines = e.target.value.split('\n').filter(line => line.trim());
    const newEquations = lines.map((line, index) => ({
      id: equations[index]?.id || nextId + index,
      latex: line,
    }));
    if (newEquations.length > 0) {
      setEquations(newEquations);
      setNextId(Math.max(...newEquations.map(eq => eq.id)) + 1);
    }
  };

  return (
    <div className="demo-container">
      <div className="demo-header">
        <h1>MathQuill Multi-line Demo</h1>
        <p>Write multiple equations using MathQuill fields</p>
      </div>
      
      <div className="demo-content">
        <div className="input-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Equations</h2>
            <button
              onClick={handleAddEquation}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#646cff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              + Add Equation
            </button>
          </div>
          {equations.map((equation, index) => (
            <div
              key={equation.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1rem',
              }}
            >
              <span style={{ minWidth: '2rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                {index + 1}.
              </span>
              <div style={{ flex: 1 }}>
                <EditableMathField
                  latex={equation.latex}
                  onChange={(mathField) => handleEquationChange(equation.id, mathField)}
                  style={{
                    fontSize: '20px',
                    padding: '0.75rem',
                    border: '2px solid #646cff',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    minHeight: '50px',
                    width: '100%',
                  }}
                />
              </div>
              {equations.length > 1 && (
                <button
                  onClick={() => handleRemoveEquation(equation.id)}
                  style={{
                    padding: '0.5rem',
                    backgroundColor: '#ff6b6b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    minWidth: '2rem',
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="output-section">
          <h2>LaTeX Output (one per line)</h2>
          <textarea
            value={equations.map(eq => eq.latex).join('\n')}
            onChange={handleLatexChange}
            className="latex-output"
            rows={6}
            placeholder="Enter LaTeX equations, one per line..."
          />
        </div>

        <div className="info-section">
          <h3>Features</h3>
          <ul>
            <li>Multiple independent MathQuill fields</li>
            <li>Add or remove equations dynamically</li>
            <li>Each field supports full MathQuill features</li>
            <li>LaTeX output synchronized with all fields</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MathQuillMultilineDemo;

