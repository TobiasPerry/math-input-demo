import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Homepage from './components/Homepage';
import MathLiveDemo from './components/MathLiveDemo';
import MathQuillDemo from './components/MathQuillDemo';
import DesmosDemo from './components/DesmosDemo';
import MathLiveMultilineDemo from './components/MathLiveMultilineDemo';
import MathQuillMultilineDemo from './components/MathQuillMultilineDemo';
import CodeMirrorLatexDemo from './components/CodeMirrorLatexDemo';
import SubstitutionProblemDemo from './components/SubstitutionProblemDemo';
import SubstitutionProblemWithValidation from './components/SubstitutionProblemWithValidation';
import SubstitutionProblemWithChat from './components/SubstitutionProblemWithChat';
import ProblemInputPage from './components/ProblemInputPage';
import ProblemCompletionPage from './components/ProblemCompletionPage';
import DifferenceOfSquaresProblem from './components/DifferenceOfSquaresProblem';
import ReductionEqualizationProblem from './components/ReductionEqualizationProblem';
import './App.css';

const Navigation = () => {
  const location = useLocation();
  
  if (location.pathname === '/' || location.pathname === '/problem-completion') {
    return null;
  }

  return (
    <nav className="nav-bar">
      <Link to="/" className="nav-link">← Back to Home</Link>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <Navigation />
      <Routes>
        <Route path="/" element={<ProblemInputPage />} />
        <Route path="/problem-chat" element={<SubstitutionProblemWithChat />} />
        <Route path="/problem-completion" element={<ProblemCompletionPage />} />
        <Route path="/home" element={<Homepage />} />
      </Routes>
    </Router>
  );
}

export default App
