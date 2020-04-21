import React from 'react'

export const SimpleDropdown = React.forwardRef(({children, onClick}, ref) => {
    return (
        <span ref={ref} onClick={onClick} style={{ cursor: 'pointer' }}>
            { children }
        </span>
    )
})