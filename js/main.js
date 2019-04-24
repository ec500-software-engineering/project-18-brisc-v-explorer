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

function getBlockName(cellView) {
     return cellView.model.prop('attrs/label/text').replace(/\n/g, ' ');
}

function initSingleCycleDiagram() {
    var graph = new joint.dia.Graph;
    
    var paper = new joint.dia.Paper({
        el: document.getElementById('diagram-div'),
        model: graph,
        width: 500,
        height: 400,
        gridSize: 1
    });
    
    paper.on('cell:pointerdown', function(cellView, evt, x, y) {
        console.log(`Mouse click on (${x}, ${y}): detected element \"${getBlockName(cellView)}\"`);
    });
    paper.on('cell:pointerdblclick', function(cellView, evt, x, y) {
        console.log(`Double click on (${x}, ${y}): detected element \"${getBlockName(cellView)}\"`);
    });
    
    var fetchBlock = new joint.shapes.standard.Rectangle();
    fetchBlock.position(6, 106);
    fetchBlock.resize(80, 100);
    fetchBlock.attr({
        body: {
            rx: 8,
            ry: 8,
            fill: '#71b3aa'
        },
        label: {
            fill: 'white',
            text: 'Fetch\nUnit'
        }
    });
    fetchBlock.addTo(graph);
    fetchBlock.on('change:position', function() {
        console.log('FetchBlock position: ' + fetchBlock.position());
    });

    // decode block
    var decodeBlock = fetchBlock.clone();
    decodeBlock.position(110, 106);
    decodeBlock.attr('label/text', 'Decode\nUnit');
    decodeBlock.attr('body/fill', '#77b1bd');
    decodeBlock.addTo(graph);
    decodeBlock.on('change:position', function() {
        console.log('DecodeBlock position: ' + decodeBlock.position());
    });
    // instruction memory
    var insMemoryBlock = fetchBlock.clone();
    insMemoryBlock.position(fetchBlock.position().x, 253);
    insMemoryBlock.attr('label/text', 'Instruction\nMemory\n16kB');
    insMemoryBlock.resize(100, 60);
    insMemoryBlock.attr('body/fill', '#993131');
    insMemoryBlock.addTo(graph);
    insMemoryBlock.on('change:position', function() {
        console.log('InsMemoryBlock position: ' + insMemoryBlock.position());
    });
    // execute block
    var executeBlock = fetchBlock.clone();
    executeBlock.position(205, 106);
    executeBlock.attr('label/text', 'Execute\nUnit');
    executeBlock.attr('body/fill', '#597cab');
    executeBlock.addTo(graph);
    executeBlock.on('change:position', function() {
        console.log('ExectuteBlock position: ' + executeBlock.position());
    });
    // memory unit
    var memoryUnitBlock = fetchBlock.clone();
    memoryUnitBlock.position(306, 106);
    memoryUnitBlock.attr('label/text', 'Memory\nUnit');
    memoryUnitBlock.attr('body/fill', '#5762ab');
    memoryUnitBlock.addTo(graph);
    memoryUnitBlock.on('change:position', function() {
        console.log('MemoryUnitBlock position: ' + memoryUnitBlock.position());
    });
    // data memory
    var dataMemoryBlock = fetchBlock.clone();
    dataMemoryBlock.position(memoryUnitBlock.position().x, 253);
    dataMemoryBlock.attr('label/text', 'Data\nMemory\n16kB');
    dataMemoryBlock.attr('body/fill', '#993131');
    dataMemoryBlock.resize(100, 60);
    dataMemoryBlock.addTo(graph);
    dataMemoryBlock.on('change:position', function() {
        console.log('DataMemoryBlock position: ' + dataMemoryBlock.position());
    });
    // write back
    var writeBackBlock = fetchBlock.clone();
    writeBackBlock.position(405, 106);
    writeBackBlock.attr('label/text', 'Writeback\nUnit');
    writeBackBlock.attr('body/fill', '#4f4d85');
    writeBackBlock.addTo(graph);
    writeBackBlock.on('change:position', function() {
        console.log('WriteBackBlock position: ' + writeBackBlock.position());
    });
    // control unit
    var controlUnitBlock = fetchBlock.clone();
    controlUnitBlock.resize(80, 35);
    controlUnitBlock.position(109, 40);
    controlUnitBlock.attr('label/text', 'Control\nUnit');
    controlUnitBlock.attr('body/fill', '#77b1bd');
    controlUnitBlock.addTo(graph);
    controlUnitBlock.on('change:position', function() {
        console.log('ControlUnitBlock position: ' + controlUnitBlock.position());
    });
    
    // Linking
    var fetchToDecodeLink = new joint.shapes.standard.Link();
    fetchToDecodeLink.source(fetchBlock);
    fetchToDecodeLink.target(decodeBlock);
    fetchToDecodeLink.attr({
        line: {
            strokeWidth: 2,
            stroke: fetchBlock.attr('body/fill'),
            targetMarker: {
                type: 'path',
                fill: fetchBlock.attr('body/fill')
            }
        }
    });
    fetchToDecodeLink.addTo(graph);
    
    var decodeToExecuteLink = fetchToDecodeLink.clone();
    decodeToExecuteLink.source(decodeBlock);
    decodeToExecuteLink.target(executeBlock);
    decodeToExecuteLink.attr('line/stroke', decodeBlock.attr('body/fill'));
    decodeToExecuteLink.attr('line/targetMarker/fill', decodeBlock.attr('body/fill'));
    decodeToExecuteLink.addTo(graph);
    
    var executeToMemoryLink = decodeToExecuteLink.clone();
    executeToMemoryLink.source(executeBlock);
    executeToMemoryLink.target(memoryUnitBlock);
    executeToMemoryLink.attr('line/stroke', executeBlock.attr('body/fill'));
    executeToMemoryLink.attr('line/targetMarker/fill', executeBlock.attr('body/fill'));
    executeToMemoryLink.addTo(graph);
    
    var memoryToWriteBackLink = executeToMemoryLink.clone();
    memoryToWriteBackLink.source(memoryUnitBlock);
    memoryToWriteBackLink.target(writeBackBlock);
    memoryToWriteBackLink.attr('line/stroke', memoryUnitBlock.attr('body/fill'));
    memoryToWriteBackLink.attr('line/targetMarker/fill', memoryUnitBlock.attr('body/fill'));
    memoryToWriteBackLink.addTo(graph);
    
    // control unit links
    var controlToFetchLink = fetchToDecodeLink.clone();
    controlToFetchLink.source(controlUnitBlock);
    controlToFetchLink.target(fetchBlock);
    controlToFetchLink.addTo(graph);
    var controlToDecodeLink = controlToFetchLink.clone();
    controlToDecodeLink.target(decodeBlock);
    controlToDecodeLink.attr({
        line: {
            strokeWidth: 2,
            stroke: controlUnitBlock.attr('body/fill'),
            sourceMarker: {
                type: 'path',
                fill: controlUnitBlock.attr('body/fill'),
                d: controlToDecodeLink.attr('line/targetMarker/d')
            }
        }
    });
    console.log(controlToDecodeLink.attr('line'));
    controlToDecodeLink.addTo(graph);
    var controlToExectuteLink = controlToFetchLink.clone();
    controlToExectuteLink.target(executeBlock);
    controlToExectuteLink.addTo(graph);
    var controlToMemoryLink = controlToExectuteLink.clone();
    controlToMemoryLink.target(memoryUnitBlock);
    controlToMemoryLink.addTo(graph);
    var controlToWriteBack = controlToMemoryLink.clone();
    controlToWriteBack.target(writeBackBlock);
    controlToWriteBack.vertices({
        
    });
    controlToWriteBack.addTo(graph);
    
    var memoryUnitToDataMemoryLink = controlToDecodeLink.clone();
    memoryUnitToDataMemoryLink.source(memoryUnitBlock);
    memoryUnitToDataMemoryLink.target(dataMemoryBlock);
    memoryUnitToDataMemoryLink.attr('line/stroke', memoryUnitBlock.attr('body/fill'));
    memoryUnitToDataMemoryLink.attr('line/targetMarker/fill', memoryUnitBlock.attr('body/fill'));
    memoryUnitToDataMemoryLink.attr('line/sourceMarker/fill', memoryUnitBlock.attr('body/fill'));
    memoryUnitToDataMemoryLink.addTo(graph);
    
    var fetchToInsMemoryLink = controlToDecodeLink.clone();
    fetchToInsMemoryLink.source(fetchBlock);
    fetchToInsMemoryLink.target(insMemoryBlock);
    fetchToInsMemoryLink.attr('line/stroke', fetchBlock.attr('body/fill'));
    fetchToInsMemoryLink.attr('line/targetMarker/fill', fetchBlock.attr('body/fill'));
    fetchToInsMemoryLink.attr('line/sourceMarker/fill', fetchBlock.attr('body/fill'));
    fetchToInsMemoryLink.addTo(graph);
    
}

window.onload = function () {
    // initialize diagram
    initSingleCycleDiagram();
    // set handlers
    //document.getElementById('generate-button').onclick = saveProject;
    ///document.getElementById('project_name').onchange = gui.cleanProjectName;
    // initialize gui
    //gui.init();
};