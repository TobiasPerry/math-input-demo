import { useState } from 'react';
import MathLiveMultilineEditor from './MathLiveMultilineEditor';
import './Demo.css';

const SubstitutionProblemDemo = () => {
  const [work, setWork] = useState<string[]>(['']);
  const [showSolution, setShowSolution] = useState(false);

  const problem = {
    title: 'Substitution Method',
    description: 'Solve the following system of equations using the substitution method:',
    equations: [
      'y = 2x + 1',
      '3x + 2y = 12',
    ],
    solution: [
      'Step 1: Substitute the first equation into the second',
      '3x + 2(2x + 1) = 12',
      'Step 2: Distribute',
      '3x + 4x + 2 = 12',
      'Step 3: Combine like terms',
      '7x + 2 = 12',
      'Step 4: Solve for x',
      '7x = 10',
      'x = \\frac{10}{7}',
      'Step 5: Substitute back to find y',
      'y = 2(\\frac{10}{7}) + 1',
      'y = \\frac{20}{7} + \\frac{7}{7}',
      'y = \\frac{27}{7}',
      'Step 6: Final answer',
      'x = \\frac{10}{7}, \\quad y = \\frac{27}{7}',
    ],
  };

  return (
    <div className="demo-container">
      <div className="demo-header">
        <h1>Substitution Problem Demo</h1>
        <p>Practice solving systems of equations using the substitution method</p>
      </div>

      <div className="demo-content">
        {/* Problem Statement */}
        <div className="input-section" style={{ marginBottom: '2rem' }}>
          <h2>Problem</h2>
          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: 'rgba(100, 108, 255, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(100, 108, 255, 0.3)',
          }}>
            <p style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
              {problem.description}
            </p>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.5rem',
              fontFamily: 'monospace',
              fontSize: '1.2rem',
            }}>
              {problem.equations.map((eq, i) => (
                <div key={i} style={{ padding: '0.5rem' }}>
                  {eq}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Student Work Area */}
        <div className="input-section">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1rem' 
          }}>
            <h2>Show Your Work</h2>
            <button
              onClick={() => setShowSolution(!showSolution)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: showSolution ? '#ff6b6b' : '#646cff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              {showSolution ? 'Hide Solution' : 'Show Solution'}
            </button>
          </div>
          
          <MathLiveMultilineEditor
            initialEquations={work}
            onChange={setWork}
            minLines={1}
            showLineNumbers={true}
            virtualKeyboard={true}
            containerStyle={{
              minHeight: '400px',
            }}
          />
          
          <div style={{ 
            marginTop: '0.5rem', 
            fontSize: '0.85rem', 
            color: 'rgba(255, 255, 255, 0.6)',
            fontStyle: 'italic',
          }}>
            💡 Tip: Press Enter to create a new line. Use the keyboard icon to access math symbols.
          </div>
        </div>

        {/* Solution (Hidden by default) */}
        {showSolution && (
          <div className="info-section" style={{ marginTop: '2rem' }}>
            <h3>Solution</h3>
            <div style={{ 
              padding: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              marginTop: '1rem',
            }}>
              <MathLiveMultilineEditor
                initialEquations={problem.solution}
                onChange={() => {}} // Read-only
                minLines={problem.solution.length}
                showLineNumbers={true}
                virtualKeyboard={false}
                containerStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  pointerEvents: 'none',
                  opacity: 0.9,
                }}
              />
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="info-section" style={{ marginTop: '2rem' }}>
          <h3>Instructions</h3>
          <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
            <li>Substitute one equation into the other</li>
            <li>Solve for one variable</li>
            <li>Substitute back to find the other variable</li>
            <li>Check your answer by plugging both values into the original equations</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default SubstitutionProblemDemo;

