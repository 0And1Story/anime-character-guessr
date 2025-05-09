require('dotenv').config()

const client_uri = process.env.CLIENT_URI
const server_uri = process.env.SERVER_URI

const bangumi = {
    app_id: process.env.BANGUMI_APPID,
    app_secret: process.env.BANGUMI_APPSEC,
    redirect_uri: process.env.BANGUMI_REDIRECT_URI,
}

const config = {
    client_uri,
    server_uri,
    bangumi,
}

module.exports = { config }