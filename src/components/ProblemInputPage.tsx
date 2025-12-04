import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Demo.css';

type ProblemType = 'substitution' | 'factor' | 'simplify';

interface ProblemData {
  type: ProblemType;
  title?: string;
  description?: string;
  equations?: string[];
  expression?: string;
}

// Pre-generated problems
const PREGENERATED_PROBLEMS: Record<ProblemType, ProblemData[]> = {
  substitution: [
    {
      type: 'substitution',
      title: 'System of Equations - Easy',
      description: 'Solve the following system of equations. Use any method you prefer:',
      equations: ['y = 2x + 1', '3x + 2y = 12'],
    },
    {
      type: 'substitution',
      title: 'System of Equations - Medium',
      description: 'Solve the following system of equations:',
      equations: ['2x + y = 7', 'x - 3y = -11'],
    },
    {
      type: 'substitution',
      title: 'System of Equations - Hard',
      description: 'Solve the following system of equations:',
      equations: ['3x - 2y = 5', '5x + 4y = 1'],
    },
    {
      type: 'substitution',
      title: 'Word Problem - Ages',
      description: 'The sum of two numbers is 15. One number is 3 more than the other. Find both numbers.',
      equations: ['x + y = 15', 'x = y + 3'],
    },
  ],
  factor: [
    {
      type: 'factor',
      title: 'Difference of Squares - Basic',
      description: 'Factor the following expression using the difference of squares pattern:',
      expression: 'x^2 - 16',
    },
    {
      type: 'factor',
      title: 'Difference of Squares - Medium',
      description: 'Factor the following expression:',
      expression: '4x^2 - 25',
    },
    {
      type: 'factor',
      title: 'Difference of Squares - Advanced',
      description: 'Factor the following expression:',
      expression: '9a^2 - 16b^2',
    },
    {
      type: 'factor',
      title: 'Difference of Squares - Large Numbers',
      description: 'Factor the following expression:',
      expression: 'x^2 - 100',
    },
  ],
  simplify: [
    {
      type: 'simplify',
      title: 'Exponent Rules - Division',
      description: 'Simplify the following expression using exponent rules:',
      expression: 'x^4/x^2',
    },
    {
      type: 'simplify',
      title: 'Exponent Rules - Power of a Power',
      description: 'Simplify the following expression:',
      expression: '(x^3)^2',
    },
    {
      type: 'simplify',
      title: 'Combining Like Terms',
      description: 'Simplify the following expression by combining like terms:',
      expression: '2x + 3x - 5x',
    },
    {
      type: 'simplify',
      title: 'Distributive Property',
      description: 'Simplify the following expression:',
      expression: '3(x + 2) - 2x',
    },
    {
      type: 'simplify',
      title: 'Mixed Simplification',
      description: 'Simplify the following expression:',
      expression: '(x^2 * x^3) / x^2',
    },
  ],
};

const ProblemInputPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'custom' | 'pregenerated'>('pregenerated');
  const [problemType, setProblemType] = useState<ProblemType>('substitution');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [equations, setEquations] = useState<string[]>(['']);
  const [expression, setExpression] = useState('');

  const handleEquationChange = (index: number, value: string) => {
    const newEquations = [...equations];
    newEquations[index] = value;
    setEquations(newEquations);
  };

  const addEquation = () => {
    setEquations([...equations, '']);
  };

  const removeEquation = (index: number) => {
    if (equations.length > 1) {
      setEquations(equations.filter((_, i) => i !== index));
    }
  };

  const handleStart = (problemData?: ProblemData) => {
    let finalProblemData: ProblemData;

    if (problemData) {
      // Use provided pre-generated problem
      finalProblemData = problemData;
    } else {
      // Build from form inputs
      finalProblemData = {
        type: problemType,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
      };

      if (problemType === 'substitution') {
        const nonEmptyEquations = equations.filter(eq => eq.trim().length > 0);
        if (nonEmptyEquations.length === 0) {
          alert('Please enter at least one equation.');
          return;
        }
        finalProblemData.equations = nonEmptyEquations;
      } else if (problemType === 'factor' || problemType === 'simplify') {
        if (!expression.trim()) {
          alert('Please enter an expression.');
          return;
        }
        finalProblemData.expression = expression.trim();
      }
    }

    // Navigate to chat page with problem data
    navigate('/problem-chat', { 
      state: { problem: finalProblemData } 
    });
  };

  const pregeneratedProblems = PREGENERATED_PROBLEMS[problemType];

  return (
    <div className="demo-container">
      <div className="demo-content">
        <div className="input-section" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1>Select or Create Problem</h1>
          <p style={{ marginBottom: '2rem', color: 'rgba(255, 255, 255, 0.8)' }}>
            Choose a pre-generated problem or create your own custom problem.
          </p>

          {/* Mode Selection */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <button
                onClick={() => setMode('pregenerated')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  backgroundColor: mode === 'pregenerated' ? '#646cff' : 'rgba(100, 108, 255, 0.3)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                📚 Pre-generated Problems
              </button>
              <button
                onClick={() => setMode('custom')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  backgroundColor: mode === 'custom' ? '#646cff' : 'rgba(100, 108, 255, 0.3)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                ✏️ Create Custom
              </button>
            </div>
          </div>

          {/* Problem Type Dropdown */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Problem Type
            </label>
            <select
              value={problemType}
              onChange={(e) => {
                setProblemType(e.target.value as ProblemType);
                // Reset fields when type changes
                setEquations(['']);
                setExpression('');
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              <option value="substitution">Substitution (System of Equations)</option>
              <option value="factor">Factor (Difference of Squares)</option>
              <option value="simplify">Simplify (Algebraic Expressions)</option>
            </select>
          </div>

          {/* Pre-generated Problems */}
          {mode === 'pregenerated' && (
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 'bold' }}>
                Select a Problem
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pregeneratedProblems.map((problem, index) => (
                  <div
                    key={index}
                    onClick={() => handleStart(problem)}
                    style={{
                      padding: '1rem',
                      backgroundColor: 'rgba(100, 108, 255, 0.1)',
                      border: '1px solid rgba(100, 108, 255, 0.3)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(100, 108, 255, 0.2)';
                      e.currentTarget.style.borderColor = 'rgba(100, 108, 255, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(100, 108, 255, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(100, 108, 255, 0.3)';
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                      {problem.title}
                    </div>
                    {problem.description && (
                      <div style={{ marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                        {problem.description}
                      </div>
                    )}
                    {problem.equations && (
                      <div style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.95rem',
                        color: 'rgba(255, 255, 255, 0.9)',
                      }}>
                        {problem.equations.map((eq, i) => (
                          <div key={i} style={{ marginTop: i > 0 ? '0.25rem' : 0 }}>
                            {eq}
                          </div>
                        ))}
                      </div>
                    )}
                    {problem.expression && (
                      <div style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.95rem',
                        color: 'rgba(255, 255, 255, 0.9)',
                      }}>
                        {problem.expression}
                      </div>
                    )}
                    <div style={{ 
                      marginTop: '0.5rem', 
                      fontSize: '0.85rem', 
                      color: 'rgba(100, 108, 255, 0.8)',
                      fontStyle: 'italic',
                    }}>
                      Click to start →
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Problem Form */}
          {mode === 'custom' && (
            <>

          {/* Title (Optional) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., System of Equations"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                color: 'white',
              }}
            />
          </div>

          {/* Description (Optional) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Solve the following system of equations. Use any method you prefer:"
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                color: 'white',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Problem-specific inputs */}
          {problemType === 'substitution' && (
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Equations *
              </label>
              {equations.map((eq, index) => (
                <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={eq}
                    onChange={(e) => handleEquationChange(index, e.target.value)}
                    placeholder={`Equation ${index + 1} (e.g., y = 2x + 1)`}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      fontSize: '1rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      color: 'white',
                      fontFamily: 'monospace',
                    }}
                  />
                  {equations.length > 1 && (
                    <button
                      onClick={() => removeEquation(index)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addEquation}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#646cff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  marginTop: '0.5rem',
                }}
              >
                + Add Equation
              </button>
            </div>
          )}

          {(problemType === 'factor' || problemType === 'simplify') && (
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Expression *
              </label>
              <input
                type="text"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder={problemType === 'factor' ? "e.g., x^2 - 16" : "e.g., x^4/x^2"}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  color: 'white',
                  fontFamily: 'monospace',
                }}
              />
            </div>
          )}

              {/* Start Button */}
              <button
                onClick={() => handleStart()}
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginTop: '1rem',
                }}
              >
                🚀 Start Problem
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProblemInputPage;

