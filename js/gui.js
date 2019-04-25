utils = require('./utils.js');

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
    var singleCycleSvg = document.getElementById("diagram_single_cycle_svg");
    var fiveStagePipeline = document.getElementById("diagram_five_stage_pipeline_svg");
    var sevenStagePipeline = document.getElementById("diagram_seven_stage_pipeline_svg");
    var oooPipeline = document.getElementById("diagram_ooo_pipeline_svg");

    // Single Cycle
    if (selector.value == "Single Cycle") {
        singleCycleSvg.style.display = "block";
        updateSingleCycleDiagram();
    } else {
        singleCycleSvg.style.display = "none";
    }

    // Five Stage Pipeline
    if (selector.value == "5 Stage Stalled Pipeline" || selector.value == "5 Stage Bypassed Pipeline") {
        fiveStagePipeline.style.display = "block";
        updateFiveStagePipelineDiagram();
    } else {
        fiveStagePipeline.style.display = "none";
    }

    // Seven Stage Pipeline
    if (selector.value == "7 Stage Bypassed Pipeline") {
        sevenStagePipeline.style.display = "block";
        updateSevenStagePipelineDiagram();
    } else {
        sevenStagePipeline.style.display = "none";
    }

    // Out Of Order Pipeline
    if (selector.value == "Out Of Order Pipeline") {
        oooPipeline.style.display = "block";
        updateOOOPipleDiagram();
    } else {
        oooPipeline.style.display = "none";
        document.getElementById("instruction_queue_length").value = "N/A";
        document.getElementById("instruction_queue_length").disabled = true;
    }

}

function getUserParameters() {
    // Get all of the user input parameters
    var dict = {}
    dict['project_name'] = document.getElementById("project_name").value;
    dict['core_type'] = document.getElementById("sel1").value;
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

    //var print_cycles_min
    //var print_cycles_max

    // Get file name
    dict['program'] = "./" + document.getElementById("program").files[0].name;
    // Load the file content
    var reader = new FileReader();
    dict['program_reader'] = reader;

    return dict;
}

function init() {
    // Address Bits Update
    var svgIds = ['sc_i_mem_size', 'sc_d_mem_size', '5sp_i_mem_size',
                   '5sp_d_mem_size', 'ooo_i_mem_size', 'ooo_d_mem_size'];
    updateBramSvg(utils.getMemorySizeFromInput(), svgIds);

    // Instruction Queue Update
    selector = document.getElementById('sel1');
    if (selector.value == "Out Of Order Pipeline") {
        var svgIds = ['ooo_instruction_queue_length'];
        updateIQueueSvg('instruction_queue_length', svgIds);
    }
}

exports.init = init;
exports.consoleWindow = consoleWindow;
exports.getUserParams = getUserParameters;
exports.updateBlockDiagram = updateBlockDiagram;
exports.cleanProjectName = cleanProjectName;