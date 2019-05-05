gui = require('./gui.js');
verilog = require('./verilog.js');
binaries = require('./example_binaries.js');

const SaveStageEnum = {
    STAGE_1: 0,
    STAGE_2: 1
};

function finalizeZip(userParams, zip, saveArgs) {
    zip.file('block_diagram.png', saveArgs.png);
    // Display parameters on output text area
    gui.messageWindow.println("Generating Project with the following settings:");
    gui.messageWindow.println("Project Name: " + userParams['project_name']);
    gui.messageWindow.println("Core Type: " + userParams['core_type']);
    gui.messageWindow.println("Data Width: " + userParams['data_width']);
    gui.messageWindow.println("Index Bits: " + userParams['index_bits'] + " (Fixed and Unused)")
    gui.messageWindow.println("Offset Bits: " + userParams['offset_bits'] + " (Fixed and Unused)");
    gui.messageWindow.println("Address Bits: " + userParams['address_bits']);
    if (userParams['program'] === 'gcd_default') {
        gui.messageWindow.println("Program: ./" + binaries.gcd.filename);
    } else if (userParams['program'] === 'factorial_default') {
        gui.messageWindow.println("Program: ./" + binaries.factorial.filename);
    } else {
        gui.messageWindow.println("Program: " + userParams['program']);
    }

    // Generate and download the zip file
    zip.generateAsync({
        type: 'blob'
    }).then(function (content) {
        // see FileSaver.js
        saveAs(content, userParams['project_name'] + '.zip');
    });
}

function addProgramToZip(userParams, zip, saveArgs) {
    if (userParams['program'] === 'gcd_default') {
        zip.file(binaries.gcd.filename, binaries.gcd.content);
        finalizeZip(userParams, zip, saveArgs);
    } else if (userParams['program'] === 'factorial_default') {
        zip.file(binaries.gcd.filename, binaries.factorial.content);
        finalizeZip(userParams, zip, saveArgs);
    } else {
        var fileReader = new FileReader();
        fileReader.onload = function (e) {
            zip.file(userParams['program'].slice(2), fileReader.result);
            finalizeZip(userParams, zip, saveArgs);
        };
        var file = $('#program').val();
        fileReader.readAsText(file);
    }
}

function addBlockDiagramToProject(pngBlob) {
    saveProject(SaveStageEnum.STAGE_2, {
        png: pngBlob
    });
}

// kinda hacky but args represents objects we need to add to the final zip
// because javascript is heavy on callbacks, we keep passing a reference
// to our needed objects on the stack until we finally zip the project
// SaveStageEnum helps us keep track of where we are in the save process
function saveProject(stage, args) {
    if ($('#custom_radio').is(':checked') && !$('#program').val()) {
        gui.messageWindow.println("Error: You must select a program file");
        return;
    }
    // TODO: visualize progression through status bar or console output
    if (stage === SaveStageEnum.STAGE_1) {
        diagram.getBlockDiagramPngBlob(addBlockDiagramToProject);
    } else if (stage === SaveStageEnum.STAGE_2) {
        // assert args !== {}
        var userParams = getUserParameters();
        // this launch an async request to fetch files from the remote server
        verilog.remote.getConfiguredProject(userParams, addProgramToZip, args);
    }
}

function loadUserParameters(configJson) {
    $('#project_name').val(configJson['project_name']);
    $('#data_bit_width').val(configJson['data_width']);
    $('#address_bit_width').val(configJson['address_bits']);
    $('num_indexes_11').val(configJson['#num_indexesL1']);
    $('#associativity_sel_l1').val(configJson['associativityL1']);
    $('#line_size').val(configJson['line_size']);
    $('#offset_bits').val(configJson['offset_bits']);
    if (configJson['core_type'] === 'Single Cycle') {
        $('#cycle_type_sel').val(configJson['core_type']);
        $('#cycle_type_sel').selectpicker('refresh');
    } else {
        $('#cycle_type_sel').val('Multi Cycle');
        $('#cycle_type_sel').selectpicker('refresh');
        if (configJson['core_type'] === '5 Stage Stalled Pipeline') {
            $('#num_stages_sel').val('5 Stage');
            $('#pipeline_logic_sel_1').val('Stalled Pipeline');
            $('#pipeline_logic_sel_1').selectpicker('refresh');
            $('#num_stages_sel').selectpicker('refresh');
        } else if (configJson['core_type'] === '5 Stage Bypassed Pipeline') {
            $('#num_stages_sel').val('5 Stage');
            $('#pipeline_logic_sel_1').val('Bypassed Pipeline');
            $('#pipeline_logic_sel_1').selectpicker('refresh');
            $('#num_stages_sel').selectpicker('refresh');
        } else if (configJson['core_type'] === '7 Stage Bypassed Pipeline') {
            $('#num_stages_sel').val('7 Stage');
            $('#pipeline_logic_sel_2').val('Bypassed Pipeline');
        }
        $('#cycle_type_sel').trigger('change');
        $('#num_stages_sel').trigger('change');
    }
}


function getUserParameters() {
    // Get all of the user input parameters
    var dict = {}
    dict['project_name'] = $('#project_name').val();
    var cycleType = $('#cycle_type_sel').find(':selected').text();
    if (cycleType === 'Single Cycle') {
        dict['core_type'] = cycleType;
    } else {
        var numStages = $('#num_stages_sel').find(':selected').val();
        if (numStages === '5 Stage') {
            var pipelineLogic = $('#pipeline_logic_sel_1').find(':selected').val();
        } else {
            var pipelineLogic = $('#pipeline_logic_sel_2').find(':selected').val();
        }
        dict['core_type'] = `${numStages} ${pipelineLogic}`;
    }
    // Hard code this parameter. It is not used in these cores.
    dict['core'] = 0;
    dict['data_width'] = $('#data_bit_width').val();
    // Cache are unused in the current cores
    dict['num_indexesL1'] = $('#num_indexes_l1').val();
    dict['associativityL1'] = $('#associativity_sel_l1').val();
    dict['line_size'] = $('#line_size').val();
    dict['index_bitsL1'] = Math.log2(dict['num_indexesL1']);
    dict['offset_bitsL1'] = Math.log2(dict['line_size']);
    dict['address_bits'] = $('#address_bit_width').val();
    dict['default_program_chosen'] = true;
    if ($('#factorial_radio').is(':checked')) {
        dict['program'] = './factorial.vmh';
        dict['default_prog_name'] = 'factorial_default';
    } else if ($('#gcd_radio').is(':checked')) {
        dict['program'] = './gcd.vmh';
        dict['default_prog_name'] = 'gcd_default';
    } else if ($('#custom_radio').is(':checked')) {
        dict['program'] = './' + $('#program').val();
        dict['default_program_chosen'] = false;
    } // TODO: handle else case
    return dict;
}

function sanitizeProjectName() {
    var projectName = $('#project_name').val();
    var cleanProjectName = projectName.replace(/[^a-zA-Z1-9 ]/g, '_');

    if (cleanProjectName !== projectName) {
        gui.messageWindow.println("Warning: Replacing non alpha-numeric charachters in Project Name with underscores.");
        gui.messageWindow.println("Original Name: " + projectName);
        gui.messageWindow.println("Clean Name: " + cleanProjectName);
        $('#project_name').val(cleanProjectName);
    }
}


window.onload = function () {
    // initialize diagram
    gui.init();
    $('#download_project_button').on('click', function (event) {
        saveProject(SaveStageEnum.STAGE_1, {});
    });
    $('#download_diagram_button').on('click', function (event) {
        diagram.saveBlockDiagramAsPng();
    });
    $('#config').on('change', function (event) {
        var reader = new FileReader();
        reader.onload = function (event) {
            console.log(event.target.result);
            var configJson = JSON.parse(event.target.result);
            console.log(configJson);
            loadUserParameters(configJson);
        };
        reader.readAsText(event.target.files[0]);
    });
    $('#download_config_button').on('click', function (event) {
        var userParams = getUserParameters();
        var data = JSON.stringify(userParams);
        var blob = new Blob([data], {
            type: 'application/json;charset=utf-8'
        });
        var configName = $('#config_name').val();
        if (!configName.endsWith('.ebv'))
            configName += '.ebv';
        saveAs(blob, configName);
    });
    $('#default_radio').prop('checked', true);
    $('#default_radio').on('change', function (event) {
        $('#program-form').css('display', 'none');
    });
    $('#choose_radio').on('change', function (event) {
        $('#program-form').css('display', 'block');
    });
    $('#project_name').on('input', function (event) {
        sanitizeProjectName();
    });
};