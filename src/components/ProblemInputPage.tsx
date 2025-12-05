import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Demo.css';
import ProblemBrowser from './ProblemBrowser.tsx';
import {
  createProblem,
  type ProblemPayload,
  type ProblemRecord,
  type ProblemType,
} from '../utils/validationApi';

interface ProblemData {
  type: ProblemType;
  title?: string;
  description?: string;
  equations?: string[];
  expression?: string;
}

const mapProblemRecordToProblemData = (problem: ProblemRecord): ProblemData => {
  const data = problem.problemData || {};
  return {
    type: problem.type,
    title: problem.title ?? data.title,
    description: problem.description ?? data.description,
    equations: data.equations ?? problem.equations,
    expression: data.expression ?? problem.expression,
  };
};

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
      description:
        'The sum of two numbers is 15. One number is 3 more than the other. Find both numbers.',
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
  arithmetic: [
    {
      type: 'arithmetic',
      title: 'BODMAS - Basic',
      description: 'Evaluate the following expression using BODMAS (order of operations):',
      expression: '2 + 3 × 4',
    },
    {
      type: 'arithmetic',
      title: 'BODMAS - With Parentheses',
      description: 'Evaluate the following expression:',
      expression: '(5 + 3) × 2 - 1',
    },
    {
      type: 'arithmetic',
      title: 'BODMAS - Mixed Operations',
      description: 'Evaluate the following expression:',
      expression: '10 - 2 × 3 + 1',
    },
    {
      type: 'arithmetic',
      title: 'BODMAS - Advanced',
      description: 'Evaluate the following expression:',
      expression: '2 × (3 + 4) - 5 ÷ 1',
    },
    {
      type: 'arithmetic',
      title: 'Fraction Addition - Basic',
      description: 'Add the following fractions:',
      expression: '1/2 + 1/3',
    },
    {
      type: 'arithmetic',
      title: 'Fraction Addition - Mixed',
      description: 'Add the following fractions:',
      expression: '3/4 + 1/2',
    },
    {
      type: 'arithmetic',
      title: 'Fraction Subtraction',
      description: 'Subtract the following fractions:',
      expression: '2/3 - 1/4',
    },
    {
      type: 'arithmetic',
      title: 'Fraction Addition - Three Terms',
      description: 'Add the following fractions:',
      expression: '1/2 + 1/4 + 1/8',
    },
  ],
};

const ProblemInputPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'custom' | 'pregenerated'>('pregenerated');
  const [problemType, setProblemType] = useState<ProblemType>('substitution');
  const [problemCode, setProblemCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [equations, setEquations] = useState<string[]>(['']);
  const [expression, setExpression] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const isEquationType = (type: ProblemType) => type === 'substitution';

  const buildPayloadFromForm = (): ProblemPayload | null => {
    const trimmedCode = problemCode.trim();
    if (!trimmedCode) {
      setSubmitError('Please enter a problem code (unique id).');
      return null;
    }

    const payload: ProblemPayload = {
      problem_code: trimmedCode,
      type: problemType,
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      metadata: {
        source: 'ui',
      },
    };

    if (isEquationType(problemType)) {
      const nonEmptyEquations = equations.filter(eq => eq.trim().length > 0);
      if (nonEmptyEquations.length === 0) {
        setSubmitError('Please enter at least one equation.');
        return null;
      }
      payload.equations = nonEmptyEquations;
    } else {
      if (!expression.trim()) {
        setSubmitError('Please enter an expression.');
        return null;
      }
      payload.expression = expression.trim();
    }

    return payload;
  };

  const handleStartFromProblem = (problemData: ProblemData) => {
    navigate('/problem-chat', {
      state: { problem: problemData },
    });
  };

  const handleCreateCustomProblem = async () => {
    setSubmitError(null);
    setSubmitStatus(null);

    const payload = buildPayloadFromForm();
    if (!payload) {
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createProblem(payload);
      setSubmitStatus(
        created?.problem_code
          ? `Created problem "${created.problem_code}" via API.`
          : 'Created problem via API.'
      );

      const record: ProblemRecord = created?.problem_code
        ? created
        : {
            ...payload,
            problemData: {
              title: payload.title,
              description: payload.description,
              equations: payload.equations,
              expression: payload.expression,
              metadata: payload.metadata,
            },
          };

      const problemForChat = mapProblemRecordToProblemData(record);
      handleStartFromProblem(problemForChat);
    } catch (error) {
      console.error('Problem creation failed:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to create problem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pregeneratedProblems = PREGENERATED_PROBLEMS[problemType];

  return (
    <div className="demo-container">
      <div className="demo-content">
        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <div
            className="input-section"
            style={{ flex: '1 1 0', minWidth: '340px', maxWidth: '100%' }}
          >
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
                setSubmitError(null);
                setSubmitStatus(null);
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
              <option value="arithmetic">Arithmetic (BODMAS & Fractions)</option>
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
                    onClick={() => handleStartFromProblem(problem)}
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
          {/* Problem Code */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Problem Code *
            </label>
            <input
              type="text"
              value={problemCode}
              onChange={(e) => setProblemCode(e.target.value)}
              placeholder="e.g., sys-001"
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
            <small style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              This is the unique id stored in your Problems API.
            </small>
          </div>

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

          {!isEquationType(problemType) && (
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Expression *
              </label>
              <input
                type="text"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder={
                  problemType === 'factor'
                    ? 'e.g., x^2 - 16'
                    : problemType === 'simplify'
                    ? 'e.g., x^4/x^2'
                    : 'e.g., 2 + 3 × 4 or 1/2 + 1/3'
                }
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
                onClick={() => void handleCreateCustomProblem()}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  marginTop: '1rem',
                  opacity: isSubmitting ? 0.8 : 1,
                }}
              >
                {isSubmitting ? 'Saving...' : '🚀 Save & Start'}
              </button>
              {submitStatus && (
                <div style={{ marginTop: '0.75rem', color: '#7ee1a8', fontSize: '0.95rem' }}>
                  {submitStatus}
                </div>
              )}
              {submitError && (
                <div style={{ marginTop: '0.75rem', color: '#ff9e9e', fontSize: '0.95rem' }}>
                  {submitError}
                </div>
              )}
            </>
          )}
          </div>
          <div
            className="input-section"
            style={{ flex: '1 1 0', minWidth: '340px', maxWidth: '100%' }}
          >
            <h2 style={{ marginBottom: '0.5rem' }}>Problems API Browser</h2>
            <p style={{ marginBottom: '1rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              Fetch, edit, or delete problems stored via your API. You can open any
              problem in the chat or refresh the list to pull the latest changes.
            </p>
            <ProblemBrowser />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemInputPage;

