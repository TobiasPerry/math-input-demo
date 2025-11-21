/**
 * Convert LaTeX math expressions to plain text format that SymPy can parse
 * 
 * This handles common LaTeX patterns and converts them to standard math notation
 * that SymPy's parser can understand.
 */

/**
 * Convert LaTeX expression to plain math notation
 * @param latex - LaTeX string from MathLive
 * @returns Plain math notation string
 */
export function latexToPlainMath(latex: string): string {
  if (!latex || latex.trim() === '') {
    return '';
  }

  let result = latex;

  // Remove LaTeX command wrappers
  // Handle \left( and \right) -> (
  result = result.replace(/\\left\(/g, '(');
  result = result.replace(/\\right\)/g, ')');
  result = result.replace(/\\left\[/g, '[');
  result = result.replace(/\\right\]/g, ']');
  result = result.replace(/\\left\{/g, '{');
  result = result.replace(/\\right\}/g, '}');

  // Handle fractions: \frac{a}{b} -> (a)/(b) or a/b
  result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');

  // Handle square roots: \sqrt{x} -> sqrt(x)
  result = result.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)');
  result = result.replace(/\\sqrt\[(\d+)\]\{([^}]+)\}/g, '($2)^(1/$1)'); // nth root

  // Handle exponents: x^{2} -> x^2, x^{n+1} -> x^(n+1)
  result = result.replace(/\^\{([^}]+)\}/g, '^($1)');
  result = result.replace(/\^(\d+)/g, '^$1'); // Already plain, keep as is

  // Handle subscripts: x_{1} -> x_1 (SymPy can handle this)
  result = result.replace(/_\{([^}]+)\}/g, '_$1');

  // Handle multiplication: \cdot -> *, \times -> *
  result = result.replace(/\\cdot/g, '*');
  result = result.replace(/\\times/g, '*');

  // Handle division: \div -> /
  result = result.replace(/\\div/g, '/');

  // Handle plus/minus: \pm -> +/-, \mp -> -/+
  result = result.replace(/\\pm/g, '+/-');
  result = result.replace(/\\mp/g, '-/+');

  // Handle common functions
  result = result.replace(/\\sin\(/g, 'sin(');
  result = result.replace(/\\cos\(/g, 'cos(');
  result = result.replace(/\\tan\(/g, 'tan(');
  result = result.replace(/\\ln\(/g, 'ln(');
  result = result.replace(/\\log\(/g, 'log(');
  result = result.replace(/\\exp\(/g, 'exp(');

  // Handle Greek letters (common ones)
  result = result.replace(/\\alpha/g, 'alpha');
  result = result.replace(/\\beta/g, 'beta');
  result = result.replace(/\\gamma/g, 'gamma');
  result = result.replace(/\\delta/g, 'delta');
  result = result.replace(/\\epsilon/g, 'epsilon');
  result = result.replace(/\\theta/g, 'theta');
  result = result.replace(/\\lambda/g, 'lambda');
  result = result.replace(/\\mu/g, 'mu');
  result = result.replace(/\\pi/g, 'pi');
  result = result.replace(/\\sigma/g, 'sigma');
  result = result.replace(/\\phi/g, 'phi');
  result = result.replace(/\\omega/g, 'omega');

  // Handle spaces (remove them, but keep around operators for readability)
  // Actually, keep spaces as they might be intentional multiplication
  // But normalize multiple spaces to single space
  result = result.replace(/\s+/g, ' ');

  // Handle implicit multiplication (e.g., "2x" should stay as "2x" for SymPy)
  // SymPy can handle implicit multiplication, so we don't need to add *

  // Clean up any remaining LaTeX commands (basic ones)
  result = result.replace(/\\[a-zA-Z]+\{([^}]+)\}/g, '$1'); // \command{content} -> content

  // Remove any remaining backslashes (escape characters)
  result = result.replace(/\\/g, '');

  // Trim whitespace
  result = result.trim();

  return result;
}

/**
 * Convert an array of LaTeX expressions to plain math
 */
export function latexArrayToPlainMath(latexArray: string[]): string[] {
  return latexArray.map(latexToPlainMath);
}

