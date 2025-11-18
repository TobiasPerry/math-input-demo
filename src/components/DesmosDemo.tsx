import { useEffect, useRef, useState } from 'react';
import './Demo.css';

declare global {
  interface Window {
    Desmos?: any;
  }
}

const DesmosDemo = () => {
  const calculatorRef = useRef<HTMLDivElement>(null);
  const [expression, setExpression] = useState('x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}');
  const [calculator, setCalculator] = useState<any>(null);
  const [isDesmosLoaded, setIsDesmosLoaded] = useState(false);

  // Wait for Desmos API to load
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait time

    const checkDesmos = () => {
      attempts++;
      
      if (window.Desmos && typeof window.Desmos.GraphingCalculator === 'function') {
        setIsDesmosLoaded(true);
        return;
      }

      if (attempts < maxAttempts) {
        timeoutId = setTimeout(checkDesmos, 100);
      } else {
        console.error('Desmos GraphingCalculator not available after loading timeout');
      }
    };

    if (window.Desmos && typeof window.Desmos.GraphingCalculator === 'function') {
      setIsDesmosLoaded(true);
    } else {
      checkDesmos();
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Initialize Desmos Calculator once loaded
  useEffect(() => {
    if (!isDesmosLoaded || !calculatorRef.current || calculator) {
      return;
    }

    try {
      const calc = window.Desmos!.GraphingCalculator(calculatorRef.current, {
        expressions: true,
        settingsMenu: false,
        zoomButtons: false,
        expressionsCollapsed: false,
      });

      // Set initial expression
      calc.setExpression({ id: 'expr1', latex: expression });

      // Listen for expression changes
      calc.observe('expressionAnalysis', () => {
        const expressions = calc.getExpressions();
        if (expressions.list && expressions.list.length > 0) {
          const firstExpr = expressions.list.find((expr: any) => expr.id === 'expr1');
          if (firstExpr && firstExpr.latex) {
            setExpression(firstExpr.latex);
          }
        }
      });

      setCalculator(calc);

      return () => {
        if (calc && typeof calc.destroy === 'function') {
          calc.destroy();
        }
      };
    } catch (error) {
      console.error('Error initializing Desmos Calculator:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesmosLoaded]);

  const handleExpressionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newExpression = e.target.value;
    setExpression(newExpression);
    if (calculator) {
      calculator.setExpression({ id: 'expr1', latex: newExpression });
    }
  };

  return (
    <div className="demo-container">
      <div className="demo-header">
        <h1>Desmos Graphing Calculator Demo</h1>
        <p>Type or edit mathematical expressions using Desmos Graphing Calculator</p>
      </div>
      
      <div className="demo-content">
        <div className="input-section">
          <h2>Desmos Calculator</h2>
          {!isDesmosLoaded && (
            <div style={{ padding: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}>
              Loading Desmos Calculator...
            </div>
          )}
          <div
            ref={calculatorRef}
            style={{
              height: '400px',
              width: '100%',
              border: '2px solid #646cff',
              borderRadius: '8px',
              display: isDesmosLoaded ? 'block' : 'none',
            }}
          ></div>
        </div>

        <div className="output-section">
          <h2>LaTeX Expression</h2>
          <textarea
            value={expression}
            onChange={handleExpressionChange}
            className="latex-output"
            rows={4}
            placeholder="LaTeX expression will appear here..."
          />
        </div>

        <div className="info-section">
          <h3>Features</h3>
          <ul>
            <li>Full Desmos Graphing Calculator integration</li>
            <li>Interactive graph visualization</li>
            <li>Expression editing with LaTeX support</li>
            <li>Real-time expression updates</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DesmosDemo;

