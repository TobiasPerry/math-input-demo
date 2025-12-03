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
import DifferenceOfSquaresProblem from './components/DifferenceOfSquaresProblem';
import ReductionEqualizationProblem from './components/ReductionEqualizationProblem';
import './App.css';

const Navigation = () => {
  const location = useLocation();
  
  if (location.pathname === '/') {
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
        <Route path="/" element={<Homepage />} />
        <Route path="/mathlive" element={<MathLiveDemo />} />
        <Route path="/mathquill" element={<MathQuillDemo />} />
        <Route path="/desmos" element={<DesmosDemo />} />
        <Route path="/mathlive-multiline" element={<MathLiveMultilineDemo />} />
        <Route path="/mathquill-multiline" element={<MathQuillMultilineDemo />} />
        <Route path="/codemirror-latex" element={<CodeMirrorLatexDemo />} />
        <Route path="/substitution-problem" element={<SubstitutionProblemDemo />} />
        <Route path="/substitution-problem-validation" element={<SubstitutionProblemWithValidation />} />
        <Route path="/difference-of-squares" element={<DifferenceOfSquaresProblem />} />
        <Route path="/reduction-equalization" element={<ReductionEqualizationProblem />} />
      </Routes>
    </Router>
  );
}

export default App
