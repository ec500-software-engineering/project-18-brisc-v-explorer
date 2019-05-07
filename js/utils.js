function getStrCopy(str) {
    return (' ' + str).slice(1);
}

function getHumanReadableSizeStrFromBits(numBits) {
    console.log(numBits);
    var sizeStr = 'Invalid';
    if (numBits < 0) {
        sizeStr = 'Invalid';
    } else if (numBits < 10) {
        sizeStr = (2 ** numBits).toString() + 'B';
    } else if (numBits < 20) {
        sizeStr = Math.floor((2 ** numBits) / 2 ** 10).toString() + 'kB';
    } else if (numBits < 30) {
        sizeStr = Math.floor((2 ** numBits) / 2 ** 20).toString() + 'MB';
    } else if (numBits < 33) {
        sizeStr = Math.floor((2 ** numBits) / 2 ** 30).toString() + 'GB';
    }
    return sizeStr;
}


exports.getStrCopy = getStrCopy;
exports.getHumanReadableSizeStrFromBits = getHumanReadableSizeStrFromBits;