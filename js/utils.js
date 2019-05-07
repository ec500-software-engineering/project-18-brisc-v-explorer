const BytesSizeEnum = {
    KILOBYTE: 1024,
    MEGABYTE: 1024 * 1024,
    GIGABYTE: 1024 * 1024 * 1024
};

function getStrCopy(str) {
    return (' ' + str).slice(1);
}

function getHumanReadableSizeStrFromBits(numBits) {
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

function getHumanReadableSizeStrFromBytes(numBytes) {
    var sizeStr = 'Invalid';
    if (numBytes < 0)
        sizeStr = 'Invalid';
    else if (numBytes < BytesSizeEnum.KILOBYTE ) {
        sizeStr = `${numBytes} B`;
    } else if (numBytes < BytesSizeEnum.MEGABYTE) {
        var sizeInKb = Math.floor(numBytes / BytesSizeEnum.KILOBYTE);
        sizeStr = `${sizeInKb} kB`;
    } else if (numBytes < BytesSizeEnum.GIGABYTE) {
        var sizeInMb = Math.floor(numBytes / BytesSizeEnum.MEGABYTE);
        sizeStr = `${sizeStr} MB`;
    } else {
        var sizeInGb = Math.floor(numBytes / BytesSizeEnum.GIGABYTE);
        sizeStr = `${sizeStr} GB`;
    }
    return sizeStr;
}

exports.getStrCopy = getStrCopy;
exports.getHumanReadableSizeStrFromBits = getHumanReadableSizeStrFromBits;
exports.getHumanReadableSizeStrFromBytes = getHumanReadableSizeStrFromBytes;