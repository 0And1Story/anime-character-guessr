import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SinglePlayer from './pages/SinglePlayer';
import Multiplayer from './pages/Multiplayer';
import BangumiAuthorize from './pages/BangumiAuthorize';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/singleplayer" element={<SinglePlayer />} />
        <Route path="/multiplayer" element={<Multiplayer />} />
        <Route path="/multiplayer/:roomId" element={<Multiplayer />} />
        <Route path="/bangumi-authorize" element={<BangumiAuthorize />} />
      </Routes>
    </Router>
  );
}

export default App;
