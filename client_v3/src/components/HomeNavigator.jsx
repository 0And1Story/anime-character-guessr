import axios from 'axios';
import '../styles/social.css';
import cookie from 'react-cookies';
import { useEffect, useState } from 'react';

const bangumi_config = {
  app_id: import.meta.env.VITE_BANGUMI_APP_ID,
  redirect_uri: import.meta.env.VITE_BANGUMI_REDIRECT_URI,
}

function HomeNavigator() {
  const access_token = cookie.load('access_token')
  const user_id = cookie.load('user_id')
  const isLogin = access_token && user_id

  const [nickname, setNickname] = useState("")
  useEffect(() => {
    (async () => {
      if (isLogin) {
        const response = await axios.get(`https://api.bgm.tv/v0/me`, {
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        })
        if (response?.data?.nickname) setNickname(response.data.nickname)
      }
    })()
  }, [nickname, isLogin, access_token])
  

  return (
    <div className="social-links">
      { isLogin ? (
          <button onClick={() => {
            if (confirm('要退出账号吗？')) {
              cookie.remove('access_token')
              cookie.remove('user_id')
              window.location.reload()
            }
          }} rel="noopener noreferrer" className="social-link">
            <img src={`https://api.bgm.tv/v0/users/${user_id}/avatar?type=small`} alt="Bangumi" className="bangumi-icon" />
            <span>{nickname}</span>
          </button>
        ) : (
          <a href={`https://bgm.tv/oauth/authorize?client_id=${bangumi_config.app_id}&response_type=code&redirect_uri=${bangumi_config.redirect_uri}`} rel="noopener noreferrer" className="social-link">
            <img src="https://avatars.githubusercontent.com/u/7521082?s=200&v=4" alt="Bangumi" className="bangumi-icon" />
            <span>登录</span>
          </a>
        )
      }
    </div>
  );
}

export default HomeNavigator; 