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
import { latexArrayToPlainMath } from '../utils/latexToPlainMath';
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

const ReductionEqualizationProblem = () => {
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
    type: 'elimination',
    title: 'System of Equations - Reduction and Equalization',
    description: 'Solve the following system of equations using the reduction and equalization method:',
    equations: [
      '3x + 2y = 8',
      '2x - 3y = 1',
    ],
    solution: [
      'Step 1: Multiply the first equation by 2',
      '2(3x + 2y) = 2(8)',
      '6x + 4y = 16',
      'Step 2: Multiply the second equation by 3',
      '3(2x - 3y) = 3(1)',
      '6x - 9y = 3',
      'Step 3: Subtract the second equation from the first',
      '(6x + 4y) - (6x - 9y) = 16 - 3',
      '6x + 4y - 6x + 9y = 13',
      'Step 4: Simplify',
      '13y = 13',
      'Step 5: Solve for y',
      'y = 1',
      'Step 6: Substitute y = 1 into the first equation',
      '3x + 2(1) = 8',
      '3x + 2 = 8',
      'Step 7: Solve for x',
      '3x = 6',
      'x = 2',
      'Step 8: Final answer',
      'x = 2, \\quad y = 1',
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
      const plainMathLines = latexArrayToPlainMath(nonEmptyLines);
      const batchResult = await validateProblemBatch(
        problem.type,
        { equations: problem.equations },
        plainMathLines,
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

      if (!batchResult.overall?.finalAnswer) {
        const lastLine = plainMathLines[plainMathLines.length - 1] || '';
        if (lastLine && /x\s*=/.test(lastLine) && /y\s*=/.test(lastLine)) {
          try {
            const xMatch = lastLine.match(/x\s*=\s*([^\s,]+)/i);
            const yMatch = lastLine.match(/y\s*=\s*([^\s,]+)/i);

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

  const getFeedbackColor = (feedback: LineFeedback) => {
    if (feedback.isCorrect === true) return '#4caf50'; // Green
    if (feedback.status === 'needs_review') return '#ff9800'; // Amber
    if (feedback.isCorrect === false) return '#f44336'; // Red
    if (feedback.isValid) return '#2196f3'; // Blue
    return '#ff9800'; // Default to amber for unknown
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
    if (feedback.status === 'needs_review') return '⚠';
    if (feedback.isValid) return 'ℹ';
    return '✗';
  };

  return (
    <div className="demo-container">
      <div className="demo-header">
        <h1>System of Equations - Reduction and Equalization</h1>
        <p>Solve the system of equations using the reduction and equalization method. Validate your work whenever you're ready for feedback.</p>
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
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>
              <strong>Hint:</strong> Multiply one or both equations by constants to make coefficients equal, then add or subtract to eliminate a variable.
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
                onClick={() => {
                  setHint(null);
                  setHintLevel(null);
                }}
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
                  const iconColor = getFeedbackColor(feedback);
                  
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
                        title={
                          feedback.errorCode || feedback.errorExplanation
                            ? `Line ${lineIndex + 1}: ${feedback.errorCode || 'Error'} - Click for details`
                            : `Line ${lineIndex + 1}: Click to see feedback`
                        }
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
            The reduction and equalization method (also called elimination) involves:
          </p>
          <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8', marginBottom: '1rem' }}>
            <li><strong>Step 1:</strong> Multiply one or both equations by constants to make coefficients of one variable equal</li>
            <li><strong>Step 2:</strong> Add or subtract the equations to eliminate that variable</li>
            <li><strong>Step 3:</strong> Solve for the remaining variable</li>
            <li><strong>Step 4:</strong> Substitute back into one of the original equations to find the other variable</li>
          </ul>
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(100, 108, 255, 0.1)', borderRadius: '8px' }}>
            <strong>💡 Validation Features:</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
              <li>Validate every line at once with the "Validate All Lines" button</li>
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

export default ReductionEqualizationProblem;

