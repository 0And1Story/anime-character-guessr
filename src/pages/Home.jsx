import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import '../styles/Home.css';

const Home = () => {
  const [roomCount, setRoomCount] = useState(0);

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SERVER_URL;
    fetch(`${serverUrl}/room-count`)
      .then(response => response.json())
      .then(data => setRoomCount(data.count))
      .catch(error => console.error('Error fetching room count:', error));
  }, []);

  return (
    <div className="home-container">
      <div className="game-modes">
        <Link to="/singleplayer" className="mode-button">
          <h2>单人</h2>
          <small>至少不会卡😅</small>
        </Link>
        <Link to="/multiplayer" className="mode-button">
          <h2>多人</h2>
          <small>当前房间数: {roomCount}</small>
        </Link>
      </div>
      <div className="home-footer">
        <p>
          一个猜动漫角色的游戏,
          建议使用桌面端浏览器游玩。
          <br/>
          灵感来源<a href="https://blast.tv/counter-strikle">BLAST.tv</a>,
          数据来源<a href="https://bgm.tv/">Bangumi</a>。<br/>
          <a href="https://space.bilibili.com/87983557">作者</a>：“API修好了。感恩Bangumi！”
        </p>
        {/* <p>
          <a href="https://space.bilibili.com/87983557">作者</a>：实在对不起了大家，详情见……没有详情了，代码里调用的上游API挂了，所以暂时不能玩了。大伙早点休息吧。
        </p> */}
        <p>
          “当太阳升起时，就把昨天忘掉。”
        </p>
      </div>
    </div>
  );
};

export default Home; 