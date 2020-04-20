import React from 'react'

export class Login extends React.Component {
    componentDidMount() {
        console.log(process.env)
    }

    render() {
        return (
            <form action="/login" method="POST" encType="multipart/form-data" className="d-flex flex-column justify-content-center" style={{height: '100vh'}}>
                <div className="card mx-auto shadow" style={{width: "500px"}}>
                    <div className="card-body">
                        <h3 className="card-title text-center">Burning Books</h3>

                        <div>
                            <label>Login:</label>
                            <input className="form-control" type="text" name="login"/>
                            ###LOGINTYPE###
                        </div>

                        <div>
                            <input type="submit" className="btn btn-primary w-100 mt-3" value="Entrar"/>
                        </div>
                    </div>
                </div>
            </form>
        )
    }
}