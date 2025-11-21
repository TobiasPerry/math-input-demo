import { Link } from 'react-router-dom';
import './Homepage.css';

const Homepage = () => {
  const singleLineDemos = [
    {
      id: 'mathlive',
      name: 'MathLive',
      description: 'A modern, accessible math input field with LaTeX support',
      path: '/mathlive',
    },
    {
      id: 'mathquill',
      name: 'MathQuill',
      description: 'An easy-to-use math input editor with LaTeX output',
      path: '/mathquill',
    },
    {
      id: 'desmos',
      name: 'Desmos Graphing Calculator',
      description: 'Full Desmos calculator with expression input and graph visualization',
      path: '/desmos',
    },
  ];

  const multilineDemos = [
    {
      id: 'mathlive-multiline',
      name: 'MathLive Multi-line',
      description: 'Multiple MathLive fields for writing several equations',
      path: '/mathlive-multiline',
    },
    {
      id: 'mathquill-multiline',
      name: 'MathQuill Multi-line',
      description: 'Multiple MathQuill fields for writing several equations',
      path: '/mathquill-multiline',
    },
    {
      id: 'codemirror-latex',
      name: 'CodeMirror + LaTeX',
      description: 'CodeMirror editor with KaTeX rendering for multi-line equations',
      path: '/codemirror-latex',
    },
  ];

  const problemDemos = [
    {
      id: 'substitution-problem',
      name: 'Substitution Problem',
      description: 'Practice solving systems of equations using substitution method',
      path: '/substitution-problem',
    },
    {
      id: 'substitution-problem-validation',
      name: 'Substitution Problem (With Validation)',
      description: 'Substitution problem with real-time API validation and feedback',
      path: '/substitution-problem-validation',
    },
    {
      id: 'difference-of-squares',
      name: 'Difference of Squares',
      description: 'Factor expressions using the difference of squares pattern with validation',
      path: '/difference-of-squares',
    },
  ];

  return (
    <div className="homepage">
      <header className="homepage-header">
        <h1>Math Input Demo</h1>
        <p>Explore different math input libraries for web applications</p>
      </header>
      
      <section style={{ marginBottom: '4rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#646cff' }}>Single Line Input</h2>
        <div className="demos-grid">
          {singleLineDemos.map((demo) => (
            <Link key={demo.id} to={demo.path} className="demo-card">
              <h2>{demo.name}</h2>
              <p>{demo.description}</p>
              <span className="demo-link">Try it →</span>
            </Link>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '4rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#646cff' }}>Multi-line Input</h2>
        <div className="demos-grid">
          {multilineDemos.map((demo) => (
            <Link key={demo.id} to={demo.path} className="demo-card">
              <h2>{demo.name}</h2>
              <p>{demo.description}</p>
              <span className="demo-link">Try it →</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#646cff' }}>Problem Demos</h2>
        <div className="demos-grid">
          {problemDemos.map((demo) => (
            <Link key={demo.id} to={demo.path} className="demo-card">
              <h2>{demo.name}</h2>
              <p>{demo.description}</p>
              <span className="demo-link">Try it →</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Homepage;

