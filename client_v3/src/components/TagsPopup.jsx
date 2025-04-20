import '../styles/popups.css'
import '../styles/guesses.css'
import { getAllTags, getShortTags } from '../utils/anime';

function TagsPopup({ onClose, tagsPopupConfig }) {
  const guess = tagsPopupConfig.guess
  const guessIndex = tagsPopupConfig.guessIndex

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <button className="popup-close" onClick={onClose}>×</button>
        <div className="popup-header">
          <h2>全部标签</h2>
        </div>
        <div className="popup-body">
          <div className="meta-tags-container">
            {Object.values(guess.sharedMetaTags).flat().map(({name, shared}, tagIndex) => {
              const tag = name;
              const isExpandTag = tag === '展开';
              const tagKey = `${guessIndex}-${tagIndex}`;
              
              return (
                <span 
                  key={tagIndex}
                  className={`meta-tag ${shared ? 'shared' : ''} ${isExpandTag ? 'expand-tag' : ''}`}
                  onClick={undefined}
                  style={isExpandTag ? { color: '#0084B4', cursor: 'pointer' } : undefined}
                >
                  {tag}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TagsPopup;