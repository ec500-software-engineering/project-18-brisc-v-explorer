gui = require('./gui.js');
verilog = require('./verilog.js');

function saveProject() {
    var dispStr;
    if (!document.getElementById("program").files[0]) {
        dispStr = "Error: You must select a program file\n";
        document.getElementById("output_textarea").value = dispStr;
        return;
    }
    var userParams = gui.getUserParams();
    var zip = new JSZip();
    var projectContentList = verilog.local.getConfiguredProject(userParams);
    
    userParams['program_reader'].onload = function (e) {
        // Put program in zip
        zip.file(userParams['program'].slice(2), userParams['program_reader'].result);
        zipProject(projectContentList, zip);

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

        // FIXME: This doesn't work on chrome
        // Generate and download the zip file
        zip.generateAsync({
                type: "blob"
            })
            .then(function (content) {
                // see FileSaver.js
                saveAs(content, userParams['project_name'] + ".zip");
            });
    }

    var file = document.getElementById("program").files[0]; // get first file
    userParams['program_reader'].readAsText(file);
}

function updateBlockDiagram(selector) {
    gui.updateBlockDiagram(selector);
}

function zipProject(contentList, zip) {
    var arrayLen = contentList.length;
    for (var i = 0; i < arrayLen; i++) {
        zip.file(contentList[i].filename, contentList[i].fileContent);
    }
}

window.onload = function () {
    // set handlers
    document.getElementById('generate-button').onclick = saveProject;
    document.getElementById('project_name').onchange = gui.cleanProjectName;
    // initialize gui
    gui.init();
};