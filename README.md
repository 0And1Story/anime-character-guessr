> 一个猜ACG角色的小游戏，基于 [kennylimz](https://github.com/kennylimz/anime-character-guessr) 的版本魔改而来。

### 主要的改进：

- 添加了对 `Galgame` 等游戏条目的支持。
- 添加了 `Bangumi` 账号登录的功能，以便支持 `NSFW` 条目的搜索。

### 使用方法：

分别在 `client` 和 `server` 文件夹下执行

```sh
npm install
npm run dev
```

即可。

客户端端口5173，服务端端口3000。

### `dotenv` 配置

以本地运行作为样例，请按照实际情况进行修改。

#### Client

```dotenv
VITE_SERVER_URL="http://localhost:3000"
VITE_BANGUMI_APP_ID="<你的Bangumi应用ID>"
VITE_BANGUMI_REDIRECT_URI="http://localhost:3000/bangumi-authorize"
```

#### Server

```dotenv
CLIENT_URI="http://localhost:5173"
SERVER_URI="http://localhost:3000"
BANGUMI_APPID="<你的Bangumi应用ID>"
BANGUMI_APPSEC="<你的Bangumi应用密钥>"
BANGUMI_REDIRECT_URI="http://localhost:3000/bangumi-authorize"
```
