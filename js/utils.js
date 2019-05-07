function getStrCopy(str) {
    return (' ' + str).slice(1);
}

function getHumanReadableSizeStr(numBytes) {
    var sizeStr = 'Invalid';
    if (numBytes < 0) {
        sizeStr = 'Invalid';
    } else if (numBytes < 10) {
        sizeStr = (2 ** numBytes).toString() + 'B';
    } else if (numBytes < 20) {
        sizeStr = Math.floor((2 ** numBytes) / 2 ** 10).toString() + 'kB';
    } else if (numBytes < 30) {
        sizeStr = Math.floor((2 ** numBytes) / 2 ** 20).toString() + 'MB';
    } else if (numBytes < 33) {
        sizeStr = Math.floor((2 ** numBytes) / 2 ** 30).toString() + 'GB';
    }
    return sizeStr;
}


exports.getStrCopy = getStrCopy;
exports.getHumanReadableSizeStr = getHumanReadableSizeStr;