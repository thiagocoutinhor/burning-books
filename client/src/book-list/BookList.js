import React from 'react'
import './BookList.css'
import { Navbar, Tooltip, OverlayTrigger, Dropdown } from 'react-bootstrap'
import { SimpleDropdown } from '../components/simple-dropdown/SimpleDropdown'

function newBookTooltip(props) {
    return (
        <Tooltip id="newBookTooltip" {...props}>
            Creates a new book
        </Tooltip>
    )
}

export class BookList extends React.Component {
    constructor(props) {
        super(props)
        this.createNewBook = this.createNewBook.bind(this)
    }

    render() {
        return (
            <Navbar className="sticky-top d-flex">
                <div className="dropright">
                    <Dropdown as={Navbar.Brand} style={{ color: 'white' }}>
                         <Dropdown.Toggle as={SimpleDropdown}>
                            Burning Books
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item onClick={this.props.logoff}>
                                <i className="fa fa-sign-out-alt"></i>
                                Sair
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </div>
                <div className="flex-grow-1"/>
                <div>
                    <OverlayTrigger placement="left" overlay={newBookTooltip} delay={{show: 400 }}>
                        <div className="pointer p-1" onClick={this.createNewBook}>
                            <i className="fa fa-plus"></i>
                        </div>
                    </OverlayTrigger>
                </div>
            </Navbar>
        )
    }

    createNewBook() {
        // TODO implementar
    }

}