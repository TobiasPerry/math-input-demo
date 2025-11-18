/**
 * Example usage of MathLiveMultilineEditor component
 * 
 * This file demonstrates how to use the MathLiveMultilineEditor
 * component in your own pages/components.
 */

import { useState } from 'react';
import MathLiveMultilineEditor from './MathLiveMultilineEditor';

// Example 1: Basic usage
export const BasicExample = () => {
  const [equations, setEquations] = useState(['x = 5', 'y = 10']);

  return (
    <div>
      <h2>Basic Example</h2>
      <MathLiveMultilineEditor
        initialEquations={equations}
        onChange={setEquations}
      />
      <pre>{JSON.stringify(equations, null, 2)}</pre>
    </div>
  );
};

// Example 2: With custom styling
export const StyledExample = () => {
  const [equations, setEquations] = useState(['E = mc^2']);

  return (
    <div>
      <h2>Styled Example</h2>
      <MathLiveMultilineEditor
        initialEquations={equations}
        onChange={setEquations}
        className="my-custom-editor"
        containerStyle={{
          border: '3px solid #00ff00',
          backgroundColor: '#f0f0f0',
        }}
        fontSize="24px"
      />
    </div>
  );
};

// Example 3: Without line numbers
export const NoLineNumbersExample = () => {
  const [equations, setEquations] = useState(['a + b = c']);

  return (
    <div>
      <h2>No Line Numbers</h2>
      <MathLiveMultilineEditor
        initialEquations={equations}
        onChange={setEquations}
        showLineNumbers={false}
      />
    </div>
  );
};

// Example 4: With minimum lines constraint
export const MinLinesExample = () => {
  const [equations, setEquations] = useState(['x = 1', 'y = 2', 'z = 3']);

  return (
    <div>
      <h2>Minimum 3 Lines</h2>
      <MathLiveMultilineEditor
        initialEquations={equations}
        onChange={setEquations}
        minLines={3}
      />
    </div>
  );
};

// Example 5: Without virtual keyboard
export const NoKeyboardExample = () => {
  const [equations, setEquations] = useState(['f(x) = x^2']);

  return (
    <div>
      <h2>No Virtual Keyboard</h2>
      <MathLiveMultilineEditor
        initialEquations={equations}
        onChange={setEquations}
        virtualKeyboard={false}
      />
    </div>
  );
};

// Example 6: Controlled component with external updates
export const ControlledExample = () => {
  const [equations, setEquations] = useState(['initial']);

  const handleReset = () => {
    setEquations(['reset', 'values']);
  };

  const handleAddLine = () => {
    setEquations([...equations, 'new line']);
  };

  return (
    <div>
      <h2>Controlled Component</h2>
      <button onClick={handleReset}>Reset</button>
      <button onClick={handleAddLine}>Add Line</button>
      <MathLiveMultilineEditor
        initialEquations={equations}
        onChange={setEquations}
      />
      <div>
        <strong>Current equations:</strong>
        <ul>
          {equations.map((eq, i) => (
            <li key={i}>{eq || '(empty)'}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

