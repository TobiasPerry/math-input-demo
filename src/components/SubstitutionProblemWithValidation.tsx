import { useState, useCallback, useEffect, useRef } from 'react';
import MathLiveMultilineEditor from './MathLiveMultilineEditor';
import { 
  validateProblem, 
  getHint, 
  validateAnswer,
  type ProblemValidationResponse,
  type HintResponse,
} from '../utils/validationApi';
import { latexArrayToPlainMath } from '../utils/latexToPlainMath';
import './Demo.css';

interface LineFeedback {
  isValid: boolean;
  isCorrect: boolean;
  feedback?: string;
  nextExpectedStep?: string;
}

const SubstitutionProblemWithValidation = () => {
  const [work, setWork] = useState<string[]>(['']);
  const [showSolution, setShowSolution] = useState(false);
  const [lineFeedback, setLineFeedback] = useState<Map<number, LineFeedback>>(new Map());
  const [overallProgress, setOverallProgress] = useState<{
    stepsCompleted: number;
    totalSteps: number;
    onTrack: boolean;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [hintLevel, setHintLevel] = useState<'gentle' | 'moderate' | 'strong' | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [expandedFeedbackLines, setExpandedFeedbackLines] = useState<Set<number>>(new Set());
  const validationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newLineValidationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const periodicValidationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastWorkRef = useRef<string[]>(['']);
  const currentWorkRef = useRef<string[]>(['']);
  const lastValidationTimeRef = useRef<number>(0);
  const newLineAddedRef = useRef<boolean>(false);
  const isValidationInProgressRef = useRef<boolean>(false);
  const MIN_TIME_BETWEEN_VALIDATIONS = 15000; // Minimum 15 seconds between any validations

  const problem = {
    type: 'substitution',
    title: 'System of Equations',
    description: 'Solve the following system of equations. Use any method you prefer:',
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

  // Validate work - only when new line added or periodic check
  const validateWork = useCallback(async (lines: string[], force: boolean = false) => {
    // Filter out empty lines for validation
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    
    if (nonEmptyLines.length === 0) {
      setLineFeedback(new Map());
      setOverallProgress(null);
      return;
    }

    // Check if validation is already in progress
    if (isValidationInProgressRef.current) {
      return;
    }

    // Check if we should validate
    const now = Date.now();
    const timeSinceLastValidation = now - lastValidationTimeRef.current;
    
    // Always enforce minimum time between validations
    if (timeSinceLastValidation < MIN_TIME_BETWEEN_VALIDATIONS) {
      return;
    }

    // Only validate if forced (new line added) - no periodic validation
    if (!force && !newLineAddedRef.current) {
      return;
    }

    // Mark validation as in progress
    isValidationInProgressRef.current = true;
    
    // Reset new line flag
    newLineAddedRef.current = false;
    lastValidationTimeRef.current = now;
    setIsValidating(true);
    
    try {
      const currentIndex = nonEmptyLines.length - 1;
      
      // Convert LaTeX to plain math notation before sending to API
      // MathLive outputs LaTeX (e.g., "3x+2y-2y=12-2\left(2x+1\right)")
      // but SymPy needs plain math notation (e.g., "3x+2y-2y=12-2(2x+1)")
      const plainMathLines = latexArrayToPlainMath(nonEmptyLines);
      
      // Validate the entire problem context
      const result: ProblemValidationResponse = await validateProblem(
        problem.type,
        { equations: problem.equations },
        plainMathLines,
        currentIndex
      );

      // Update line feedback - use the API result directly
      // The API should now handle equivalence checking internally
      const newFeedback = new Map(lineFeedback);
      const lineValidationResult = result.lineValidation;
      
      newFeedback.set(lineValidationResult.lineIndex, {
        isValid: lineValidationResult.isValid,
        isCorrect: lineValidationResult.isCorrect,
        feedback: lineValidationResult.feedback,
        nextExpectedStep: lineValidationResult.nextExpectedStep,
      });
      setLineFeedback(newFeedback);

      // Update overall progress (but don't show "onTrack" as it's too prescriptive)
      // Only show progress if it's meaningful, not based on following a specific path
      if (result.overallProgress) {
        setOverallProgress({
          ...result.overallProgress,
          onTrack: true, // Always show as on track - we don't want to penalize alternative approaches
        });
      }

      // Don't show "next step" suggestions - let students find their own path

      // Track work changes for hint system (but don't auto-suggest based on "onTrack")
      if (JSON.stringify(nonEmptyLines) !== JSON.stringify(lastWorkRef.current)) {
        // Work changed, clear stuck timer
        if (stuckTimerRef.current) {
          clearTimeout(stuckTimerRef.current);
        }
        lastWorkRef.current = [...nonEmptyLines];
      }

      // Check if this looks like a final answer
      // Use plain math version for pattern matching
      const lastLinePlain = plainMathLines[plainMathLines.length - 1].toLowerCase();
      if (lastLinePlain.includes('x =') && lastLinePlain.includes('y =')) {
        // Try to extract answer and validate
        try {
          const xMatch = lastLinePlain.match(/x\s*=\s*([^\s,]+)/);
          const yMatch = lastLinePlain.match(/y\s*=\s*([^\s,]+)/);
          
          if (xMatch && yMatch) {
            const answerResult = await validateAnswer(
              problem.type,
              { equations: problem.equations },
              {
                x: xMatch[1].trim(),
                y: yMatch[1].trim(),
              }
            );
            
            setIsAnswerCorrect(answerResult.isCorrect);
            setAnswerFeedback(answerResult.feedback || null);
          }
        } catch (error) {
          // Answer validation failed, ignore
          console.error('Answer validation error:', error);
        }
      }

    } catch (error) {
      console.error('Validation error:', error);
      // Show error to user in a non-intrusive way
      setLineFeedback(new Map());
    } finally {
      setIsValidating(false);
      isValidationInProgressRef.current = false;
    }
  }, [problem, lineFeedback]);

  // Detect when a new line is added (Enter pressed)
  const handleWorkChange = (newWork: string[]) => {
    const previousLength = work.filter(line => line.trim().length > 0).length;
    const newLength = newWork.filter(line => line.trim().length > 0).length;
    
    // Check if a new line was added (only trigger on actual new line, not every keystroke)
    const newLineAdded = newLength > previousLength;
    const lineDeleted = newLength < previousLength;
    
    // Update ref to track current work
    currentWorkRef.current = newWork;
    setWork(newWork);
    setHint(null); // Clear hint when work changes
    setAnswerFeedback(null);
    setIsAnswerCorrect(null);
    
    // If a line was deleted, clear any pending validation and don't validate
    if (lineDeleted) {
      if (newLineValidationTimeoutRef.current) {
        clearTimeout(newLineValidationTimeoutRef.current);
        newLineValidationTimeoutRef.current = null;
      }
      newLineAddedRef.current = false;
      return; // Don't validate when deleting
    }
    
    // Only validate if a new line was actually added (Enter pressed)
    // This prevents validation on every keystroke or when deleting
    if (newLineAdded) {
      newLineAddedRef.current = true;
      
      // Clear any pending validation timeout
      if (newLineValidationTimeoutRef.current) {
        clearTimeout(newLineValidationTimeoutRef.current);
      }
      
      // Use setTimeout to debounce slightly and ensure minimum time has passed
      const now = Date.now();
      const timeSinceLastValidation = now - lastValidationTimeRef.current;
      const delay = Math.max(0, MIN_TIME_BETWEEN_VALIDATIONS - timeSinceLastValidation);
      
      newLineValidationTimeoutRef.current = setTimeout(() => {
        validateWork(newWork, true);
        newLineValidationTimeoutRef.current = null;
      }, delay);
    } else {
      // If no new line was added (just editing existing line), clear the flag
      newLineAddedRef.current = false;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      if (newLineValidationTimeoutRef.current) {
        clearTimeout(newLineValidationTimeoutRef.current);
      }
      if (stuckTimerRef.current) {
        clearTimeout(stuckTimerRef.current);
      }
      if (periodicValidationRef.current) {
        clearInterval(periodicValidationRef.current);
      }
    };
  }, []);

  const handleGetHint = async () => {
    const nonEmptyLines = work.filter(line => line.trim().length > 0);
    if (nonEmptyLines.length === 0) return;

    // Convert LaTeX to plain math before sending to API
    const plainMathLines = latexArrayToPlainMath(nonEmptyLines);
    const lastLine = plainMathLines[plainMathLines.length - 1] || '';
    
    try {
      const hintResult: HintResponse = await getHint(
        problem.type,
        lastLine,
        plainMathLines.slice(0, -1)
      );
      setHint(hintResult.hint);
      setHintLevel(hintResult.level);
      // Don't show next step - let students find their own path
    } catch (error) {
      console.error('Error getting hint:', error);
      setHint('Unable to generate hint at this time. Please try again.');
    }
  };

  const getFeedbackColor = (isCorrect: boolean | null, isValid: boolean) => {
    if (isCorrect === true) return '#4caf50'; // Green
    if (isCorrect === false) return '#f44336'; // Red
    if (isValid) return '#2196f3'; // Blue
    return '#ff9800'; // Orange
  };

  const toggleFeedbackExpansion = (lineIndex: number) => {
    setExpandedFeedbackLines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lineIndex)) {
        newSet.delete(lineIndex);
      } else {
        newSet.add(lineIndex);
      }
      return newSet;
    });
  };

  const getFeedbackIcon = (feedback: LineFeedback) => {
    if (feedback.isCorrect) return '✓';
    if (feedback.isValid) return 'ℹ';
    return '⚠';
  };

  return (
    <div className="demo-container">
      <div className="demo-header">
        <h1>System of Equations with Validation</h1>
        <p>Solve the system of equations using any method you prefer. Get real-time feedback on your work!</p>
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

        {/* Progress Indicator - Only show if meaningful, don't penalize alternative approaches */}
        {overallProgress && overallProgress.totalSteps > 0 && (
          <div style={{
            padding: '1rem',
            backgroundColor: 'rgba(33, 150, 243, 0.2)',
            border: '1px solid rgba(33, 150, 243, 0.5)',
            borderRadius: '8px',
            marginBottom: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <strong>Work Progress:</strong>
              <span>{overallProgress.stepsCompleted} steps completed</span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.min((overallProgress.stepsCompleted / Math.max(overallProgress.totalSteps, 1)) * 100, 100)}%`,
                height: '100%',
                backgroundColor: '#2196f3',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.5rem', marginBottom: 0 }}>
              Keep going! There are many valid ways to solve this problem.
            </p>
          </div>
        )}

        {/* Hint Display */}
        {hint && (
          <div style={{
            padding: '1rem',
            backgroundColor: hintLevel === 'gentle' 
              ? 'rgba(33, 150, 243, 0.2)' 
              : hintLevel === 'moderate'
              ? 'rgba(255, 193, 7, 0.2)'
              : 'rgba(255, 152, 0, 0.2)',
            border: `1px solid ${
              hintLevel === 'gentle' 
                ? 'rgba(33, 150, 243, 0.5)' 
                : hintLevel === 'moderate'
                ? 'rgba(255, 193, 7, 0.5)'
                : 'rgba(255, 152, 0, 0.5)'
            }`,
            borderRadius: '8px',
            marginBottom: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <strong>💡 Hint ({hintLevel}):</strong> {hint}
              </div>
              <button
                onClick={() => setHint(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  padding: '0 0.5rem',
                }}
              >
                ×
              </button>
            </div>
          </div>
        )}


        {/* Answer Feedback */}
        {answerFeedback && (
          <div style={{
            padding: '1rem',
            backgroundColor: isAnswerCorrect 
              ? 'rgba(76, 175, 80, 0.2)' 
              : 'rgba(244, 67, 54, 0.2)',
            border: `1px solid ${isAnswerCorrect ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)'}`,
            borderRadius: '8px',
            marginBottom: '1rem',
          }}>
            <strong>{isAnswerCorrect ? '✓ Correct!' : '✗ Incorrect'}</strong> {answerFeedback}
          </div>
        )}

        {/* Student Work Area */}
        <div className="input-section">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1rem' 
          }}>
            <h2>Show Your Work</h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {isValidating && (
                <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Validating...
                </span>
              )}
              <button
                onClick={handleGetHint}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                💡 Get Hint
              </button>
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
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <MathLiveMultilineEditor
                initialEquations={work}
                onChange={handleWorkChange}
                minLines={1}
                showLineNumbers={true}
                virtualKeyboard={true}
                containerStyle={{
                  minHeight: '400px',
                }}
              />
            </div>
            
            {/* Feedback icons column */}
            {lineFeedback.size > 0 && (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.5rem',
                minWidth: '3rem',
                paddingTop: '0.5rem',
              }}>
                {Array.from(lineFeedback.entries()).map(([lineIndex, feedback]) => {
                  const iconColor = getFeedbackColor(feedback.isCorrect, feedback.isValid);
                  
                  return (
                    <div key={lineIndex} style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}>
                      <button
                        onClick={() => toggleFeedbackExpansion(lineIndex)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: iconColor,
                          fontSize: '1.5rem',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '2rem',
                          height: '2rem',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = iconColor + '20';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        title={`Line ${lineIndex + 1}: Click to see feedback`}
                      >
                        {getFeedbackIcon(feedback)}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Expanded feedback messages below (for better mobile experience) */}
          {Array.from(lineFeedback.entries())
            .filter(([lineIndex]) => expandedFeedbackLines.has(lineIndex))
            .map(([lineIndex, feedback]) => {
              const iconColor = getFeedbackColor(feedback.isCorrect, feedback.isValid);
              return (
                <div
                  key={`expanded-${lineIndex}`}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    backgroundColor: iconColor + '20',
                    border: `1px solid ${iconColor}`,
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    color: 'rgba(255, 255, 255, 0.9)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <strong>Line {lineIndex + 1}:</strong> {feedback.feedback || 
                        (feedback.isCorrect ? '✓ Correct!' : feedback.isValid ? 'Valid expression' : 'Needs review')}
                    </div>
                    <button
                      onClick={() => toggleFeedbackExpansion(lineIndex)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        padding: '0 0.5rem',
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          
          <div style={{ 
            marginTop: '0.5rem', 
            fontSize: '0.85rem', 
            color: 'rgba(255, 255, 255, 0.6)',
            fontStyle: 'italic',
          }}>
            💡 Tip: Press Enter to create a new line. Get real-time feedback as you work!
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
          <h3>How to Use</h3>
          <p style={{ marginBottom: '1rem', color: 'rgba(255, 255, 255, 0.8)' }}>
            You can solve this system of equations using any method you prefer:
          </p>
          <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8', marginBottom: '1rem' }}>
            <li><strong>Substitution:</strong> Solve one equation for a variable, then substitute into the other</li>
            <li><strong>Elimination:</strong> Add or subtract equations to eliminate a variable</li>
            <li><strong>Graphing:</strong> Graph both equations and find the intersection point</li>
            <li><strong>Your own method:</strong> Use any valid algebraic approach</li>
          </ul>
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(100, 108, 255, 0.1)', borderRadius: '8px' }}>
            <strong>💡 Validation Features:</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
              <li>Real-time feedback on each line of work</li>
              <li>Validates mathematical correctness, not solution method</li>
              <li>Get hints if you're stuck (click the hint button)</li>
              <li>Final answer validation when you're done</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubstitutionProblemWithValidation;

