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
            color: '#4caf50',
          }}>
            Problem Solved!
          </h1>

          {problemTitle && (
            <h2 style={{ 
              fontSize: '1.5rem', 
              marginBottom: '2rem',
              color: 'rgba(255, 255, 255, 0.8)',
            }}>
              {problemTitle}
            </h2>
          )}

          {lastMessage && (
            <div style={{
              padding: '2rem',
              backgroundColor: 'rgba(76, 175, 80, 0.2)',
              border: '1px solid rgba(76, 175, 80, 0.5)',
              borderRadius: '12px',
              marginBottom: '2rem',
              fontSize: '1.1rem',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.95)',
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
              backgroundColor: '#646cff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#535bf2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#646cff';
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

