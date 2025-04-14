import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import cookie from 'react-cookies'

function BangumiAuthorize() {
    const navigate = useNavigate()
    const [ params ] = useSearchParams()
    
    useEffect(() => {
        const access_token = params.get('access_token')
        const expires = params.get('expires')

        if (!access_token || !expires) {
            return <p>Invalid parameters!</p>
        }

        cookie.save('access_token', access_token, {
            path: '/',
            expires: new Date(parseInt(expires)),
        })

        navigate('/')
    }, [navigate, params])

    return <></>
}

export default BangumiAuthorize