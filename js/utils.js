function getStrCopy(str) {
    return (' ' + str).slice(1);
}

function getHumanReadableSizeStr(numStr) {
    var sizeStr = "Invalid";
    if (numStr < 0) {
        sizeStr = "Invalid";
    } else if (numStr < 10) {
        sizeStr = (2 ** numStr).toString() + 'B';
    } else if (numStr < 20) {
        sizeStr = Math.floor((2 ** numStr) / 2 ** 10).toString() + 'kB';
    } else if (numStr < 30) {
        sizeStr = Math.floor((2 ** numStr) / 2 ** 20).toString() + 'MB';
    } else if (numStr < 33) {
        sizeStr = Math.floor((2 ** numStr) / 2 ** 30).toString() + 'GB';
    }
    return sizeStr;
}


exports.getStrCopy = getStrCopy;
exports.getHumanReadableSizeStr = getHumanReadableSizeStr;