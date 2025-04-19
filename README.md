> 一个猜ACG角色的小游戏，基于 [[kennylimz]](https://github.com/kennylimz/anime-character-guessr) 的版本魔改而来。

### 主要的改进

- 添加了对 `Galgame` 等游戏条目的支持。
- 添加了 `Bangumi` 账号登录的功能，以便支持 `NSFW` 条目的搜索。

### 使用方法

分别在 `client` 和 `server` 文件夹下执行

```sh
npm install
npm run dev
```

即可。

客户端端口5173，服务端端口3000。

服务器部署应该不用多说，生产环境的具体操作看 `package.json` 应该就懂了。

### `dotenv` 配置

以本地运行作为样例，请按照实际情况进行修改。

#### Client

```dotenv
VITE_SERVER_URL="http://localhost:3000"
VITE_AES_SECRET="<AES加密密钥>"
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

### TODO List

- [x] 解决 `Bangumi API` 限流问题（感谢Bangumi管理员）
- [x] 添加 `Redis` 缓存（因Bangumi架构更改此项没必要）
- [x] 添加 `LocalStorage` 缓存以减少 API 调用
- [ ] 添加数据库持久层，引入 [[Bangumi Archive]](https://github.com/bangumi/archive) 以减少 API 调用
- [ ] 添加静态 `JSON` 数据以减少 API 调用
- [x] 优化角色标签逻辑，特别是游戏条目
- [ ] 改进目录索引功能
