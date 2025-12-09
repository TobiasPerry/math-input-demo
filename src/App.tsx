import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Homepage from './components/Homepage';
import SubstitutionProblemWithChat from './components/SubstitutionProblemWithChat';
import ProblemInputPage from './components/ProblemInputPage';
import ProblemCompletionPage from './components/ProblemCompletionPage';
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
