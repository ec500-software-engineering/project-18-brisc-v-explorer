utils = require('./utils.js');
diagram = require('./block_diagram.js');

var consoleWindow = {
    consoleStr: '',

    print: function (str) {
        var consoleElem = document.getElementById('console');
        if (consoleElem != null) {
            consoleStr += str.replace('\n', '<br>');
            consoleElem.innerHTML = consoleStr;
            consoleElem.scrollTop = consoleElem.scrollHeight;
        }
    },

    println: function (str) {
        print('\n');
    },

    clear: function () {
        var consoleElem = document.getElementById('console');
        if (consoleElem != null) {
            consoleElem.innerHTML = '';
            consoleStr = '';
        }
    }
};

function changeText(id_value, text_str, text_index) {
    var fontObject = document.getElementById(id_value);
    fontObject.childNodes[text_index].remove();
    var t = document.createTextNode(text_str);
    fontObject.appendChild(t);
    return;

}

// Set single cycle diagram to match current parameters
function updateSingleCycleDiagram() {
    var svgIdList = ['sc_i_mem_size', 'sc_d_mem_size'];
    var memSize = compute_memory_size();
    updateBramSvg(memSize, svgIdList);
}

// Set five stage pipeline diagram to match current parameters
function updateFiveStagePipelineDiagram() {
    var svgIdList = ['5sp_i_mem_size', '5sp_d_mem_size'];
    var memSize = compute_memory_size();
    updateBramSvg(memSize, svgIdList);
}

// Set seven stage pipeline diagram to match current parameters
function updateSevenStagePipelineDiagram() {
    var svgIdList = ['7sp_i_mem_size', '7sp_d_mem_size'];
    var memSize = compute_memory_size();
    updateBramSvg(memSize, svgIdList);
}

// Set OOO diagram to match current parameters
function updateOOOPipleDiagram() {
    var svgIdList = ['ooo_i_mem_size', 'ooo_d_mem_size'];
    var memSize = compute_memory_size();
    updateBramSvg(memSize, svgIdList);
    var svgIdList = ['ooo_instruction_queue_length'];
    updateIQueueSvg('instruction_queue_length', svgIdList);
    document.getElementById("instruction_queue_length").value = "4";
    document.getElementById("instruction_queue_length").disabled = false;
}


function updateBramSvg(textNumber, svgIdList) {
    // TODO: use logging library
    console.log(textNumber);
    var svgText = "Invalid";
    if (textNumber < 0) {
        svgText = "Invalid";
    } else if (textNumber < 10) {
        svgText = (2 ** textNumber).toString() + "B";
    } else if (textNumber < 20) {
        svgText = Math.floor((2 ** textNumber) / 2 ** 10).toString() + "kB";
    } else if (textNumber < 30) {
        svgText = Math.floor((2 ** textNumber) / 2 ** 20).toString() + "MB";
    } else if (textNumber < 33) {
        svgText = Math.floor((2 ** textNumber) / 2 ** 30).toString() + "GB";
    }

    for (var i = 0; i < svgIdList.length; i++) {
        var svgId = svgIdList[i];
        changeText(svgId, svgText, 0);
    }
}

function updateIQueueSvg(inputId, svgIdList) {
    document.getElementById(inputId).oninput = function (inputEvent) {
        var textValue = document.getElementById(inputId).value;
        var textNumber = parseInt(textValue, 10);
        var svgText = "Invalid Length";

        if (textNumber < 0) {
            svgText = "Invalid<br />Length";
        }
        if (textNumber < 10) {
            svgText = "Length: " + textNumber.toString();
        } else if (textNumber < 100) {
            svgText = "Length:<br />" + textNumber.toString();
        }

        for (var i = 0; i < svgIdList.length; i++) {
            var svgId = svgIdList[i];
            changeText(svgId, svgText, 0);
        }
    };
}

function cleanProjectName() {
    // This function finds and removes/replaces charachters that cannot be in
    // verilog module names.

    var projectName = document.getElementById("project_name").value;
    var cleanProjectName = projectName.replace(/[^a-zA-Z1-9 ]/g, "_");
    var dispStr;

    if (cleanProjectName != projectName) {
        dispStr = "Warning: Replacing non alpha-numeric charachters in Project Name with underscores.";
        dispStr += "\nOriginal Name: " + projectName;
        dispStr += "\nClean Name: " + cleanProjectName;
        document.getElementById("output_textarea").value = dispStr;
        document.getElementById("project_name").value = cleanProjectName;
    }
}

function updateBlockDiagram(selector) {
    if (selector === 'Single Cycle')
        diagram.showSingleCycleDiagram();
    else if (selector === '5 Stage Stalled Pipeline' 
             || selector === '5 Stage Bypassed Pipeline')
        diagram.show5StagePipelineDiagram();
    else if (selector === '7 Stage Bypassed Pipeline') 
        diagram.show7StagePipelineDiagram();
    else
        console.log(`"${selector}" diagram not supported yet...`);
}

function getUserParameters() {
    // Get all of the user input parameters
    var dict = {}
    dict['project_name'] = document.getElementById("project_name").value;
    dict['core_type'] = document.getElementById("core-sel").value;
    // Hard code this parameter. It is not used in these cores.
    dict['core'] = 0;
    dict['data_width'] = document.getElementById("data_width").value;
    // Cache are unused in the current cores
    dict['num_indexesL1'] = document.getElementById("num_indexesL1").value;
    dict['associativityL1'] = document.getElementById("associativityL1").value;
    dict['line_size'] = document.getElementById("line_size").value;
    dict['index_bits'] = Math.log2(dict['num_indexesL1']);
    dict['offset_bits'] = Math.log2(dict['line_size']);
    dict['address_bits'] = document.getElementById("address_bits").value;
    dict['program'] = './' + document.getElementById('program').files[0].name;
    return dict;
}

function init() {
    // Address Bits Update
    diagram.initCanvas();
    diagram.showSingleCycleDiagram();
    $('#core-sel').on('change', function(event) {
        updateBlockDiagram(event.target.value);
    });
    
}

exports.init = init;
exports.consoleWindow = consoleWindow;
exports.getUserParams = getUserParameters;
exports.updateBlockDiagram = updateBlockDiagram;
exports.cleanProjectName = cleanProjectName;