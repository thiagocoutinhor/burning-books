export function chunkCopytext(index, chunk) {
    const comment = `${'/'.repeat(80)}\n// BLOCK ${index}${chunk.name ? ' - ' + chunk.name : ''}\n${'/'.repeat(80)}\n\n`
    return `${comment}${chunk.command}`
}

export function doCopy(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
    } else {
        const helper = document.createElement('textarea')
        helper.value = text
        document.body.appendChild(helper)
        helper.select()
        document.execCommand('copy')
        document.body.removeChild(helper)
    }
}

export function editablePrevent(event) {
    const shouldIgnore = event.key === 'Enter'
        || (event.ctrlKey && ['B', 'b', 'I', 'i', 'u', 'U'].includes(event.key))
    if (shouldIgnore) {
        event.preventDefault()
    }
}
