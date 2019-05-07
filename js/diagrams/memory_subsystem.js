blockDiagramUtils = require('../block_diagram.js');

var graphObjsL1 = [];
var graphObjsL2 = [];

var memMapL1 = {};
var memMapL2 = {};

class MemoryBlock {
    constructor(baseString, sizeStr, graphObj) {
        this.baseString = baseString;
        this.sizeStr = sizeStr;
        this.graphObj = graphObj;
    }
    
    updateTitle(sizeStr) {
        this.sizeStr = sizeStr;
        this.graphObj.attr('label/text', `${this.baseString}\n${this.sizeStr}`)
    }
}

function initMemorySubsystemL2Diagram(canvas) {
    var procInterfaceBlock = new joint.shapes.standard.Rectangle();
    procInterfaceBlock.attr({
        body: {
            fill: '#006666'
        },
        label: {
            fill: 'white',
            text: 'Processor Interface'
        }
    });
    procInterfaceBlock.resize(240, 30);
    procInterfaceBlock.position(80, 60);
    graphObjsL2.push(procInterfaceBlock);
    
    var l1InsCacheBlock = procInterfaceBlock.clone();
    l1InsCacheBlock.attr({
        body: {
            rx: 7.5,
            ry: 7.5,
            fill: '#76608A'
        },
        label: {
            fill: 'white',
            text: 'L1 Instruction\nCache\n16kB'
        }
    });
    l1InsCacheBlock.resize(90, 50);
    l1InsCacheBlock.translate(20, 70);
    graphObjsL2.push(l1InsCacheBlock);
    
    var l1DataCacheBlock = l1InsCacheBlock.clone();
    l1DataCacheBlock.attr('label/text', 'L1 Data\nCache\n16kB');
    l1DataCacheBlock.translate(120, 0);
    graphObjsL2.push(l1DataCacheBlock);
    
    memMapL2['l1'] = [
        new MemoryBlock('L1 Instruction\nCache', '16kB', l1InsCacheBlock),
        new MemoryBlock('L1 Data\nCache', '16kB', l1DataCacheBlock)
    ];
    
    var l2CombinedCacheBlock = l1InsCacheBlock.clone();
    l2CombinedCacheBlock.attr('label/text', 'L2 Combined Cache\n16kB');
    l2CombinedCacheBlock.attr('body/fill', '#6D8764');
    l2CombinedCacheBlock.attr('label/fill', 'white');
    l2CombinedCacheBlock.resize(240, 40);
    l2CombinedCacheBlock.translate(-20, 90);
    graphObjsL2.push(l2CombinedCacheBlock);
    
    memMapL2['l2'] = [
        new MemoryBlock('L2 Combined Cache', '16kB', l2CombinedCacheBlock)
    ];
    var mainMemoryInterfaceBlock = l2CombinedCacheBlock.clone();
    mainMemoryInterfaceBlock.attr({
        body: {
            rx: 0,
            ry: 0,
            fill: '#006666'
        },
        label: {
            fill: 'white',
            text: 'Main Memory Interface'
        }
    });
    mainMemoryInterfaceBlock.resize(320, 30);
    mainMemoryInterfaceBlock.translate(-40, 70);
    graphObjsL2.push(mainMemoryInterfaceBlock);
    
    var mainMemoryBlock = mainMemoryInterfaceBlock.clone();
    mainMemoryBlock.attr({
        body: {
            rx: 7.5,
            ry: 7.5,
            fill: '#647687'
        },
        label: {
            fill: 'white',
            text: 'Main Memory\n32kB'
        }
    });
    mainMemoryBlock.translate(0, 70);
    mainMemoryBlock.resize(320, 60);
    memMapL2['main'] = [
        new MemoryBlock('Main Memory', '32kB', mainMemoryBlock)
    ];
    graphObjsL2.push(mainMemoryBlock);
    
    // adding links
    // anchor calculations
    var procInterfaceCenter = procInterfaceBlock.position().x + (procInterfaceBlock.attributes.size.width / 2);
    var l1InsCacheCenter = l1InsCacheBlock.position().x + (l1InsCacheBlock.attributes.size.width / 2);
    var l1DataCacheCenter = l1DataCacheBlock.position().x + (l1DataCacheBlock.attributes.size.width / 2);
    var l2CacheCenter = l2CombinedCacheBlock.position().x + (l2CombinedCacheBlock.attributes.size.width / 2);
    var procInterfaceToL1InsCacheDx = procInterfaceCenter - l1InsCacheCenter;
    var procInterfaceToL1DataCacheDx = l1DataCacheCenter - procInterfaceCenter;
    var l1InsCacheToL2CacheDx = l2CacheCenter - l1InsCacheCenter;
    var l1DataCacheToL2CacheDx = l1DataCacheCenter - l2CacheCenter;
    var procInterfaceToL1InsCacheLink = new joint.shapes.standard.Link();
    procInterfaceToL1InsCacheLink.target(l1InsCacheBlock);
    procInterfaceToL1InsCacheLink.attr({
        line: {
            stroke: procInterfaceBlock.attr('body/fill'),
            strokeWidth: 2,
            sourceMarker: {
                type: 'path',
                fill: procInterfaceBlock.attr('body/fill'),
                d: procInterfaceToL1InsCacheLink.attr('line/targetMarker/d')
            }
        }
    });
    procInterfaceToL1InsCacheLink.source(procInterfaceBlock, {
        anchor: {
            name: 'center',
            args: {
                dx: -procInterfaceToL1InsCacheDx
            }
        }
    });
    graphObjsL2.push(procInterfaceToL1InsCacheLink);
    
    var procInterfaceToL1DataCache = procInterfaceToL1InsCacheLink.clone();
    procInterfaceToL1DataCache.source(procInterfaceBlock, {
        anchor: {
            name: 'center',
            args: {
                dx: procInterfaceToL1DataCacheDx
            }
        }
    });
    procInterfaceToL1DataCache.target(l1DataCacheBlock);
    graphObjsL2.push(procInterfaceToL1DataCache);
    
    var l1InsCacheToL2CombinedCacheLink = procInterfaceToL1InsCacheLink.clone();
    l1InsCacheToL2CombinedCacheLink.attr('line/stroke', l1InsCacheBlock.attr('body/fill'));
    l1InsCacheToL2CombinedCacheLink.attr('line/sourceMarker/fill', l1InsCacheBlock.attr('body/fill'));
    l1InsCacheToL2CombinedCacheLink.source(l1InsCacheBlock);
    l1InsCacheToL2CombinedCacheLink.target(l2CombinedCacheBlock, {
        anchor: {
            name: 'center',
            args: {
                dx: -l1InsCacheToL2CacheDx
            }
        }
    });
    graphObjsL2.push(l1InsCacheToL2CombinedCacheLink);
    
    var l1DataCacheToL2CombinedCacheLink = l1InsCacheToL2CombinedCacheLink.clone();
    l1DataCacheToL2CombinedCacheLink.source(l1DataCacheBlock);
    l1DataCacheToL2CombinedCacheLink.target(l2CombinedCacheBlock, {
        anchor: {
            name: 'center',
            args: {
                dx: l1DataCacheToL2CacheDx
            }
        }
    });
    graphObjsL2.push(l1DataCacheToL2CombinedCacheLink);
    
    var l2CombinedCacheBlockToMainMemInterfaceLink = l1InsCacheToL2CombinedCacheLink.clone();
    l2CombinedCacheBlockToMainMemInterfaceLink.attr('line/stroke', l2CombinedCacheBlock.attr('body/fill'));
    l2CombinedCacheBlockToMainMemInterfaceLink.attr('line/sourceMarker/fill', l2CombinedCacheBlock.attr('body/fill'));
    l2CombinedCacheBlockToMainMemInterfaceLink.source(l2CombinedCacheBlock);
    l2CombinedCacheBlockToMainMemInterfaceLink.target(mainMemoryInterfaceBlock);
    graphObjsL2.push(l2CombinedCacheBlockToMainMemInterfaceLink);
    
    var mainMemInterfactToMainMemoryLink = l2CombinedCacheBlockToMainMemInterfaceLink.clone();
    mainMemInterfactToMainMemoryLink.attr('line/stroke', mainMemoryInterfaceBlock.attr('body/fill'));
    mainMemInterfactToMainMemoryLink.attr('line/sourceMarker/fill', mainMemoryInterfaceBlock.attr('body/fill'));
    mainMemInterfactToMainMemoryLink.source(mainMemoryInterfaceBlock);
    mainMemInterfactToMainMemoryLink.target(mainMemoryBlock);
    graphObjsL2.push(mainMemInterfactToMainMemoryLink);
}

function initMemorySubsystemL1Diagram(canvas) {
    var procInterfaceBlock = new joint.shapes.standard.Rectangle();
    procInterfaceBlock.attr({
        body: {
            fill: '#006666'
        },
        label: {
            fill: 'white',
            text: 'Processor Interface'
        }
    });
    procInterfaceBlock.resize(240, 30);
    procInterfaceBlock.position(80, 60);
    graphObjsL1.push(procInterfaceBlock);
    
    var l1InsCacheBlock = procInterfaceBlock.clone();
    l1InsCacheBlock.attr({
        body: {
            rx: 7.5,
            ry: 7.5,
            fill: '#76608A'
        },
        label: {
            fill: 'white',
            text: 'L1 Instruction\nCache\n16kB'
        }
    });
    l1InsCacheBlock.resize(90, 50);
    l1InsCacheBlock.translate(20, 70);
    graphObjsL1.push(l1InsCacheBlock);
    
    var l1DataCacheBlock = l1InsCacheBlock.clone();
    l1DataCacheBlock.attr('label/text', 'L1 Data\nCache\n16kB');
    l1DataCacheBlock.translate(120, 0);
    graphObjsL1.push(l1DataCacheBlock);
    memMapL1['l1'] = [
        new MemoryBlock('L1 Instruction\nCache', '16kB', l1InsCacheBlock),
        new MemoryBlock('L1 Data\nCache', '16kB', l1DataCacheBlock)
    ];
    
    var mainMemoryInterfaceBlock = l1InsCacheBlock.clone();
    mainMemoryInterfaceBlock.attr({
        body: {
            rx: 0,
            ry: 0,
            fill: '#006666'
        },
        label: {
            fill: 'white',
            text: 'Main Memory Interface'
        }
    });
    mainMemoryInterfaceBlock.resize(320, 30);
    mainMemoryInterfaceBlock.translate(-40, 90);
    graphObjsL1.push(mainMemoryInterfaceBlock);
    
    var mainMemoryBlock = mainMemoryInterfaceBlock.clone();
    mainMemoryBlock.attr({
        body: {
            rx: 7.5,
            ry: 7.5,
            fill: '#647687'
        },
        label: {
            fill: 'white',
            text: 'Main Memory\n32kB'
        }
    });
    mainMemoryBlock.translate(0, 70);
    mainMemoryBlock.resize(320, 60);
    memMapL1['main'] = [
        new MemoryBlock('Main Memory', '32kB', mainMemoryBlock)
    ];
    graphObjsL1.push(mainMemoryBlock);
    
    // adding links
    // anchor calculations
    var procInterfaceCenter = procInterfaceBlock.position().x + (procInterfaceBlock.attributes.size.width / 2);
    var l1InsCacheCenter = l1InsCacheBlock.position().x + (l1InsCacheBlock.attributes.size.width / 2);
    var l1DataCacheCenter = l1DataCacheBlock.position().x + (l1DataCacheBlock.attributes.size.width / 2);
    var mainMemInterfaceCenter = mainMemoryInterfaceBlock.position().x + (mainMemoryInterfaceBlock.attributes.size.width / 2);
    var procInterfaceToL1InsCacheDx = procInterfaceCenter - l1InsCacheCenter;
    var procInterfaceToL1DataCacheDx = l1DataCacheCenter - procInterfaceCenter;
    var l1InsCacheToMainMemInterfaceDx = mainMemInterfaceCenter - l1InsCacheCenter;
    var l1DataCacheToMainMemInterfaceDx = l1DataCacheCenter - mainMemInterfaceCenter;
    var procInterfaceToL1InsCacheLink = new joint.shapes.standard.Link();
    procInterfaceToL1InsCacheLink.target(l1InsCacheBlock);
    procInterfaceToL1InsCacheLink.attr({
        line: {
            stroke: procInterfaceBlock.attr('body/fill'),
            strokeWidth: 2,
            sourceMarker: {
                type: 'path',
                fill: procInterfaceBlock.attr('body/fill'),
                d: procInterfaceToL1InsCacheLink.attr('line/targetMarker/d')
            }
        }
    });
    procInterfaceToL1InsCacheLink.source(procInterfaceBlock, {
        anchor: {
            name: 'center',
            args: {
                dx: -procInterfaceToL1InsCacheDx
            }
        }
    });
    graphObjsL1.push(procInterfaceToL1InsCacheLink);
    
    var procInterfaceToL1DataCache = procInterfaceToL1InsCacheLink.clone();
    procInterfaceToL1DataCache.source(procInterfaceBlock, {
        anchor: {
            name: 'center',
            args: {
                dx: procInterfaceToL1DataCacheDx
            }
        }
    });
    procInterfaceToL1DataCache.target(l1DataCacheBlock);
    graphObjsL1.push(procInterfaceToL1DataCache);
    
    var l1InsCacheToMainMemInterfaceLink = procInterfaceToL1InsCacheLink.clone();
    l1InsCacheToMainMemInterfaceLink.attr('line/stroke', l1InsCacheBlock.attr('body/fill'));
    l1InsCacheToMainMemInterfaceLink.attr('line/sourceMarker/fill', l1InsCacheBlock.attr('body/fill'));
    l1InsCacheToMainMemInterfaceLink.source(l1InsCacheBlock);
    l1InsCacheToMainMemInterfaceLink.target(mainMemoryInterfaceBlock, {
        anchor: {
            name: 'center',
            args: {
                dx: -l1InsCacheToMainMemInterfaceDx
            }
        }
    });
    graphObjsL1.push(l1InsCacheToMainMemInterfaceLink);
    
    var l1DataCacheToMainMemInterfaceLink = l1InsCacheToMainMemInterfaceLink.clone();
    l1DataCacheToMainMemInterfaceLink.source(l1DataCacheBlock);
    l1DataCacheToMainMemInterfaceLink.target(mainMemoryInterfaceBlock, {
        anchor: {
            name: 'center',
            args: {
                dx: l1DataCacheToMainMemInterfaceDx
            }
        }
    });
    graphObjsL1.push(l1DataCacheToMainMemInterfaceLink);
    
    var mainMemInterfactToMainMemoryLink = l1InsCacheToMainMemInterfaceLink.clone();
    mainMemInterfactToMainMemoryLink.attr('line/stroke', mainMemoryInterfaceBlock.attr('body/fill'));
    mainMemInterfactToMainMemoryLink.attr('line/sourceMarker/fill', mainMemoryInterfaceBlock.attr('body/fill'));
    mainMemInterfactToMainMemoryLink.source(mainMemoryInterfaceBlock);
    mainMemInterfactToMainMemoryLink.target(mainMemoryBlock);
    graphObjsL1.push(mainMemInterfactToMainMemoryLink);
}

function initMemorySubsystemDiagram(canvas) {
    initMemorySubsystemL1Diagram(canvas);
    initMemorySubsystemL2Diagram(canvas);
}

function showMemorySubsystemDiagram(canvas, cacheLevels) {
    if (cacheLevels !== 1 && cacheLevels !== 2)
        return;
    canvas.graph.clear();
    canvas.graphScale.x = 1.5;
    canvas.graphScale.y = 1.5;
    canvas.paper.scale(canvas.graphScale.x, canvas.graphScale.y);
    if (cacheLevels === 1) {
        for (var i = 0; i < graphObjsL1.length; i++) {
            graphObjsL1[i].addTo(canvas.graph);
        }
    } else if (cacheLevels === 2) {
        for (var i = 0; i < graphObjsL2.length; i++) {
            graphObjsL2[i].addTo(canvas.graph);
        }
    }
}

function updateMemoryBlockCapacityString(cacheLevels, memId, newSizeStr) {
    if (cacheLevels === 1 && memId in memMapL1) {
        for (var i = 0; i < memMapL1[memId].length; i++) {
            memMapL1[memId][i].updateTitle(newSizeStr);
        }
    } else if (cacheLevels === 2 && memId in memMapL2) {
        for (var i = 0; i < memMapL2[memId].length; i++) {
            memMapL2[memId][i].updateTitle(newSizeStr);
        }
    }
}

exports.show = showMemorySubsystemDiagram;
exports.init = initMemorySubsystemDiagram;
exports.updateMemTitle = updateMemoryBlockCapacityString;