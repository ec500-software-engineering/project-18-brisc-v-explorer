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
    if (cellView !==  undefined) {
         return cellView.model.prop('attrs/label/text').replace(/\n/g, ' ');
    } 
}

function getRegfileTemplate(x, y) {
    var regfileBlock = new joint.shapes.standard.Rectangle();
    regfileBlock.attr({
         body: {
            rx: 6,
            ry: 6,
            fill: '#bababa'
        },
        label: {
            fill: 'black'
        }
    });
    regfileBlock.position(x, y);
    regfileBlock.resize(35, 80);
    regfileBlock.attr('body/fill', '#bababa');
    regfileBlock.attr('label/text', 'Reg\nFile');
    regfileBlock.attr('label/fill', 'black');
    var clockPathSymbol = new joint.shapes.standard.Path();
    clockPathSymbol.attr({
        body: {
            refD: 'M8 48 L56 48 L32 12 Z',
            fill: '#bababa'
        }
    });
    clockPathSymbol.resize(12, 8);
    var regfileHalfX = regfileBlock.position().x + (regfileBlock.attributes.size.width / 2) - (clockPathSymbol.attributes.size.width / 2);
    var regfileBottomY = regfileBlock.position().y + regfileBlock.attributes.size.height - clockPathSymbol.attributes.size.height;
    clockPathSymbol.position(regfileHalfX, regfileBottomY);
    return {
        regfile: regfileBlock,
        clockSymbol: clockPathSymbol
    };
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
    fetchBlock.position(20, 106);
    fetchBlock.resize(70, 80);
    fetchBlock.attr({
        body: {
            rx: 6,
            ry: 6,
            fill: '#71b3aa'
        },
        label: {
            fill: 'white',
            text: 'Fetch\nUnit'
        }
    });
    fetchBlock.addTo(graph);
    console.log(fetchBlock);
    console.log(fetchBlock.attributes.size.width);
    fetchBlock.on('change:position', function() {
        console.log('FetchBlock position: ' + fetchBlock.position());
    });

    // decode block
    var decodeBlock = fetchBlock.clone();
    decodeBlock.translate(fetchBlock.attributes.size.width + 20, 0);
    decodeBlock.attr('label/text', 'Decode\nUnit');
    decodeBlock.attr('body/fill', '#77b1bd');
    decodeBlock.addTo(graph);
    decodeBlock.on('change:position', function() {
        console.log('DecodeBlock position: ' + decodeBlock.position());
    });
    // regfile
    //regfileBlock.translate(decodeBlock.attributes.size.width - 10, 0);
    var regTemplate = getRegfileTemplate(
        decodeBlock.position().x + (decodeBlock.attributes.size.width - 10), 
        decodeBlock.position().y);
    regTemplate.regfile.attr('label/text', 'Reg\nFile');
    regTemplate.regfile.addTo(graph);
    regTemplate.clockSymbol.addTo(graph);
    
    // instruction memory
    var insMemoryBlock = fetchBlock.clone();
    insMemoryBlock.translate(-14, fetchBlock.attributes.size.height + 35);
    insMemoryBlock.attr('label/text', 'Instruction\nMemory\n16kB');
    insMemoryBlock.resize(100, 60);
    insMemoryBlock.attr('body/fill', '#993131');
    insMemoryBlock.addTo(graph);
    insMemoryBlock.on('change:position', function() {
        console.log('InsMemoryBlock position: ' + insMemoryBlock.position());
    });
    // execute block
    var executeBlock = regTemplate.regfile.clone();
    executeBlock.resize(fetchBlock.attributes.size.width, fetchBlock.attributes.size.height);
    executeBlock.translate(regTemplate.regfile.attributes.size.width + 20, 0);
    executeBlock.attr('label/text', 'Execute\nUnit');
    executeBlock.attr('label/fill', 'white');
    executeBlock.attr('body/fill', '#597cab');
    executeBlock.addTo(graph);
    executeBlock.on('change:position', function() {
        console.log('ExectuteBlock position: ' + executeBlock.position());
    });
    // memory unit
    var memoryUnitBlock = executeBlock.clone();
    memoryUnitBlock.translate(executeBlock.attributes.size.width + 20, 0);
    memoryUnitBlock.attr('label/text', 'Memory\nUnit');
    memoryUnitBlock.attr('body/fill', '#5762ab');
    memoryUnitBlock.addTo(graph);
    memoryUnitBlock.on('change:position', function() {
        console.log('MemoryUnitBlock position: ' + memoryUnitBlock.position());
    });
    // data memory
    var dataMemoryBlock = memoryUnitBlock.clone();
    dataMemoryBlock.translate(-14, memoryUnitBlock.attributes.size.height + 35);
    dataMemoryBlock.attr('label/text', 'Data\nMemory\n16kB');
    dataMemoryBlock.attr('body/fill', '#993131');
    dataMemoryBlock.resize(100, 60);
    dataMemoryBlock.addTo(graph);
    dataMemoryBlock.on('change:position', function() {
        console.log('DataMemoryBlock position: ' + dataMemoryBlock.position());
    });
    // write back
    var writeBackBlock = memoryUnitBlock.clone();
    writeBackBlock.translate(memoryUnitBlock.attributes.size.width + 20, 0);
    writeBackBlock.attr('label/text', 'Writeback\nUnit');
    writeBackBlock.attr('body/fill', '#4f4d85');
    writeBackBlock.addTo(graph);
    writeBackBlock.on('change:position', function() {
        console.log('WriteBackBlock position: ' + writeBackBlock.position());
    });
    // control unit
    var controlUnitBlock = decodeBlock.clone();
    controlUnitBlock.resize(80, 35);
    controlUnitBlock.translate(-4, -decodeBlock.attributes.size.height + 10);
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
            strokeWidth: 3,
            stroke: fetchBlock.attr('body/fill'),
            targetMarker: {
                type: 'path',
                fill: fetchBlock.attr('body/fill')
            }
        }
    });
    fetchToDecodeLink.addTo(graph);
    
    var regfileToExecuteLink = fetchToDecodeLink.clone();
    regfileToExecuteLink.source(regTemplate.regfile);
    regfileToExecuteLink.target(executeBlock);
    regfileToExecuteLink.attr('line/stroke', decodeBlock.attr('body/fill'));
    regfileToExecuteLink.attr('line/targetMarker/fill', decodeBlock.attr('body/fill'));
    regfileToExecuteLink.toBack();
    regfileToExecuteLink.addTo(graph);
    
    var executeToMemoryLink = regfileToExecuteLink.clone();
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
    
    var writeBackToDecodeLink = memoryToWriteBackLink.clone();
    writeBackToDecodeLink.source(writeBackBlock);
    writeBackToDecodeLink.target(decodeBlock);
    writeBackToDecodeLink.router('manhattan');
    writeBackToDecodeLink.connector('rounded');
    writeBackToDecodeLink.attr('line/stroke', writeBackBlock.attr('body/fill'));
    writeBackToDecodeLink.attr('line/targetMarker/fill', writeBackBlock.attr('body/fill'));
    writeBackToDecodeLink.addTo(graph);
    
    // control unit links
    var controlToFetchLink = fetchToDecodeLink.clone();
    controlToFetchLink.source(controlUnitBlock);
    controlToFetchLink.target(fetchBlock);
    controlToFetchLink.router('manhattan');
    controlToFetchLink.connector('rounded');
    controlToFetchLink.addTo(graph);
    var controlToDecodeLink = fetchToDecodeLink.clone();
    controlToDecodeLink.source(controlUnitBlock);
    controlToDecodeLink.target(decodeBlock);
    controlToDecodeLink.attr({
        line: {
            strokeWidth: 3,
            stroke: controlUnitBlock.attr('body/fill'),
            sourceMarker: {
                type: 'path',
                fill: controlUnitBlock.attr('body/fill'),
                d: controlToDecodeLink.attr('line/targetMarker/d')
            }
        }
    });
    console.log(controlToDecodeLink);
    controlToDecodeLink.addTo(graph);
    var controlToExectuteLink = controlToFetchLink.clone();
    controlToExectuteLink.target(executeBlock);
    controlToExectuteLink.addTo(graph);
    var controlToMemoryLink = controlToExectuteLink.clone();
    controlToMemoryLink.target(memoryUnitBlock);
    controlToMemoryLink.addTo(graph);
    var controlToWriteBack = controlToMemoryLink.clone();
    controlToWriteBack.target(writeBackBlock);
    controlToWriteBack.addTo(graph);
    // memory links
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
    
    // decode to regfile link
    var decodeHalfX = decodeBlock.position().x + (decodeBlock.attributes.size.width / 2);
    var decodeYOff = decodeBlock.position().y + decodeBlock.attributes.size.height;
    
    
    // decode to regfile link
    // TODO: draw arrow from decode to regfile
    
   //var graphScale = 1;
    //paper.scale(0.5, 0.5);
}

window.onload = function () {
    // initialize diagram
    initSingleCycleDiagram();
    $('#block_diagram').focus();
    document.getElementById('block_diagram').onkeydown = function(e) {
        console.log(e.code);
    };
    // set handlers
    //document.getElementById('generate-button').onclick = saveProject;
    ///document.getElementById('project_name').onchange = gui.cleanProjectName;
    // initialize gui
    //gui.init();
};