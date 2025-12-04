/**
 * API utilities for validating student math work
 * 
 * This file contains functions to interact with your FastAPI SymPy validation API
 * API is running on port 8000
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ValidationResponse {
  isValid: boolean;
  isCorrect: boolean;
  feedback?: string;
  hint?: string | null;
  errors?: string[];
  warnings?: string[];
}

export interface StepValidationResponse extends ValidationResponse {
  explanation?: string;
  alternativeSteps?: string[];
}

export interface ProblemValidationResponse {
  lineValidation: {
    lineIndex: number;
    isValid: boolean;
    isCorrect: boolean;
    feedback?: string;
    nextExpectedStep?: string;
  };
  overallProgress: {
    stepsCompleted: number;
    totalSteps: number;
    onTrack: boolean;
  };
  hints?: string[];
}

export type ValidationLineStatus = 'valid' | 'needs_review' | 'invalid' | (string & {});

export interface BatchValidationOptions {
  includeTelemetry?: boolean;
  requestHints?: boolean;
  llmAnalysis?: 'none' | 'summary' | 'per_line';
}

export interface BatchValidationLine {
  index?: number;
  lineIndex?: number;
  original: string;
  plainMath?: string;
  operation?: string;
  status: ValidationLineStatus;
  feedback?: string;
  errorCode?: string;
  diagnostics?: Record<string, any>;
  telemetry?: Record<string, any>;
  confidence?: number;
  sympy?: {
    simplified?: string;
    normalized?: string;
    symbolsTouched?: string[];
  };
  llm?: {
    summary?: string;
    nextStepHint?: string;
  };
}

export interface SympyCheck {
  isSolved?: boolean;
  studentAssignments?: Record<string, string>;
  expectedSolution?: Array<Record<string, string>>;
  discrepancies?: string[];
}

export interface BatchValidationOverall {
  validSteps?: number;
  invalidSteps?: number;
  readyForAnswerCheck?: boolean;
  finished?: boolean;
  finalAnswer?: {
    isCorrect?: boolean;
    feedback?: string;
    student?: Record<string, string>;
    expected?: Record<string, string>;
  } | null;
  recommendedNextAction?: string | null;
  sympyCheck?: SympyCheck;
}

export interface BatchValidationResponse {
  lines: BatchValidationLine[];
  overall?: BatchValidationOverall;
  telemetry?: Record<string, any>;
  chat_response?: string;
}

export interface EquivalenceResponse {
  areEquivalent: boolean;
  simplified1?: string;
  simplified2?: string;
  proof?: string;
}

export interface ParseResponse {
  parsed: string;
  normalized?: string;
  latex?: string;
  isValid: boolean;
}

export interface HintResponse {
  hint: string;
  level: 'gentle' | 'moderate' | 'strong';
  nextStep?: string;
}

export interface AnswerValidationResponse {
  isCorrect: boolean;
  expectedAnswer?: Record<string, string>;
  feedback?: string;
  verification?: string;
}

export interface CalculateResponse {
  success: boolean;
  result: string;
  latex_result?: string;
  calculation_type: string;
  original_expression: string;
  error_message?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Validate a single line of student work
 */
export async function validateLine(
  problemType: string,
  problemData: Record<string, any>,
  currentLine: string,
  lineIndex: number,
  previousLines: string[],
  context?: Record<string, any>
): Promise<ValidationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/validate/line`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      problemType,
      problemData,
      currentLine,
      lineIndex,
      previousLines,
      context: context || {},
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `Validation failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Validate if a step follows logically from the previous step
 */
export async function validateStep(
  problemType: string,
  previousExpression: string,
  currentExpression: string,
  operation?: string,
  lineIndex?: number
): Promise<StepValidationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/validate/step`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      problemType,
      previousExpression,
      currentExpression,
      operation,
      lineIndex,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `Step validation failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check if two expressions are equivalent
 */
export async function checkEquivalence(
  expression1: string,
  expression2: string,
  simplify: boolean = true
): Promise<EquivalenceResponse> {
  const response = await fetch(`${API_BASE_URL}/api/validate/equivalence`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      expression1,
      expression2,
      simplify,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `Equivalence check failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Validate student work for a specific problem type
 */
export async function validateProblem(
  problemType: string,
  problemData: Record<string, any>,
  studentWork: string[],
  currentLineIndex: number
): Promise<ProblemValidationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/validate/problem/${problemType}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      problemData,
      studentWork,
      currentLineIndex,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `Problem validation failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Validate an entire set of student work lines in one request
 */
export async function validateProblemBatch(
  problemType: string,
  problemData: Record<string, any>,
  studentWork: string[],
  options?: BatchValidationOptions
): Promise<BatchValidationResponse> {
  const defaultOptions: BatchValidationOptions = {
    includeTelemetry: true,
    requestHints: false,
    llmAnalysis: 'summary',
  };

  const payload: Record<string, any> = {
    problemData,
    studentWork,
    options: {
      ...defaultOptions,
      ...(options || {}),
    },
  };

  const response = await fetch(`${API_BASE_URL}/api/validate/problem/${problemType}/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `Problem batch validation failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Validate final answer
 */
export async function validateAnswer(
  problemType: string,
  problemData: Record<string, any>,
  studentAnswer: Record<string, string>,
  tolerance: number = 0.001
): Promise<AnswerValidationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/validate/answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      problemType,
      problemData,
      studentAnswer,
      tolerance,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `Answer validation failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get hints for the current step
 */
export async function getHint(
  problemType: string,
  currentLine: string,
  previousLines: string[],
  stuckFor?: number
): Promise<HintResponse> {
  const response = await fetch(`${API_BASE_URL}/api/hints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      problemType,
      currentLine,
      previousLines,
      stuckFor,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `Hint generation failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Parse and normalize a mathematical expression
 */
export async function parseExpression(
  expression: string,
  normalize: boolean = true
): Promise<ParseResponse> {
  const response = await fetch(`${API_BASE_URL}/api/validate/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      expression,
      normalize,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `Expression parsing failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Calculate or simplify a mathematical expression
 */
export async function calculateExpression(
  expression: string,
  calculationType: 'simplify' | 'evaluate' | 'expand' | 'factor' = 'simplify',
  variables?: Record<string, number>,
  precision: number = 15,
  latexOutput: boolean = true
): Promise<CalculateResponse> {
  const response = await fetch(`${API_BASE_URL}/math-calculator/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      expression,
      calculation_type: calculationType,
      variables: variables || null,
      precision,
      latex_output: latexOutput,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `Calculation failed: ${response.statusText}`);
  }

  return response.json();
}
