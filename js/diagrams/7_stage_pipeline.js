blockDiagramUtils = require('../block_diagram.js');

function init7StageBypassedPiplineDiagram(canvas) {
    canvas.graph.clear();
    canvas.graphScale.x = 0.6;
    canvas.graphScale.y = 0.6;
    canvas.paper.scale(canvas.graphScale.x, canvas.graphScale.y);
    var fetchBlock = new joint.shapes.standard.Rectangle();
    fetchBlock.position(16, 120);
    fetchBlock.resize(150, 100);
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
    fetchBlock.addTo(canvas.graph);
    console.log(fetchBlock);
    console.log(fetchBlock.attributes.size.width);
    fetchBlock.on('change:position', function() {
        console.log('FetchBlock position: ' + fetchBlock.position());
    });
    // fetch block Regfile
    var fetchRegFileBlockTemplate = blockDiagramUtils.getRegfileTemplate(
        fetchBlock.position().x + (fetchBlock.attributes.size.width - 20), 
        fetchBlock.position().y, 25, fetchBlock.attributes.size.height);
    fetchRegFileBlockTemplate.regfile.attr('label/text', '');
    fetchRegFileBlockTemplate.regfile.addTo(canvas.graph);
    fetchRegFileBlockTemplate.clockSymbol.addTo(canvas.graph);
    // decode block
    var decodeBlock = fetchBlock.clone();
    decodeBlock.resize(80, 100);
    decodeBlock.translate(fetchBlock.attributes.size.width + 28, 0);
    decodeBlock.attr('label/text', 'Decode\nUnit');
    decodeBlock.attr('body/fill', '#77b1bd');
    decodeBlock.addTo(canvas.graph);
    decodeBlock.on('change:position', function() {
        console.log('DecodeBlock position: ' + decodeBlock.position());
    });
    // decode regfile
    var decodeRegFileBlockTemplate = blockDiagramUtils.getRegfileTemplate(
        decodeBlock.position().x + (decodeBlock.attributes.size.width - 14), 
        decodeBlock.position().y, 35, fetchBlock.attributes.size.height);
    decodeRegFileBlockTemplate.regfile.attr('label/text', 'Reg\nFile');
    decodeRegFileBlockTemplate.regfile.addTo(canvas.graph);
    decodeRegFileBlockTemplate.clockSymbol.addTo(canvas.graph);
    
    // instruction memory
    var insMemoryBlock = fetchBlock.clone();
    insMemoryBlock.translate(26, fetchBlock.attributes.size.height + 100);
    insMemoryBlock.attr('label/text', 'Instruction\nMemory\n16kB');
    insMemoryBlock.resize(100, 60);
    insMemoryBlock.attr('body/fill', '#993131');
    insMemoryBlock.addTo(canvas.graph);
    insMemoryBlock.on('change:position', function() {
        console.log('InsMemoryBlock position: ' + insMemoryBlock.position());
    });
    // execute block
    var executeBlock = decodeRegFileBlockTemplate.regfile.clone();
    executeBlock.resize(decodeBlock.attributes.size.width, decodeBlock.attributes.size.height);
    executeBlock.translate(decodeRegFileBlockTemplate.regfile.attributes.size.width + 20, 0);
    executeBlock.attr('label/text', 'Execute\nUnit');
    executeBlock.attr('label/fill', 'white');
    executeBlock.attr('body/fill', '#597cab');
    executeBlock.addTo(canvas.graph);
    executeBlock.on('change:position', function() {
        console.log('ExectuteBlock position: ' + executeBlock.position());
    });
    // execute block Regfile
    var executeRegFileBlockTemplate = blockDiagramUtils.getRegfileTemplate(
        executeBlock.position().x + (executeBlock.attributes.size.width - 14), 
        executeBlock.position().y, 25, fetchBlock.attributes.size.height);
    executeRegFileBlockTemplate.regfile.attr('label/text', '');
    executeRegFileBlockTemplate.regfile.addTo(canvas.graph);
    executeRegFileBlockTemplate.clockSymbol.addTo(canvas.graph);
    // memory unit
    var memoryUnitBlock = executeBlock.clone();
    memoryUnitBlock.resize(150, 100);
    memoryUnitBlock.translate(executeBlock.attributes.size.width + 55, 0);
    memoryUnitBlock.attr('label/text', 'Memory\nUnit');
    memoryUnitBlock.attr('body/fill', '#5762ab');
    memoryUnitBlock.addTo(canvas.graph);
    memoryUnitBlock.on('change:position', function() {
        console.log('MemoryUnitBlock position: ' + memoryUnitBlock.position());
    });
    // memory unit block Regfile
    var memoryRegFileBlockTemplate = blockDiagramUtils.getRegfileTemplate(
        memoryUnitBlock.position().x + (memoryUnitBlock.attributes.size.width - 13), 
        memoryUnitBlock.position().y, 25, fetchBlock.attributes.size.height);
    memoryRegFileBlockTemplate.regfile.attr('label/text', '');
    memoryRegFileBlockTemplate.regfile.addTo(canvas.graph);
    memoryRegFileBlockTemplate.clockSymbol.addTo(canvas.graph);
    // data memory
    var dataMemoryBlock = memoryUnitBlock.clone();
    dataMemoryBlock.translate(26, memoryUnitBlock.attributes.size.height + 100);
    dataMemoryBlock.attr('label/text', 'Data\nMemory\n16kB');
    dataMemoryBlock.attr('body/fill', '#993131');
    dataMemoryBlock.resize(100, 60);
    dataMemoryBlock.addTo(canvas.graph);
    dataMemoryBlock.on('change:position', function() {
        console.log('DataMemoryBlock position: ' + dataMemoryBlock.position());
    });
    // write back
    var writeBackBlock = memoryUnitBlock.clone();
    writeBackBlock.resize(80, 100);
    writeBackBlock.translate(memoryUnitBlock.attributes.size.width + 35, 0);
    writeBackBlock.attr('label/text', 'Writeback\nUnit');
    writeBackBlock.attr('body/fill', '#4f4d85');
    writeBackBlock.addTo(canvas.graph);
    writeBackBlock.on('change:position', function() {
        console.log('WriteBackBlock position: ' + writeBackBlock.position());
    });
    // write back unit block Regfile
    var writeBackRegFileBlockTemplate = blockDiagramUtils.getRegfileTemplate(
        writeBackBlock.position().x + (writeBackBlock.attributes.size.width - 8), 
        writeBackBlock.position().y, 25, fetchBlock.attributes.size.height);
    writeBackRegFileBlockTemplate.regfile.attr('label/text', '');
    writeBackRegFileBlockTemplate.regfile.addTo(canvas.graph);
    writeBackRegFileBlockTemplate.clockSymbol.addTo(canvas.graph);
    // control unit
    var controlUnitBlock = new joint.shapes.standard.Circle();
    controlUnitBlock.resize(70, 70);
    controlUnitBlock.position(decodeBlock.position().x + 2, 
                              decodeBlock.position().y - decodeBlock.attributes.size.height - 20);
    controlUnitBlock.attr('label/text', 'Control\nUnit');
    controlUnitBlock.attr('body/fill', '#77b1bd');
    controlUnitBlock.attr('label/fill', 'white');
    controlUnitBlock.addTo(canvas.graph);
    controlUnitBlock.on('change:position', function() {
        console.log('ControlUnitBlock position: ' + controlUnitBlock.position());
    });
     // control unit Regfile
    var controlRegFileBlockTemplate = blockDiagramUtils.getRegfileTemplate(
        decodeRegFileBlockTemplate.regfile.position().x + 20, 
        controlUnitBlock.position().y + 23, 25, 35);
    controlRegFileBlockTemplate.regfile.attr('label/text', '');
    controlRegFileBlockTemplate.regfile.addTo(canvas.graph);
    controlRegFileBlockTemplate.clockSymbol.addTo(canvas.graph);
    // Linking
    var fetchToDecodeLink = new joint.shapes.standard.Link();
    fetchToDecodeLink.source(fetchRegFileBlockTemplate.regfile);
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
    fetchToDecodeLink.addTo(canvas.graph);
    
    // stall registers?
    //exec to memory
    var execToMemRegFileBlockTemplate = blockDiagramUtils.getRegfileTemplate(
        executeRegFileBlockTemplate.regfile.position().x, 
        controlUnitBlock.position().y + 23, 25, 
        controlRegFileBlockTemplate.regfile.attributes.size.height);
    execToMemRegFileBlockTemplate.regfile.attr('label/text', '');
    execToMemRegFileBlockTemplate.regfile.addTo(canvas.graph);
    execToMemRegFileBlockTemplate.clockSymbol.addTo(canvas.graph);
    // memory to exec register
    var memStage2ndPipelineRegfileTemplate = blockDiagramUtils.getRegfileTemplate(
        memoryRegFileBlockTemplate.regfile.position().x, 
        controlUnitBlock.position().y + 23, 25, 
        controlRegFileBlockTemplate.regfile.attributes.size.height);
    memStage2ndPipelineRegfileTemplate.regfile.attr('label/text', '');
    memStage2ndPipelineRegfileTemplate.regfile.addTo(canvas.graph);
    memStage2ndPipelineRegfileTemplate.clockSymbol.addTo(canvas.graph);
    
    var memStage1stPipelineRegfileTemplate = blockDiagramUtils.getRegfileTemplate(
        memoryRegFileBlockTemplate.regfile.position().x - 60, 
        controlUnitBlock.position().y + 23, 25, 
        controlRegFileBlockTemplate.regfile.attributes.size.height);
    memStage1stPipelineRegfileTemplate.regfile.attr('label/text', '');
    memStage1stPipelineRegfileTemplate.regfile.addTo(canvas.graph);
    memStage1stPipelineRegfileTemplate.clockSymbol.addTo(canvas.graph);
    
    var regfileToExecuteLink = fetchToDecodeLink.clone();
    regfileToExecuteLink.source(decodeRegFileBlockTemplate.regfile);
    regfileToExecuteLink.target(executeBlock);
    regfileToExecuteLink.attr('line/stroke', decodeBlock.attr('body/fill'));
    regfileToExecuteLink.attr('line/targetMarker/fill', decodeBlock.attr('body/fill'));
    regfileToExecuteLink.toBack();
    regfileToExecuteLink.addTo(canvas.graph);
    
    var executeToMemoryLink = regfileToExecuteLink.clone();
    executeToMemoryLink.source(executeRegFileBlockTemplate.regfile);
    executeToMemoryLink.target(memoryUnitBlock);
    executeToMemoryLink.attr('line/stroke', executeBlock.attr('body/fill'));
    executeToMemoryLink.attr('line/targetMarker/fill', executeBlock.attr('body/fill'));
    executeToMemoryLink.addTo(canvas.graph);
    
    var memoryToWriteBackLink = executeToMemoryLink.clone();
    memoryToWriteBackLink.source(memoryRegFileBlockTemplate.regfile);
    memoryToWriteBackLink.target(writeBackBlock);
    memoryToWriteBackLink.attr('line/stroke', memoryUnitBlock.attr('body/fill'));
    memoryToWriteBackLink.attr('line/targetMarker/fill', memoryUnitBlock.attr('body/fill'));
    memoryToWriteBackLink.addTo(canvas.graph);
    
    var writeBackToDecodeLink = memoryToWriteBackLink.clone();
    writeBackToDecodeLink.source(writeBackRegFileBlockTemplate.regfile);
    writeBackToDecodeLink.target(decodeBlock);
    writeBackToDecodeLink.router('manhattan', {
        startDirections: ['right'],
        endDirections: ['bottom'],
        padding: {
            vertical: 15,
            horizontal: 20
        }
    });
    writeBackToDecodeLink.connector('rounded', {
        radius: 5
    });
    writeBackToDecodeLink.attr('line/stroke', writeBackBlock.attr('body/fill'));
    writeBackToDecodeLink.attr('line/targetMarker/fill', writeBackBlock.attr('body/fill'));
    writeBackToDecodeLink.addTo(canvas.graph);
    
    var controlToDecodeLink = fetchToDecodeLink.clone();
    controlToDecodeLink.source(controlUnitBlock);
    controlToDecodeLink.target(decodeBlock, {
        anchor: {
            name: 'center',
            args: {
                dx: -2
            }
        }
    });
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
    controlToDecodeLink.addTo(canvas.graph);
    
    var controlToUpperDecodePipelineRegLink = fetchToDecodeLink.clone();
    controlToUpperDecodePipelineRegLink.source(controlUnitBlock);
    controlToUpperDecodePipelineRegLink.target(controlRegFileBlockTemplate.regfile);
    controlToUpperDecodePipelineRegLink.addTo(canvas.graph);
    
    var controlToExectuteLink = fetchToDecodeLink.clone();
    controlToExectuteLink.source(controlRegFileBlockTemplate.regfile);
    controlToExectuteLink.target(executeBlock);
    controlToExectuteLink.router('manhattan', {
        startDirections: ['right']
    });
    controlToExectuteLink.connector('rounded', {
        radius: 5
    });
    controlToExectuteLink.addTo(canvas.graph);
    
    var controlToExecStallLink = controlToExectuteLink.clone();
    controlToExecStallLink.target(execToMemRegFileBlockTemplate.regfile);
    controlToExecStallLink.addTo(canvas.graph);
    
    var executeToFetchBypassLink = executeToMemoryLink.clone();
    executeToFetchBypassLink.source(executeRegFileBlockTemplate.regfile);
    executeToFetchBypassLink.target(fetchBlock, {
        anchor: {
            name: 'center',
            args: {
                dx: -40
            }
        }
    });
    executeToFetchBypassLink.router('manhattan', {
        startDirections: ['right'],
        endDirections: ['bottom'],
        padding: {
            vertical: 25,
            left: 12
        }
    });
    executeToFetchBypassLink.connector('rounded', {
        radius: 5
    });
    executeToFetchBypassLink.addTo(canvas.graph);
    
    var execPipelineToMemLink = controlToExectuteLink.clone();
    execPipelineToMemLink.source(execToMemRegFileBlockTemplate.regfile);
    execPipelineToMemLink.target(memoryUnitBlock, {
        anchor: {
            name: 'center',
            args: {
                dx: -40
            }
        }
    });
    execPipelineToMemLink.attr('line/stroke', memoryUnitBlock.attr('body/fill'));
    execPipelineToMemLink.attr('line/targetMarker/fill', memoryUnitBlock.attr('body/fill'));
    execPipelineToMemLink.router('manhattan', {
        startDirections: ['right'],
        endDirections: ['top'] 
    });
    execPipelineToMemLink.addTo(canvas.graph);
    
    var execPipelineToFetchLink = execPipelineToMemLink.clone();
    execPipelineToFetchLink.target(fetchBlock);
    execPipelineToFetchLink.router('manhattan', {
        startDirections: ['right'],
        padding: 12
    });
    execPipelineToFetchLink.addTo(canvas.graph);
    
    var execPipelineTo1stMemPipelineLink = execPipelineToFetchLink.clone();
    execPipelineTo1stMemPipelineLink.source(execToMemRegFileBlockTemplate.regfile);
    execPipelineTo1stMemPipelineLink.target(memStage1stPipelineRegfileTemplate.regfile);
    execPipelineTo1stMemPipelineLink.addTo(canvas.graph);
    
    var memPipeline1stRegToMemPipeline2ndRegLink = execPipelineToFetchLink.clone();
    memPipeline1stRegToMemPipeline2ndRegLink.source(memStage1stPipelineRegfileTemplate.regfile);
    memPipeline1stRegToMemPipeline2ndRegLink.target(memStage2ndPipelineRegfileTemplate.regfile);
    memPipeline1stRegToMemPipeline2ndRegLink.addTo(canvas.graph);
    
    var memPipeline2ndRegToWriteBackLink = execPipelineTo1stMemPipelineLink.clone();
    memPipeline2ndRegToWriteBackLink.source(memStage2ndPipelineRegfileTemplate.regfile);
    memPipeline2ndRegToWriteBackLink.target(writeBackBlock);
    memPipeline2ndRegToWriteBackLink.router('manhattan', {
        startDirections: ['right']
    });
    memPipeline2ndRegToWriteBackLink.attr('line/stroke', writeBackBlock.attr('body/fill'));
    memPipeline2ndRegToWriteBackLink.attr('line/targetMarker/fill', writeBackBlock.attr('body/fill'));
    memPipeline2ndRegToWriteBackLink.addTo(canvas.graph);
    
    var memoryUnitToDataMemoryLink = fetchToDecodeLink.clone();
    memoryUnitToDataMemoryLink.source(memoryUnitBlock, {
        anchor: {
            name: 'center',
            args: {
                dx: -20
            }
        }
    });
    memoryUnitToDataMemoryLink.target(dataMemoryBlock);
    memoryUnitToDataMemoryLink.attr('line/stroke', memoryUnitBlock.attr('body/fill'));
    memoryUnitToDataMemoryLink.attr('line/targetMarker/fill', memoryUnitBlock.attr('body/fill'));
    memoryUnitToDataMemoryLink.attr('line/sourceMarker/fill', memoryUnitBlock.attr('body/fill'));
    memoryUnitToDataMemoryLink.connector('rounded', {
        radius: 10
    })
    memoryUnitToDataMemoryLink.router('manhattan', {
        startDirections: ['bottom'],
        endDirections: ['left']
    });
    memoryUnitToDataMemoryLink.addTo(canvas.graph);
    
    var dataMemoryToMemoryUnitLink = fetchToDecodeLink.clone();
    dataMemoryToMemoryUnitLink.source(dataMemoryBlock);
    dataMemoryToMemoryUnitLink.target(memoryUnitBlock, {
        anchor: {
            name: 'center',
            args: {
                dx: 30
            }
        }
    });
    dataMemoryToMemoryUnitLink.attr('line/stroke', memoryUnitBlock.attr('body/fill'));
    dataMemoryToMemoryUnitLink.attr('line/targetMarker/fill', memoryUnitBlock.attr('body/fill'));
    dataMemoryToMemoryUnitLink.attr('line/sourceMarker/fill', memoryUnitBlock.attr('body/fill'));
    dataMemoryToMemoryUnitLink.vertices([
        new g.Point(555, 286) 
    ]);
    dataMemoryToMemoryUnitLink.connector('rounded', {
        radius: 10
    });
    dataMemoryToMemoryUnitLink.router('manhattan', {
        startDirections: ['right'],
        endDirections: ['bottom']
    });
    dataMemoryToMemoryUnitLink.addTo(canvas.graph);
    
    var fetchToInsMemoryLink = dataMemoryToMemoryUnitLink.clone();
    fetchToInsMemoryLink.vertices([]);
    fetchToInsMemoryLink.source(fetchBlock, {
        anchor: {
            name: 'center',
            args: {
                dx: -20
            }
        }
    });
    fetchToInsMemoryLink.target(insMemoryBlock);
    fetchToInsMemoryLink.attr('line/stroke', fetchBlock.attr('body/fill'));
    fetchToInsMemoryLink.attr('line/targetMarker/fill', fetchBlock.attr('body/fill'));
    fetchToInsMemoryLink.attr('line/sourceMarker/fill', fetchBlock.attr('body/fill'));
    fetchToInsMemoryLink.connector('rounded', {
        radius: 10
    })
    fetchToInsMemoryLink.router('manhattan', {
        startDirections: ['bottom'],
        endDirections: ['left']
    });
    fetchToInsMemoryLink.addTo(canvas.graph);
    
    var insMemoryToFetchLink = fetchToInsMemoryLink.clone();
    insMemoryToFetchLink.source(insMemoryBlock);
    insMemoryToFetchLink.target(fetchBlock, {
        anchor: {
            name: 'center',
            args: {
                dx: 30
            }
        }
    });
    insMemoryToFetchLink.attr('line/stroke', fetchBlock.attr('body/fill'));
    insMemoryToFetchLink.attr('line/targetMarker/fill', fetchBlock.attr('body/fill'));
    insMemoryToFetchLink.attr('line/sourceMarker/fill', fetchBlock.attr('body/fill'));
    insMemoryToFetchLink.vertices([
       new g.Point(121, 286) 
    ]);
    insMemoryToFetchLink.router('manhattan', {
        startDirections: ['right'],
        endDirections: ['bottom']
    });
    insMemoryToFetchLink.addTo(canvas.graph);
    
    // left justifying text for blocks
    fetchBlock.attr('text/ref-x', -48);
    memoryUnitBlock.attr('text/ref-x', -46);
    
}

exports.show = init7StageBypassedPiplineDiagram;