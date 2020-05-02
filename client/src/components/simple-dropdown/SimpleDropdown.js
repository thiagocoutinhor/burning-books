import React from 'react'
import PropTypes from 'prop-types'

////////////////////////////////////////////////////////////////////////////////
// Simple elastic dropdown toggle substitute
////////////////////////////////////////////////////////////////////////////////
export const SimpleDropdown = React.forwardRef(function SimpleDropdown({children, onClick}, ref) {
    return (
        <span ref={ref} onClick={onClick} style={{ cursor: 'pointer' }}>
            { children }
        </span>
    )
})
SimpleDropdown.propTypes = {
    children: PropTypes.arrayOf(PropTypes.element),
    onClick: PropTypes.func
}