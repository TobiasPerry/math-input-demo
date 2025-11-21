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

const DifferenceOfSquaresProblem = () => {
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
    type: 'factor',
    title: 'Difference of Squares',
    description: 'Factor the following expression using the difference of squares pattern:',
    expression: 'x^2 - 16',
    solution: [
      'Step 1: Identify the pattern',
      'x^2 - 16 = x^2 - 4^2',
      'Step 2: Apply difference of squares formula',
      'a^2 - b^2 = (a + b)(a - b)',
      'Step 3: Substitute a = x and b = 4',
      'x^2 - 16 = (x + 4)(x - 4)',
      'Step 4: Final answer',
      '(x + 4)(x - 4)',
    ],
  };

  // Validate work - only when new line added
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

    // Only validate if forced (new line added)
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
      const plainMathLines = latexArrayToPlainMath(nonEmptyLines);
      
      // Validate the entire problem context
      const result: ProblemValidationResponse = await validateProblem(
        problem.type,
        { expression: problem.expression },
        plainMathLines,
        currentIndex
      );

      // Update line feedback - use the API result directly
      const newFeedback = new Map(lineFeedback);
      const lineValidationResult = result.lineValidation;
      
      newFeedback.set(lineValidationResult.lineIndex, {
        isValid: lineValidationResult.isValid,
        isCorrect: lineValidationResult.isCorrect,
        feedback: lineValidationResult.feedback,
        nextExpectedStep: lineValidationResult.nextExpectedStep,
      });
      setLineFeedback(newFeedback);

      // Update overall progress
      if (result.overallProgress) {
        setOverallProgress({
          ...result.overallProgress,
          onTrack: true, // Always show as on track
        });
      }

      // Track work changes for hint system
      if (JSON.stringify(nonEmptyLines) !== JSON.stringify(lastWorkRef.current)) {
        if (stuckTimerRef.current) {
          clearTimeout(stuckTimerRef.current);
        }
        lastWorkRef.current = [...nonEmptyLines];
      }

      // Check if this looks like a final answer (factored form)
      const lastLinePlain = plainMathLines[plainMathLines.length - 1].toLowerCase();
      if (lastLinePlain.includes('(') && lastLinePlain.includes(')')) {
        // Try to validate the factored form
        try {
          const answerResult = await validateAnswer(
            problem.type,
            { expression: problem.expression },
            {
              factored: lastLinePlain,
            }
          );
          
          setIsAnswerCorrect(answerResult.isCorrect);
          setAnswerFeedback(answerResult.feedback || null);
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
        <h1>Difference of Squares with Validation</h1>
        <p>Factor the expression using the difference of squares pattern. Get real-time feedback on your work!</p>
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
              fontFamily: 'monospace',
              fontSize: '1.5rem',
              padding: '0.5rem',
              textAlign: 'center',
            }}>
              {problem.expression}
            </div>
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>
              <strong>Hint:</strong> The difference of squares formula is: <code>a² - b² = (a + b)(a - b)</code>
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
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
              Keep going! There are many valid ways to approach this problem.
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
                  backgroundColor: showSolution ? '#646cff' : 'rgba(100, 108, 255, 0.3)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                {showSolution ? 'Hide' : 'Show'} Solution
              </button>
            </div>
          </div>

          {/* Work Editor with Feedback Icons */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <MathLiveMultilineEditor
                initialEquations={work}
                onChange={handleWorkChange}
                minLines={1}
                showLineNumbers={true}
                virtualKeyboard={true}
                fontSize="20px"
              />
            </div>
            
            {/* Feedback Icons Column */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.5rem',
              paddingTop: '0.5rem',
              minWidth: '40px',
            }}>
              {work.map((line, index) => {
                if (line.trim() === '') return null;
                const feedback = lineFeedback.get(index);
                if (!feedback) return <div key={index} style={{ height: '40px' }} />;
                
                return (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button
                      onClick={() => toggleFeedbackExpansion(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: getFeedbackColor(feedback.isCorrect, feedback.isValid),
                        cursor: 'pointer',
                        fontSize: '1.5rem',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title={feedback.feedback || 'Click for feedback'}
                    >
                      {getFeedbackIcon(feedback)}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expanded Feedback Messages */}
          {Array.from(expandedFeedbackLines).map((lineIndex) => {
            const feedback = lineFeedback.get(lineIndex);
            if (!feedback || !feedback.feedback) return null;
            
            return (
              <div
                key={lineIndex}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  border: `1px solid ${getFeedbackColor(feedback.isCorrect, feedback.isValid)}`,
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                }}
              >
                <strong>Line {lineIndex + 1}:</strong> {feedback.feedback}
              </div>
            );
          })}
        </div>

        {/* Solution (Toggleable) */}
        {showSolution && (
          <div className="input-section" style={{ marginTop: '2rem' }}>
            <h2>Solution</h2>
            <div style={{ 
              padding: '1.5rem', 
              backgroundColor: 'rgba(100, 108, 255, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(100, 108, 255, 0.3)',
            }}>
              {problem.solution.map((step, i) => (
                <div key={i} style={{ marginBottom: '0.5rem', fontFamily: 'monospace' }}>
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DifferenceOfSquaresProblem;

