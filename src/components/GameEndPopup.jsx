import '../styles/popups.css';

function GameEndPopup({ result, answer, onClose }) {
  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <button className="popup-close" onClick={onClose}>×</button>
        <div className="popup-header">
          <h2>{result === 'win' ? '🎉 给你猜对了，有点东西' : '😢 已经结束咧'}</h2>
        </div>
        <div className="popup-body">
          <div className="answer-character">
            <img 
              src={answer.image} 
              alt={answer.name} 
              className="answer-character-image"
            />
            <div className="answer-character-info">
              <a 
                href={`https://bgm.tv/character/${answer.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="character-link"
              >
                <div className="answer-character-name">{answer.name}</div>
                <div className="answer-character-name-cn">{answer.nameCn}</div>
              </a>
              {answer.summary && (
                <div className="answer-summary">
                  <div className="summary-content">{answer.summary}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameEndPopup; 