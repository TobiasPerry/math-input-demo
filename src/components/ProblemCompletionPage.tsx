import { useLocation, useNavigate } from 'react-router-dom';
import './Demo.css';

const ProblemCompletionPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const lastMessage = location.state?.lastMessage as string | undefined;
  const problemTitle = location.state?.problemTitle as string | undefined;

  return (
    <div className="demo-container">
      <div className="demo-content">
        <div className="input-section" style={{ 
          maxWidth: '800px', 
          margin: '0 auto',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '4rem',
            marginBottom: '1rem',
          }}>
            🎉
          </div>
          
          <h1 style={{ 
            fontSize: '2.5rem', 
            marginBottom: '1rem',
            color: '#16a34a',
          }}>
            Problem Solved!
          </h1>

          {problemTitle && (
            <h2 style={{ 
              fontSize: '1.5rem', 
              marginBottom: '2rem',
              color: 'rgba(31, 41, 55, 0.85)',
            }}>
              {problemTitle}
            </h2>
          )}

          {lastMessage && (
            <div style={{
              padding: '2rem',
              backgroundColor: '#ecfdf3',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              marginBottom: '2rem',
              fontSize: '1.1rem',
              lineHeight: '1.6',
              color: '#166534',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {lastMessage}
            </div>
          )}

          <button
            onClick={() => navigate('/')}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              backgroundColor: '#4f46e5',
              color: 'white',
              border: '1px solid #4338ca',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4338ca';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4f46e5';
            }}
          >
            🚀 Try Another Problem
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProblemCompletionPage;

