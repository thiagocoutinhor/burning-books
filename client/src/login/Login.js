import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { LoadingHome } from '../app/App'
import { Form, Card, Button } from 'react-bootstrap'

////////////////////////////////////////////////////////////////////////////////
// Login form password / file depending on the login type defined
////////////////////////////////////////////////////////////////////////////////
LoginTypeGroup.propTypes = {
    type: PropTypes.string
}
function LoginTypeGroup({ type }) {
    if (type === 'PASSWORD') {
        return (
            <Form.Group>
                <Form.Label>Password</Form.Label>
                <Form.Control type="password" name="password"/>
            </Form.Group>
        )
    } else if (type === 'SSH') {
        return (
            <Form.Group>
                <Form.Label>SSH Key</Form.Label>
                <Form.Control type="file" name="token"/>
            </Form.Group>
        )
    } else {
        return (
            <div>
                Unkown login type... Please, check the LOGIN_TYPE enviroment variable.
            </div>
        )
    }
}

export function Login() {
    const [loading, setLoading] = useState(true)
    const [loginType, setLoginType] = useState(null)

    useEffect(() => {
        fetch('/api/login/type')
            .then(response => response.text())
            .then(type => {
                setLoginType(type)
                setLoading(false)
            })
    }, [])

    return (
        <LoadingHome loading={loading}>
            <Form action="/api/login" method="POST" encType="multipart/form-data" className="d-flex flex-column justify-content-center" style={{height: '100vh'}}>
                <Card className="shadow mx-auto"  style={{width: '500px'}}>
                    <Card.Body>
                        <Card.Title as="h3" className="text-center">
                            Burning Books
                        </Card.Title>

                        <Form.Group>
                            <Form.Label>Login</Form.Label>
                            <Form.Control type="text" name="login"></Form.Control>
                        </Form.Group>

                        <LoginTypeGroup type={loginType}/>

                        <Button type="submit" className="w-100 mt-3">
                            Login
                        </Button>
                    </Card.Body>
                </Card>
            </Form>
        </LoadingHome>
    )
}