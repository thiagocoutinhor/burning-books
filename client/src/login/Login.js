import React from 'react'
import { LoadingHome } from '../app/App'
import { Form, Card, Button } from 'react-bootstrap'

function LoginType(props) {
    if (props.type === 'PASSWORD') {
        return (
            <Form.Group>
                <Form.Label>Password</Form.Label>
                <Form.Control type="password" name="password"/>
            </Form.Group>
        )
    } else if (props.type === 'SSH') {
        return(
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

export class Login extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            loading: true
        }
    }

    componentDidMount() {
        fetch('/api/login/type')
            .then(response => response.text())
            .then(type => this.setState({
                type,
                loading: false
            }))
    }

    render() {
        if (this.state.loading) {
            return <LoadingHome />
        } else {
            return (
                <Form action="/api/login" method="POST" encType="multipart/form-data" className="d-flex flex-column justify-content-center" style={{height: '100vh'}}>
                    <Card className="shadow mx-auto"  style={{width: "500px"}}>
                        <Card.Body>
                            <Card.Title as="h3" className="text-center">
                                Burning Books
                            </Card.Title>

                            <Form.Group>
                                <Form.Label>Login</Form.Label>
                                <Form.Control type="text" name="login"></Form.Control>
                            </Form.Group>

                            <LoginType type={this.state.type}/>

                            <Button type="submit" className="w-100 mt-3">
                                Login
                            </Button>
                        </Card.Body>
                    </Card>
                </Form>
            )
        }
    }
}