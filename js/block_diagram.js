diagram7Stage = require('./diagrams/7_stage_pipeline.js');
diagram5Stage = require('./diagrams/5_stage_pipeline.js');
diagramSingleCycle = require('./diagrams/single_cycle.js');

var paper = undefined;
var graph = undefined;
var graphScale = {
    x: 1,
    y: 1
};

var canvas = {
    paper: undefined,
    graph: undefined
};

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.0;

function initCanvas() {
    graph = new joint.dia.Graph;
    
    paper = new joint.dia.Paper({
        el: document.getElementById('diagram-div'),
        model: graph,
        width: 500,
        height: 400,
        gridSize: 1
    });
    
    paper.on('blank:pointerdown', function(evt, x, y) {
        console.log(`Mouse click on blank area (${x}, ${y})"`);
    });
    paper.on('cell:pointerdown', function(cellView, evt, x, y) {
        console.log(`Mouse click on (${x}, ${y}): detected element \"${getBlockName(cellView)}\"`);
    });
    paper.on('cell:pointerdblclick', function(cellView, evt, x, y) {
        console.log(`Double click on (${x}, ${y}): detected element \"${getBlockName(cellView)}\"`);
    });
    
    $('#diagram-div')
    .attr('tabindex', 0)
    .on('mouseover', function() {
        this.focus();
    })
    .on('keydown', function(e) {
        console.log(`Keypress ${e.which} detected on canvas`);
        if (e.which === 189 && graphScale.x > MIN_SCALE) {
            graphScale.x -= 0.1;
            graphScale.y -= 0.1;
            paper.scale(graphScale.x, graphScale.y);
        } else if (e.which === 187 && graphScale.x < MAX_SCALE) {
            graphScale.x += 0.1;
            graphScale.y += 0.1;
            paper.scale(graphScale.x, graphScale.y);
        }
    });
    
    canvas.paper = paper;
    canvas.graph = graph;
    canvas.graphScale = graphScale;
}

function getBlockName(cellView) {
    if (cellView !==  undefined) {
         return cellView.model.prop('attrs/label/text').replace(/\n/g, ' ');
    } 
}

function getRegfileTemplate(x, y, width, height) {
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
    regfileBlock.resize(width, height);
    regfileBlock.attr('body/fill', '#bababa');
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

function show5StagePipelineDiagram() {
    diagram5Stage.show(canvas);
}

function show7StagePipelineDiagram() {
    diagram7Stage.show(canvas);
}

function showSingleCycleDiagram() {
    diagramSingleCycle.show(canvas);
}

exports.initCanvas = initCanvas;
exports.getRegfileTemplate = getRegfileTemplate;
exports.showSingleCycleDiagram = showSingleCycleDiagram;
exports.show5StagePipelineDiagram = show5StagePipelineDiagram
exports.show7StagePipelineDiagram = show7StagePipelineDiagram;