import { useEffect, useRef, useState } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import './Demo.css';

const CodeMirrorLatexDemo = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const [latex, setLatex] = useState(`x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}

y = mx + b

E = mc^2`);

  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: latex,
      extensions: [
        basicSetup,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newLatex = update.state.doc.toString();
            setLatex(newLatex);
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    editorViewRef.current = view;

    return () => {
      view.destroy();
    };
  }, []);

  // Update editor content when latex changes externally
  useEffect(() => {
    if (editorViewRef.current && editorViewRef.current.state.doc.toString() !== latex) {
      editorViewRef.current.dispatch({
        changes: {
          from: 0,
          to: editorViewRef.current.state.doc.length,
          insert: latex,
        },
      });
    }
  }, [latex]);

  // Render LaTeX preview
  useEffect(() => {
    if (!previewRef.current) return;

    const lines = latex.split('\n').filter(line => line.trim());
    previewRef.current.innerHTML = '';

    lines.forEach((line, index) => {
      const wrapper = document.createElement('div');
      wrapper.style.marginBottom = '1rem';
      wrapper.style.padding = '1rem';
      wrapper.style.border = '1px solid rgba(255, 255, 255, 0.1)';
      wrapper.style.borderRadius = '8px';
      wrapper.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';

      const label = document.createElement('span');
      label.textContent = `${index + 1}. `;
      label.style.color = 'rgba(255, 255, 255, 0.7)';
      label.style.marginRight = '0.5rem';

      const math = document.createElement('span');
      try {
        katex.render(line.trim(), math, {
          throwOnError: false,
          displayMode: false,
        });
      } catch (error) {
        math.textContent = line;
        math.style.color = '#ff6b6b';
      }

      wrapper.appendChild(label);
      wrapper.appendChild(math);
      previewRef.current!.appendChild(wrapper);
    });
  }, [latex]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLatex(e.target.value);
  };

  return (
    <div className="demo-container">
      <div className="demo-header">
        <h1>CodeMirror + LaTeX Demo</h1>
        <p>Write LaTeX equations in CodeMirror editor with live preview</p>
      </div>
      
      <div className="demo-content">
        <div className="input-section">
          <h2>LaTeX Editor (CodeMirror)</h2>
          <div
            ref={editorRef}
            style={{
              border: '2px solid #646cff',
              borderRadius: '8px',
              overflow: 'hidden',
              minHeight: '200px',
            }}
          ></div>
        </div>

        <div className="output-section">
          <h2>Live Preview (KaTeX)</h2>
          <div
            ref={previewRef}
            style={{
              minHeight: '200px',
              padding: '1rem',
              border: '2px solid #646cff',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
            }}
          ></div>
        </div>

        <div className="output-section">
          <h2>Raw LaTeX (Textarea)</h2>
          <textarea
            value={latex}
            onChange={handleTextareaChange}
            className="latex-output"
            rows={6}
            placeholder="Enter LaTeX equations, one per line..."
          />
        </div>

        <div className="info-section">
          <h3>Features</h3>
          <ul>
            <li>CodeMirror editor with syntax highlighting</li>
            <li>Live LaTeX rendering with KaTeX</li>
            <li>Multi-line equation support</li>
            <li>Alternative textarea input for direct editing</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CodeMirrorLatexDemo;

