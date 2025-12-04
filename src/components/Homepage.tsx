import { Link } from 'react-router-dom';
import './Homepage.css';

const Homepage = () => {
  const pages = [
    {
      id: 'problem-input',
      name: 'Problem Input',
      description: 'Select or create a problem to solve with chat feedback',
      path: '/',
    },
    {
      id: 'problem-completion',
      name: 'Problem Completion',
      description: 'View your completed problems',
      path: '/problem-completion',
    },
  ];

  return (
    <div className="homepage">
      <header className="homepage-header">
        <h1>Math Problem Solver</h1>
        <p>Solve math problems with interactive chat feedback</p>
      </header>
      
      <section>
        <div className="demos-grid">
          {pages.map((page) => (
            <Link key={page.id} to={page.path} className="demo-card">
              <h2>{page.name}</h2>
              <p>{page.description}</p>
              <span className="demo-link">Go →</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Homepage;

