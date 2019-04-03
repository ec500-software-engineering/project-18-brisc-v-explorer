function getStrCopy(str) {
    return (' ' + str).slice(1);
}

function getIdAsInt(inputId) {
    var textValue = document.getElementById(inputId).value;
    var textNumber = parseInt(textValue, 10);
    return textNumber;
}


function getMemorySizeFromInput() {
    var addressBits = getIdAsInt('address_bits');
    var dataWidth = getIdAsInt('data_width');
    return addressBits + Math.log2(dataWidth) - 3;
}

exports.getStrCopy = getStrCopy;
exports.getMemorySizeFromInput = getMemorySizeFromInput;