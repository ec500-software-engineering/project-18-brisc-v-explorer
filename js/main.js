gui = require('./gui.js');
verilog = require('./verilog.js');

const SaveStageEnum = {
    STAGE_1: 0,
    STAGE_2: 1
};

function createZip(userParams, zip, saveArgs) {
    var fileReader = new FileReader();
    fileReader.onload = function (e) {
        // Put program in zip
        zip.file(userParams['program'].slice(2), fileReader.result);
        //zipProject(projectContentList, zip);
        // put png in zip
        zip.file('block_diagram.png', saveArgs.png);

        // Display parameters on output text area
        dispStr = "Generating Project with the following settings:\n";
        dispStr += "Project Name: " + userParams['project_name'] + "\n";
        dispStr += "Core Type: " + userParams['core_type'] + "\n";
        dispStr += "Data Width: " + userParams['data_width'] + "\n";
        dispStr += "Index Bits: " + userParams['index_bits'] + " (Fixed and Unused)\n";
        dispStr += "Offset Bits: " + userParams['offset_bits'] + " (Fixed and Unused)\n";
        dispStr += "Address Bits: " + userParams['address_bits'] + "\n";
        dispStr += "Program: " + userParams['program'] + "\n";
        // Overwrite any output currently in the text area. This may not be the best
        // action to take. Consider appending text and storing 100ish lines.
        document.getElementById("output_textarea").value = dispStr;

        // Generate and download the zip file
        zip.generateAsync({
            type: 'blob'
        }).then(function (content) {
            // see FileSaver.js
            saveAs(content, userParams['project_name'] + '.zip');
        });
    };

    var file = document.getElementById("program").files[0];
    fileReader.readAsText(file);
}

function addBlockDiagramToProject(pngBlob) {
    saveProject(SaveStageEnum.STAGE_2, {png: pngBlob});
}

// kinda hacky but args represents objects we need to add to the final zip
// because javascript is heavy on callbacks, we keep passing a reference
// to our needed objects on the stack until we finally zip the project
// SaveStageEnum helps us keep track of where we are in the save process
function saveProject(stage, args) {
    var dispStr;
    if (!document.getElementById("program").files[0]) {
        dispStr = "Error: You must select a program file\n";
        document.getElementById("output_textarea").value = dispStr;
        return;
    }
    // TODO: visualize progression through status bar or console output
    if (stage === SaveStageEnum.STAGE_1) {
        diagram.getBlockDiagramPngBlob(addBlockDiagramToProject);
    } else if (stage === SaveStageEnum.STAGE_2) {
        // assert args !== {}
        var userParams = gui.getUserParams();
        // this launch an async request to fetch files from the remote server
        verilog.remote.getConfiguredProject(userParams, createZip, args);
    }
}

function loadUserParameters(configJson) {
    $('#project_name').val(configJson['project_name']);
    $('#data_width').val(configJson['data_width']);
    $('num_indexesL1').val(configJson['#num_indexesL1']);
    $('#associativityL1').val(configJson['associativityL1']);
    $('#line_size').val(configJson['line_size']);
    $('#index_bits').val(configJson['index_bits']);
    $('#offset_bits').val(configJson['offset_bits']);
    $('#address_bits').val(configJson['address_bits']);
    $('#core-sel').val(configJson['core_type']);
}


window.onload = function () {
    // initialize diagram
    gui.init();
    $('#download-project-button').on('click', function(event) {
        saveProject(SaveStageEnum.STAGE_1, {});
    });
    $('#download-diagram-button').on('click', function(event) {
        diagram.saveBlockDiagramAsPng();
    });
    $('#config').on('change', function(event) {
        var reader = new FileReader();
        reader.onload = function(event) {
            console.log(event.target.result);
            var configJson = JSON.parse(event.target.result);
            console.log(configJson);
            loadUserParameters(configJson);
        };
        reader.readAsText(event.target.files[0]);
    });
    $('#download-config-button').on('click', function(event) {
        var userParams = gui.getUserParams();
        var data = JSON.stringify(userParams);
        var blob = new Blob([data], {
            type: 'application/json;charset=utf-8'
        });
        saveAs(blob, 'briscv_config.ebv');
    });
    
};