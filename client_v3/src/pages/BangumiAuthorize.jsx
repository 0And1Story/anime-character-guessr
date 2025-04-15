import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import cookie from 'react-cookies'

function BangumiAuthorize() {
    const navigate = useNavigate()
    const [ params ] = useSearchParams()
    
    useEffect(() => {
        const access_token = params.get('access_token')
        const user_id = params.get('user_id')
        const expires = params.get('expires')

        if (!access_token || !expires || !user_id) {
            return <p>Invalid parameters!</p>
        }

        cookie.save('access_token', access_token, {
            path: '/',
            expires: new Date(parseInt(expires)),
        })
        cookie.save('user_id', user_id, {
            path: '/',
            expires: new Date(parseInt(expires)),
        })

        navigate('/')
    }, [navigate, params])

    return <></>
}

export default BangumiAuthorize