import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

interface ChatMessage {
  id: string;
  type: 'system' | 'feedback' | 'error' | 'success' | 'info';
  content: string;
  timestamp: Date;
  details?: {
    lineIndex?: number;
    feedback?: LineFeedback;
    progress?: {
      stepsCompleted: number;
      totalSteps: number;
      onTrack: boolean;
    };
    solutionCheck?: {
      isSolved: boolean;
      discrepancies: string[];
      recommendedAction: string | null;
    };
  };
}

interface ProblemData {
  type: string;
  title?: string;
  description?: string;
  equations?: string[];
  expression?: string;
}

const normalizeLatexFractions = (line: string) =>
  line.replace(/\\frac\s*([^{\s])\s*([^{\s])/g, (_match, num, den) => `\\frac{${num}}{${den}}`);

const SubstitutionProblemWithChat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const routeProblem = location.state?.problem as ProblemData | undefined;
  
  // Default problem if none provided
  const defaultProblem: ProblemData = {
    type: 'substitution',
    title: 'System of Equations',
    description: 'Solve the following system of equations. Use any method you prefer:',
    equations: [
      'y = 2x + 1',
      '3x + 2y = 12',
    ],
  };

  const problem = routeProblem || defaultProblem;

  const [work, setWork] = useState<string[]>(['']);
  const [, setLineFeedback] = useState<Map<number, LineFeedback>>(new Map());
  const [overallProgress, setOverallProgress] = useState<{
    stepsCompleted: number;
    totalSteps: number;
    onTrack: boolean;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [, setHint] = useState<string | null>(null);
  const [, setHintLevel] = useState<'gentle' | 'moderate' | 'strong' | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [solutionCheck, setSolutionCheck] = useState<{
    isSolved: boolean;
    discrepancies: string[];
    recommendedAction: string | null;
  } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'system',
      content: 'Welcome! Start solving the problem and click "Validate All Lines" to get feedback on your work.',
      timestamp: new Date(),
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const addChatMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setChatMessages(prev => [
      ...prev,
      {
        ...message,
        id: `msg-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
      },
    ]);
  };

  const formatFeedbackForChat = (
    feedbackEntries: Map<number, LineFeedback>,
    progress: typeof overallProgress,
    solutionCheckData: {
      isSolved: boolean;
      discrepancies: string[];
      recommendedAction: string | null;
    } | null,
    answerFeedback: string | null,
    isAnswerCorrect: boolean | null
  ) => {
    const messages: Omit<ChatMessage, 'id' | 'timestamp'>[] = [];

    // Overall progress message
    if (progress && progress.totalSteps > 0) {
      messages.push({
        type: 'info',
        content: `Progress: ${progress.stepsCompleted} out of ${progress.totalSteps} steps completed. ${progress.onTrack ? 'You\'re on track!' : 'Keep going!'}`,
        details: { progress },
      });
    }

    // Solution check message
    if (solutionCheckData) {
      if (solutionCheckData.isSolved) {
        messages.push({
          type: 'success',
          content: '✓ Solution Complete! Your solution is correct and complete.',
          details: { solutionCheck: solutionCheckData },
        });
      } else {
        let content = '⚠ Solution Incomplete.';
        if (solutionCheckData.discrepancies.length > 0) {
          content += ` Issues found: ${solutionCheckData.discrepancies.join('; ')}`;
        }
        if (solutionCheckData.recommendedAction) {
          content += ` Recommended: ${solutionCheckData.recommendedAction}`;
        }
        messages.push({
          type: 'error',
          content,
          details: { solutionCheck: solutionCheckData },
        });
      }
    }

    // Answer feedback
    if (answerFeedback) {
      messages.push({
        type: isAnswerCorrect ? 'success' : 'error',
        content: `${isAnswerCorrect ? '✓ Correct!' : '✗ Incorrect'} ${answerFeedback}`,
      });
    }

    // Line-by-line feedback
    if (feedbackEntries.size > 0) {
      const sortedEntries = Array.from(feedbackEntries.entries()).sort((a, b) => a[0] - b[0]);
      
      sortedEntries.forEach(([lineIndex, feedback]) => {
        let content = `Line ${lineIndex + 1}: `;
        let type: ChatMessage['type'] = 'feedback';

        if (feedback.isCorrect) {
          content += '✓ Correct!';
          type = 'success';
        } else if (feedback.status === 'needs_review') {
          content += '⚠ Needs review';
          type = 'error';
        } else if (feedback.isValid) {
          content += 'ℹ Valid expression';
          type = 'info';
        } else {
          content += '✗ Check this step';
          type = 'error';
        }

        if (feedback.feedback) {
          content += ` - ${feedback.feedback}`;
        }

        if (feedback.errorCode || feedback.errorExplanation) {
          content += `\n\n✗ Error: ${feedback.errorCode || ''} ${feedback.errorExplanation || ''}`.trim();
        }

        if (feedback.alternativeExplanation && feedback.status !== 'valid') {
          content += `\n\n💡 Alternative: ${feedback.alternativeExplanation}`;
        }

        if (feedback.hint) {
          content += `\n\n💡 Hint: ${feedback.hint}`;
        }

        messages.push({
          type,
          content,
          details: {
            lineIndex,
            feedback,
          },
        });
      });
    }

    return messages;
  };

  const handleValidateAll = async () => {
    const nonEmptyLines = work.filter(line => line.trim().length > 0);
    const normalizedLines = nonEmptyLines.map(normalizeLatexFractions);

    if (normalizedLines.length === 0) {
      addChatMessage({
        type: 'info',
        content: 'No work to validate. Please enter some equations first.',
      });
      setLineFeedback(new Map());
      setOverallProgress(null);
      setAnswerFeedback(null);
      setIsAnswerCorrect(null);
      return;
    }

    setIsValidating(true);
    setAnswerFeedback(null);
    setIsAnswerCorrect(null);

    addChatMessage({
      type: 'system',
      content: 'Validating your work...',
    });

    // Build problemData based on problem type
    const problemData: Record<string, any> = {};
    if (problem.equations) {
      problemData.equations = problem.equations;
    }
    if (problem.expression) {
      problemData.expression = problem.expression;
    }

    try {
      const batchResult = await validateProblemBatch(
        problem.type,
        problemData,
        normalizedLines,
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
              if (line.status === 'needs_review' || line.status === 'invalid') {
                const llmSummary = line.llm?.summary;
                if (llmSummary && discrepancies.some(d => 
                  llmSummary.toLowerCase().includes(d.toLowerCase().substring(0, 20))
                )) {
                  feedbackEntries.set(resolvedIndex, {
                    ...existingFeedback,
                    feedback: existingFeedback.feedback 
                      ? `${existingFeedback.feedback} (${discrepancies.join('; ')})`
                      : discrepancies.join('; '),
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

      let currentProgress: typeof overallProgress = null;
      let currentSolutionCheck: typeof solutionCheck = null;

      if (batchResult.overall) {
        const stepsCompleted =
          batchResult.overall.validSteps ??
          responseLines.filter(line => line.status === 'valid').length;

        currentProgress = {
          stepsCompleted,
          totalSteps: responseLines.length || nonEmptyLines.length,
          onTrack: (batchResult.overall.invalidSteps ?? 0) === 0,
        };

        setOverallProgress(currentProgress);

        // Use finalAnswer.isCorrect as primary method for checking if problem is solved
        if (batchResult.overall.finalAnswer) {
          setIsAnswerCorrect(batchResult.overall.finalAnswer.isCorrect ?? null);
          setAnswerFeedback(batchResult.overall.finalAnswer.feedback ?? null);
        }

        // Also check sympyCheck for additional feedback and discrepancies
        if (batchResult.overall.sympyCheck) {
          const sympyCheck = batchResult.overall.sympyCheck;
          currentSolutionCheck = {
            isSolved: sympyCheck.isSolved ?? false,
            discrepancies: sympyCheck.discrepancies ?? [],
            recommendedAction: batchResult.overall.recommendedNextAction ?? null,
          };

          setSolutionCheck(currentSolutionCheck);

          // Only set answer feedback from sympyCheck if finalAnswer wasn't available
          if (!batchResult.overall.finalAnswer) {
            if (sympyCheck.isSolved) {
              setIsAnswerCorrect(true);
              setAnswerFeedback('Perfect! Your solution is correct and complete.');
            } else if (sympyCheck.discrepancies && sympyCheck.discrepancies.length > 0) {
              setIsAnswerCorrect(false);
              setAnswerFeedback(
                `Solution incomplete: ${sympyCheck.discrepancies.join('. ')}`
              );
            }
          }
        }
      } else {
        setOverallProgress(null);
        setSolutionCheck(null);
      }

      if (!batchResult.overall?.finalAnswer) {
        const lastLine = normalizedLines[normalizedLines.length - 1] || '';
        if (lastLine && /x\s*=/.test(lastLine) && /y\s*=/.test(lastLine)) {
          try {
            const xMatch = lastLine.match(/x\s*=\s*([^\s,]+)/i);
            const yMatch = lastLine.match(/y\s*=\s*([^\s,]+)/i);

            if (xMatch && yMatch) {
              const answerResult = await validateAnswer(
                problem.type,
                problemData,
                {
                  x: xMatch[1].trim(),
                  y: yMatch[1].trim(),
                }
              );

              setIsAnswerCorrect(answerResult.isCorrect);
              setAnswerFeedback(answerResult.feedback || null);
              
              // If answer is correct, navigate to completion page
              if (answerResult.isCorrect) {
                setTimeout(() => {
                  navigate('/problem-completion', {
                    state: {
                      lastMessage: answerResult.feedback || 'Great job! You solved the problem correctly.',
                      problemTitle: problem.title,
                    },
                  });
                }, 1000);
                return; // Exit early since we're navigating
              }
            }
          } catch (error) {
            console.error('Answer validation error:', error);
          }
        }
      }

      // Use chat_response from API if available, otherwise format feedback
      let lastMessageContent = '';
      if (batchResult.chat_response) {
        lastMessageContent = batchResult.chat_response;
        addChatMessage({
          type: 'feedback',
          content: batchResult.chat_response,
        });
      } else {
        // Fallback to formatted feedback if chat_response not available
        const feedbackMessages = formatFeedbackForChat(
          orderedFeedback,
          currentProgress,
          currentSolutionCheck || null,
          answerFeedback || null,
          isAnswerCorrect
        );
        feedbackMessages.forEach(msg => {
          addChatMessage(msg);
          if (msg.content) {
            lastMessageContent = msg.content;
          }
        });
      }

      // Check if problem is solved using finished field and navigate to completion page
      if (batchResult.overall?.finished === true) {
        // Wait a moment for the message to be added, then navigate
        setTimeout(() => {
          navigate('/problem-completion', {
            state: {
              lastMessage: lastMessageContent || batchResult.overall?.finalAnswer?.feedback || 'Great job! You solved the problem correctly.',
              problemTitle: problem.title,
            },
          });
        }, 1000);
      }

    } catch (error) {
      console.error('Validation error:', error);
      addChatMessage({
        type: 'error',
        content: 'An error occurred while validating your work. Please try again.',
      });
      setLineFeedback(new Map());
      setOverallProgress(null);
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
    setSolutionCheck(null);
  };

  const handleGetHint = async () => {
    const nonEmptyLines = work.filter(line => line.trim().length > 0);
    const normalizedLines = nonEmptyLines.map(normalizeLatexFractions);
    if (normalizedLines.length === 0) {
      addChatMessage({
        type: 'info',
        content: 'Please enter some work first before requesting a hint.',
      });
      return;
    }

    const lastLine = normalizedLines[normalizedLines.length - 1] || '';
    
    try {
      const hintResult: HintResponse = await getHint(
        problem.type,
        lastLine,
        normalizedLines.slice(0, -1)
      );
      setHint(hintResult.hint);
      setHintLevel(hintResult.level);
      
      addChatMessage({
        type: 'info',
        content: `💡 Hint (${hintResult.level}): ${hintResult.hint}`,
      });
    } catch (error) {
      console.error('Error getting hint:', error);
      addChatMessage({
        type: 'error',
        content: 'Unable to generate hint at this time. Please try again.',
      });
    }
  };

  const getMessageStyle = (type: ChatMessage['type']) => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: 'rgba(76, 175, 80, 0.2)',
          borderColor: 'rgba(76, 175, 80, 0.5)',
          color: 'rgba(255, 255, 255, 0.95)',
        };
      case 'error':
        return {
          backgroundColor: 'rgba(244, 67, 54, 0.2)',
          borderColor: 'rgba(244, 67, 54, 0.5)',
          color: 'rgba(255, 255, 255, 0.95)',
        };
      case 'info':
        return {
          backgroundColor: 'rgba(33, 150, 243, 0.2)',
          borderColor: 'rgba(33, 150, 243, 0.5)',
          color: 'rgba(255, 255, 255, 0.95)',
        };
      case 'system':
        return {
          backgroundColor: 'rgba(158, 158, 158, 0.2)',
          borderColor: 'rgba(158, 158, 158, 0.5)',
          color: 'rgba(255, 255, 255, 0.8)',
        };
      default:
        return {
          backgroundColor: 'rgba(255, 152, 0, 0.2)',
          borderColor: 'rgba(255, 152, 0, 0.5)',
          color: 'rgba(255, 255, 255, 0.95)',
        };
    }
  };

  return (
    <div className="demo-container">
      <div className="demo-content">
        {/* Problem Statement */}
        <div className="input-section" style={{ marginBottom: '2rem' }}>
          <h2>{problem.title || 'Problem'}</h2>
          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: 'rgba(100, 108, 255, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(100, 108, 255, 0.3)',
          }}>
            {problem.description && (
              <p style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
                {problem.description}
              </p>
            )}
            {problem.equations && problem.equations.length > 0 && (
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
            )}
            {problem.expression && (
              <div style={{ 
                fontFamily: 'monospace',
                fontSize: '1.2rem',
                padding: '0.5rem',
              }}>
                {problem.expression}
              </div>
            )}
          </div>
        </div>

        {/* Split Layout: Chat Left, Editor Right */}
        <div style={{ 
          display: 'flex', 
          gap: '1.5rem', 
          alignItems: 'flex-start',
          minHeight: '600px',
        }}>
          {/* Left Side: Chat */}
          <div style={{ 
            flex: '0 0 400px',
            display: 'flex',
            flexDirection: 'column',
            height: '600px',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Feedback Chat</h3>
            </div>
            
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              {chatMessages.map((message) => {
                const style = getMessageStyle(message.type);
                return (
                  <div
                    key={message.id}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: `1px solid ${style.borderColor}`,
                      backgroundColor: style.backgroundColor,
                      color: style.color,
                      fontSize: '0.9rem',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {message.content}
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Right Side: Math Editor */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
                </div>
              </div>
              
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubstitutionProblemWithChat;

