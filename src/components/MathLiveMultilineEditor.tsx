import { useRef, useEffect, useState, useCallback } from 'react';
import 'mathlive';
import { MathfieldElement } from 'mathlive';
import './Demo.css';

interface MathFieldRef {
  element: HTMLElement;
  index: number;
  wrapper: HTMLElement;
  lineNumber: HTMLElement;
}

// Disable MathLive sound assets (avoids requests to plonk.wav and related files)
MathfieldElement.soundsDirectory = null;
MathfieldElement.plonkSound = null;
MathfieldElement.keypressSound = {
  default: null,
  delete: null,
  return: null,
  spacebar: null,
};

export interface MathLiveMultilineEditorProps {
  /** Initial equations/expressions */
  initialEquations?: string[];
  /** Callback when equations change */
  onChange?: (equations: string[]) => void;
  /** Minimum number of lines (default: 1) */
  minLines?: number;
  /** Show line numbers (default: true) */
  showLineNumbers?: boolean;
  /** Custom container className */
  className?: string;
  /** Custom container style */
  containerStyle?: React.CSSProperties;
  /** Enable virtual keyboard (default: true) */
  virtualKeyboard?: boolean;
  /** Font size for math fields (default: '20px') */
  fontSize?: string;
}

const MathLiveMultilineEditor: React.FC<MathLiveMultilineEditorProps> = ({
  initialEquations = [''],
  onChange,
  minLines = 1,
  showLineNumbers = true,
  className = '',
  containerStyle = {},
  virtualKeyboard = true,
  fontSize = '20px',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fieldRefsRef = useRef<Map<number, MathFieldRef>>(new Map());
  const isUpdatingFromInputRef = useRef(false);
  const [equations, setEquations] = useState<string[]>(
    initialEquations.length > 0 ? initialEquations : ['']
  );

  const updateEquation = useCallback(
    (index: number, value: string) => {
      isUpdatingFromInputRef.current = true;
      setEquations(prev => {
        const newEquations = [...prev];
        newEquations[index] = value;
        const finalEquations = newEquations;
        if (onChange) {
          onChange(finalEquations);
        }
        return finalEquations;
      });
      // Reset flag after state update
      setTimeout(() => {
        isUpdatingFromInputRef.current = false;
      }, 0);
    },
    [onChange]
  );

  const insertEquation = useCallback(
    (index: number) => {
      setEquations(prev => {
        const newEquations = [...prev];
        newEquations.splice(index + 1, 0, '');
        if (onChange) {
          onChange(newEquations);
        }
        return newEquations;
      });
    },
    [onChange]
  );

  const removeEquation = useCallback(
    (index: number) => {
      if (equations.length <= minLines) return;
      setEquations(prev => {
        const filtered = prev.filter((_, i) => i !== index);
        if (onChange) {
          onChange(filtered);
        }
        return filtered;
      });
    },
    [equations.length, minLines, onChange]
  );

  // Create or remove fields when count changes
  useEffect(() => {
    if (!containerRef.current) return;

    const currentCount = fieldRefsRef.current.size;
    const targetCount = equations.length;

    if (targetCount > currentCount) {
      // Add new fields
      for (let i = currentCount; i < targetCount; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'mathlive-line-wrapper';
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '0.75rem';
        wrapper.style.marginBottom = '0.5rem';
        wrapper.style.padding = '0.5rem 0';
        wrapper.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
        wrapper.style.transition = 'background-color 0.2s';

        const lineNumber = document.createElement('div');
        lineNumber.className = 'mathlive-line-number';
        lineNumber.textContent = `${i + 1}`;
        lineNumber.style.minWidth = '2.5rem';
        lineNumber.style.textAlign = 'right';
        lineNumber.style.color = 'rgba(255, 255, 255, 0.4)';
        lineNumber.style.fontSize = '0.9rem';
        lineNumber.style.fontFamily = 'monospace';
        lineNumber.style.userSelect = 'none';
        lineNumber.style.display = showLineNumbers ? 'block' : 'none';

        const fieldContainer = document.createElement('div');
        fieldContainer.style.flex = '1';
        fieldContainer.style.position = 'relative';

        const mathField = document.createElement('math-field');
        (mathField as any).value = equations[i] || '';
        mathField.setAttribute(
          'virtual-keyboard-mode',
          virtualKeyboard ? 'manual' : 'off'
        );
        mathField.style.width = '100%';
        mathField.style.fontSize = fontSize;
        mathField.style.padding = '0.5rem 0.75rem';
        mathField.style.border = 'none';
        mathField.style.borderRadius = '4px';
        mathField.style.backgroundColor = 'transparent';
        mathField.style.minHeight = '40px';
        mathField.style.outline = 'none';

        const fieldRef: MathFieldRef = {
          element: mathField,
          index: i,
          wrapper,
          lineNumber,
        };
        fieldRefsRef.current.set(i, fieldRef);

        // Handle input - use current index from fieldRef to avoid closure issues
        const inputHandler = (evt: any) => {
          const currentIndex = fieldRef.index;
          const expanded =
            typeof (mathField as any).getValue === 'function'
              ? (mathField as any).getValue('latex-expanded')
              : undefined;
          const nextValue = expanded ?? (evt?.target as any)?.value ?? '';
          updateEquation(currentIndex, nextValue);
        };
        mathField.addEventListener('input', inputHandler);

        // Handle Enter key to create new line
        const keydownHandler = (evt: KeyboardEvent) => {
          const currentIndex = fieldRef.index;
          if (evt.key === 'Enter' && !evt.shiftKey && !evt.ctrlKey && !evt.metaKey) {
            evt.preventDefault();
            evt.stopPropagation();
            insertEquation(currentIndex);
            // Focus the new field after it's created
            setTimeout(() => {
              const newField = fieldRefsRef.current.get(currentIndex + 1);
              if (newField?.element) {
                (newField.element as any).focus();
              }
            }, 50);
          } else if (
            evt.key === 'Backspace' &&
            (mathField as any).value === '' &&
            currentIndex >= minLines
          ) {
            evt.preventDefault();
            removeEquation(currentIndex);
            // Focus the previous field
            setTimeout(() => {
              const targetIndex = currentIndex > 0 ? currentIndex - 1 : 0;
              const field = fieldRefsRef.current.get(targetIndex);
              if (field?.element) {
                (field.element as any).focus();
              }
            }, 50);
          }
        };
        mathField.addEventListener('keydown', keydownHandler);

        // Handle focus
        const focusHandler = () => {
          wrapper.style.backgroundColor = 'rgba(100, 108, 255, 0.1)';
          lineNumber.style.color = 'rgba(100, 108, 255, 0.8)';
        };
        mathField.addEventListener('focus', focusHandler);

        let isKeyboardOpening = false;

        const blurHandler = (evt: FocusEvent) => {
          // Don't blur if we're opening the keyboard
          if (isKeyboardOpening) {
            evt.preventDefault();
            evt.stopPropagation();
            return;
          }
          wrapper.style.backgroundColor = 'transparent';
          lineNumber.style.color = 'rgba(255, 255, 255, 0.4)';
        };
        mathField.addEventListener('blur', blurHandler, true); // Use capture phase

        // Handle virtual keyboard toggle - ensure it opens for the correct field
        if (virtualKeyboard) {
          mathField.addEventListener('virtual-keyboard-toggle', (evt: any) => {
            if (evt.detail && evt.detail.isVisible) {
              isKeyboardOpening = true;
              // Ensure this field is focused when keyboard opens
              requestAnimationFrame(() => {
                (mathField as any).focus();
                // Reset flag after a short delay
                setTimeout(() => {
                  isKeyboardOpening = false;
                }, 100);
              });
            } else {
              isKeyboardOpening = false;
            }
          });

          // Also handle mousedown on the field to ensure focus before keyboard opens
          mathField.addEventListener('mousedown', (evt: MouseEvent) => {
            const target = evt.target as HTMLElement;
            // Check if clicking on keyboard button or its container
            if (
              target &&
              (target.getAttribute('data-cmd') === 'virtual-keyboard-toggle' ||
                target.closest('[data-cmd="virtual-keyboard-toggle"]') ||
                target.classList.contains('ML__keyboard-toggle') ||
                target.closest('.ML__keyboard-toggle'))
            ) {
              // Ensure this field is focused before the keyboard opens
              (mathField as any).focus();
              isKeyboardOpening = true;
            }
          });
        }

        fieldContainer.appendChild(mathField);
        wrapper.appendChild(lineNumber);
        wrapper.appendChild(fieldContainer);
        if (containerRef.current) {
          containerRef.current.appendChild(wrapper);
        }
      }
    } else if (targetCount < currentCount) {
      // Remove fields
      for (let i = currentCount - 1; i >= targetCount; i--) {
        const fieldRef = fieldRefsRef.current.get(i);
        if (fieldRef) {
          fieldRef.wrapper.remove();
          fieldRefsRef.current.delete(i);
        }
      }
      // Reindex remaining fields
      const remainingFields = Array.from(fieldRefsRef.current.entries())
        .sort((a, b) => a[0] - b[0])
        .slice(0, targetCount);
      fieldRefsRef.current.clear();
      remainingFields.forEach(([, fieldRef], newIndex) => {
        fieldRef.index = newIndex;
        fieldRef.lineNumber.textContent = `${newIndex + 1}`;
        fieldRefsRef.current.set(newIndex, fieldRef);
      });
    }

    // Update line numbers
    fieldRefsRef.current.forEach((fieldRef, index) => {
      fieldRef.lineNumber.textContent = `${index + 1}`;
      fieldRef.lineNumber.style.display = showLineNumbers ? 'block' : 'none';
    });
  }, [
    equations.length,
    updateEquation,
    insertEquation,
    removeEquation,
    showLineNumbers,
    virtualKeyboard,
    fontSize,
    minLines,
  ]);

  // Update field values only when changed externally (not from input events)
  useEffect(() => {
    if (isUpdatingFromInputRef.current) return;
    if (!containerRef.current) return;

    fieldRefsRef.current.forEach((fieldRef, index) => {
      if (equations[index] !== undefined) {
        const currentValue = (fieldRef.element as any).value;
        if (currentValue !== equations[index]) {
          (fieldRef.element as any).value = equations[index];
        }
      }
    });
  }, [equations]);

  // Sync with external changes to initialEquations
  useEffect(() => {
    if (JSON.stringify(initialEquations) !== JSON.stringify(equations)) {
      setEquations(
        initialEquations.length > 0 ? initialEquations : ['']
      );
    }
  }, [initialEquations]);

  const handleContainerClick = () => {
    // Focus the last field if clicking on empty space
    if (equations.length > 0) {
      const lastField = fieldRefsRef.current.get(equations.length - 1);
      if (lastField?.element) {
        (lastField.element as any).focus();
      }
    }
  };

  const defaultContainerStyle: React.CSSProperties = {
    minHeight: '300px',
    padding: '1rem',
    border: '2px solid #646cff',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    cursor: 'text',
    ...containerStyle,
  };

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className={`mathlive-multiline-editor ${className}`}
      style={defaultContainerStyle}
    />
  );
};

export default MathLiveMultilineEditor;

