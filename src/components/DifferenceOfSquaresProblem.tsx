import { useState } from 'react';
import MathLiveMultilineEditor from './MathLiveMultilineEditor';
import { 
  validateProblemBatch, 
  getHint, 
  validateAnswer,
  type HintResponse,
  type BatchValidationLine,
  type ValidationLineStatus,
} from '../utils/validationApi';
import './Demo.css';

interface LineFeedback {
  isValid: boolean;
  isCorrect: boolean;
  feedback?: string;
  nextExpectedStep?: string;
  status?: ValidationLineStatus;
  operation?: string;
  errorCode?: string;
  errorExplanation?: string;
  alternativeExplanation?: string;
  diagnostics?: Record<string, any>;
  hint?: string | null;
  confidence?: number | null;
  sympySimplified?: string;
  sympyNormalized?: string;
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
  const [solutionCheck, setSolutionCheck] = useState<{
    isSolved: boolean;
    discrepancies: string[];
    recommendedAction: string | null;
  } | null>(null);

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

  const handleValidateAll = async () => {
    const nonEmptyLines = work.filter(line => line.trim().length > 0);

    if (nonEmptyLines.length === 0) {
      setLineFeedback(new Map());
      setOverallProgress(null);
      setAnswerFeedback(null);
      setIsAnswerCorrect(null);
      setSolutionCheck(null);
      return;
    }

    setIsValidating(true);
    setExpandedFeedbackLines(new Set());
    setAnswerFeedback(null);
    setIsAnswerCorrect(null);

    try {
      const batchResult = await validateProblemBatch(
        problem.type,
        { expression: problem.expression },
        nonEmptyLines,
        {
          includeTelemetry: true,
          requestHints: false,
          llmAnalysis: 'summary',
        }
      );

      const feedbackEntries = new Map<number, LineFeedback>();
      const responseLines = batchResult.lines ?? [];

      responseLines.forEach((line: BatchValidationLine, idx) => {
        const resolvedIndex =
          typeof line.index === 'number'
            ? line.index
            : typeof line.lineIndex === 'number'
            ? line.lineIndex
            : idx;

        feedbackEntries.set(resolvedIndex, {
          isValid: line.status !== 'invalid',
          isCorrect: line.status === 'valid',
          feedback: line.feedback || line.llm?.summary,
          nextExpectedStep: line.llm?.nextStepHint,
          status: line.status,
          operation: line.operation,
          errorCode: line.errorCode,
          errorExplanation: line.diagnostics?.errorExplanation || line.diagnostics?.explanation,
          alternativeExplanation: line.diagnostics?.alternative || line.diagnostics?.alternativeExplanation || line.llm?.summary,
          diagnostics: line.diagnostics,
          hint: line.llm?.nextStepHint || null,
          confidence: line.confidence ?? null,
          sympySimplified: line.sympy?.simplified,
          sympyNormalized: line.sympy?.normalized,
        });
      });

      // Enhance feedback with solution-level insights from sympyCheck
      if (batchResult.overall?.sympyCheck) {
        const sympyCheck = batchResult.overall.sympyCheck;
        const discrepancies = sympyCheck.discrepancies;
        
        // If solution is not complete, try to identify problematic lines
        if (!sympyCheck.isSolved && discrepancies && discrepancies.length > 0) {
          responseLines.forEach((line: BatchValidationLine, idx) => {
            const resolvedIndex =
              typeof line.index === 'number'
                ? line.index
                : typeof line.lineIndex === 'number'
                ? line.lineIndex
                : idx;
            
            const existingFeedback = feedbackEntries.get(resolvedIndex);
            if (existingFeedback) {
              // If line has needs_review or invalid status, it's likely problematic
              if (line.status === 'needs_review' || line.status === 'invalid') {
                const llmSummary = line.llm?.summary;
                // Enhance feedback with discrepancy context if LLM identified it
                if (llmSummary && discrepancies.some(d => 
                  llmSummary.toLowerCase().includes(d.toLowerCase().substring(0, 20))
                )) {
                  feedbackEntries.set(resolvedIndex, {
                    ...existingFeedback,
                    feedback: existingFeedback.feedback 
                      ? `${existingFeedback.feedback} (${discrepancies.join('; ')})`
                      : discrepancies.join('; '),
                    // Preserve error and alternative explanation fields
                    errorCode: existingFeedback.errorCode || line.errorCode,
                    errorExplanation: existingFeedback.errorExplanation || line.diagnostics?.errorExplanation || line.diagnostics?.explanation,
                    alternativeExplanation: existingFeedback.alternativeExplanation || line.diagnostics?.alternative || line.diagnostics?.alternativeExplanation || llmSummary,
                  });
                }
              }
            }
          });
        }
      }

      const orderedFeedback = new Map(
        Array.from(feedbackEntries.entries()).sort((a, b) => a[0] - b[0])
      );

      setLineFeedback(orderedFeedback);

      if (batchResult.overall) {
        const stepsCompleted =
          batchResult.overall.validSteps ??
          responseLines.filter(line => line.status === 'valid').length;

        setOverallProgress({
          stepsCompleted,
          totalSteps: responseLines.length || nonEmptyLines.length,
          onTrack: (batchResult.overall.invalidSteps ?? 0) === 0,
        });

        // Use sympyCheck for solution-level validation
        if (batchResult.overall.sympyCheck) {
          const sympyCheck = batchResult.overall.sympyCheck;
          setSolutionCheck({
            isSolved: sympyCheck.isSolved ?? false,
            discrepancies: sympyCheck.discrepancies ?? [],
            recommendedAction: batchResult.overall.recommendedNextAction ?? null,
          });

          // If sympyCheck says it's solved, mark as correct
          if (sympyCheck.isSolved) {
            setIsAnswerCorrect(true);
            setAnswerFeedback('Perfect! Your solution is correct and complete.');
          } else if (sympyCheck.discrepancies && sympyCheck.discrepancies.length > 0) {
            setIsAnswerCorrect(false);
            setAnswerFeedback(
              `Solution incomplete: ${sympyCheck.discrepancies.join('. ')}`
            );
          }
        } else if (batchResult.overall.finalAnswer) {
          // Fallback to finalAnswer if sympyCheck not available
          setIsAnswerCorrect(batchResult.overall.finalAnswer.isCorrect ?? null);
          setAnswerFeedback(batchResult.overall.finalAnswer.feedback ?? null);
        }
      } else {
        setOverallProgress(null);
        setSolutionCheck(null);
      }

      // Fallback answer check for factored form
      if (!batchResult.overall?.finalAnswer && !batchResult.overall?.sympyCheck) {
        const lastLine = plainMathLines[plainMathLines.length - 1] || '';
        if (lastLine && lastLine.includes('(') && lastLine.includes(')')) {
          try {
            const answerResult = await validateAnswer(
              problem.type,
              { expression: problem.expression },
              {
                factored: lastLine,
              }
            );
            
            setIsAnswerCorrect(answerResult.isCorrect);
            setAnswerFeedback(answerResult.feedback || null);
          } catch (error) {
            console.error('Answer validation error:', error);
          }
        }
      }
    } catch (error) {
      console.error('Validation error:', error);
      setLineFeedback(new Map());
      setOverallProgress(null);
      setSolutionCheck(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleWorkChange = (newWork: string[]) => {
    setWork(newWork);
    setHint(null);
    setHintLevel(null);
    setAnswerFeedback(null);
    setIsAnswerCorrect(null);
    setLineFeedback(new Map());
    setOverallProgress(null);
    setExpandedFeedbackLines(new Set());
    setSolutionCheck(null);
  };

  const handleGetHint = async () => {
    const nonEmptyLines = work.filter(line => line.trim().length > 0);
    if (nonEmptyLines.length === 0) return;

    // Convert LaTeX to plain math before sending to API
    const lastLine = nonEmptyLines[nonEmptyLines.length - 1] || '';
    
    try {
      const hintResult: HintResponse = await getHint(
        problem.type,
        lastLine,
        nonEmptyLines.slice(0, -1)
      );
      setHint(hintResult.hint);
      setHintLevel(hintResult.level);
    } catch (error) {
      console.error('Error getting hint:', error);
      setHint('Unable to generate hint at this time. Please try again.');
    }
  };

  const getFeedbackColor = (feedback: LineFeedback) => {
    // Prioritize status-based coloring for better problem identification
    if (feedback.status === 'valid') return '#4caf50'; // Green
    if (feedback.status === 'invalid') return '#f44336'; // Red
    if (feedback.status === 'needs_review') return '#ff9800'; // Orange
    // Fallback to old logic
    if (feedback.isCorrect === true) return '#4caf50'; // Green
    if (feedback.isCorrect === false) return '#f44336'; // Red
    if (feedback.isValid) return '#2196f3'; // Blue
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
    if (feedback.isCorrect || feedback.status === 'valid') return '✓';
    if (feedback.status === 'needs_review') return '⚠';
    if (feedback.isValid) return 'ℹ';
    return '✗';
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

        {/* Solution Check Feedback */}
        {solutionCheck && (
          <div style={{
            padding: '1rem',
            backgroundColor: solutionCheck.isSolved
              ? 'rgba(76, 175, 80, 0.2)' 
              : 'rgba(255, 152, 0, 0.2)',
            border: `1px solid ${solutionCheck.isSolved ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255, 152, 0, 0.5)'}`,
            borderRadius: '8px',
            marginBottom: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem', marginBottom: solutionCheck.discrepancies.length > 0 || solutionCheck.recommendedAction ? '0.75rem' : 0 }}>
              <strong style={{ fontSize: '1.1rem' }}>
                {solutionCheck.isSolved ? '✓ Solution Complete!' : '⚠ Solution Incomplete'}
              </strong>
            </div>
            
            {solutionCheck.discrepancies.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <strong>Issues found:</strong>
                <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
                  {solutionCheck.discrepancies.map((disc, idx) => (
                    <li key={idx} style={{ marginBottom: '0.25rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                      {disc}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {solutionCheck.recommendedAction && (
              <div style={{
                padding: '0.75rem',
                backgroundColor: 'rgba(33, 150, 243, 0.2)',
                border: '1px solid rgba(33, 150, 243, 0.5)',
                borderRadius: '6px',
                marginTop: solutionCheck.discrepancies.length > 0 ? '0.5rem' : 0,
              }}>
                <strong>💡 Recommended:</strong> {solutionCheck.recommendedAction}
              </div>
            )}
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
                onClick={() => void handleValidateAll()}
                disabled={isValidating}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isValidating ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  opacity: isValidating ? 0.7 : 1,
                }}
              >
                ✅ Validate All Lines
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
                        color: getFeedbackColor(feedback),
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
                      title={
                        feedback.errorCode || feedback.errorExplanation
                          ? `Line ${index + 1}: ${feedback.errorCode || 'Error'} - Click for details`
                          : `Line ${index + 1}: Click to see feedback`
                      }
                    >
                      {getFeedbackIcon(feedback)}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expanded feedback messages below (for better mobile experience) */}
          {Array.from(lineFeedback.entries())
            .filter(([lineIndex]) => expandedFeedbackLines.has(lineIndex))
            .map(([lineIndex, feedback]) => {
              const iconColor = getFeedbackColor(feedback);
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <strong>Line {lineIndex + 1}:</strong>{' '}
                      {feedback.feedback ||
                        (feedback.status === 'needs_review'
                          ? 'Needs review'
                          : feedback.isCorrect
                          ? '✓ Correct!'
                          : feedback.isValid
                          ? 'Valid expression'
                          : 'Check this step')}
                      {feedback.status === 'needs_review' && solutionCheck && !solutionCheck.isSolved && (
                        <div style={{ 
                          marginTop: '0.5rem', 
                          padding: '0.5rem',
                          backgroundColor: 'rgba(255, 152, 0, 0.2)',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontStyle: 'italic'
                        }}>
                          ⚠ This line may be contributing to the incomplete solution.
                          {solutionCheck.discrepancies.length > 0 && (
                            <div style={{ marginTop: '0.25rem' }}>
                              Related issues: {solutionCheck.discrepancies.join('; ')}
                            </div>
                          )}
                        </div>
                      )}
                      {/* Identified Error Section */}
                      {(feedback.errorCode || feedback.errorExplanation) && (
                        <div style={{ 
                          marginTop: '0.5rem', 
                          padding: '0.5rem',
                          backgroundColor: 'rgba(244, 67, 54, 0.15)',
                          border: '1px solid rgba(244, 67, 54, 0.4)',
                          borderRadius: '4px',
                          fontSize: '0.85rem'
                        }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', color: '#ff5252' }}>
                            ✗ Identified Error:
                          </div>
                          {feedback.errorCode && (
                            <div style={{ marginBottom: feedback.errorExplanation ? '0.25rem' : 0 }}>
                              <strong>Error Code:</strong> {feedback.errorCode}
                            </div>
                          )}
                          {feedback.errorExplanation && (
                            <div>
                              {feedback.errorExplanation}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Alternative Explanation Section */}
                      {feedback.alternativeExplanation && feedback.status !== 'valid' && (
                        <div style={{ 
                          marginTop: '0.5rem', 
                          padding: '0.5rem',
                          backgroundColor: 'rgba(33, 150, 243, 0.15)',
                          border: '1px solid rgba(33, 150, 243, 0.4)',
                          borderRadius: '4px',
                          fontSize: '0.85rem'
                        }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', color: '#64b5f6' }}>
                            💡 Alternative Explanation:
                          </div>
                          <div>
                            {feedback.alternativeExplanation}
                          </div>
                        </div>
                      )}
                      
                      {feedback.operation && (
                        <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', opacity: 0.8 }}>
                          Operation: {feedback.operation}
                        </div>
                      )}
                      {feedback.hint && (
                        <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', opacity: 0.8 }}>
                          Next step hint: {feedback.hint}
                        </div>
                      )}
                      {feedback.sympySimplified && (
                        <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', opacity: 0.8, fontFamily: 'monospace' }}>
                          Simplified: {feedback.sympySimplified}
                        </div>
                      )}
                      {typeof feedback.confidence === 'number' && (
                        <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', opacity: 0.8 }}>
                          Confidence: {(feedback.confidence * 100).toFixed(0)}%
                        </div>
                      )}
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
            💡 Tip: Press Enter to create a new line, then click "Validate All Lines" whenever you want feedback.
          </div>
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

