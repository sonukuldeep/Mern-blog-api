function splitLastOccurrence(str, substring) {
    const lastIndex = str.lastIndexOf(substring);

    const after = str.slice(lastIndex + 1);

    return after;
}

function newPath(path, str, substring = ".") {
    const fullPath = path + "." + splitLastOccurrence(str, substring)
    return fullPath
}

module.exports = { newPath }