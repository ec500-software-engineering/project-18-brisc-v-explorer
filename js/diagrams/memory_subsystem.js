blockDiagramUtils = require('../block_diagram.js');

function initMemorySubsystemDiagram(canvas) {
    canvas.graph.clear();
    canvas.graphScale.x = 1;
    canvas.graphScale.y = 1;
    canvas.paper.scale(canvas.graphScale.x, canvas.graphScale.y);

    var l1InsCacheBlock = new joint.shapes.standard.Rectangle();
    l1InsCacheBlock.attr({
        body: {
            rx: 6,
            ry: 6,
            fill: '#0086b3'
        },
        label: {
            fill: 'white',
            text: 'L1 Instruction\nCache\n16kB'
        }
    });
    l1InsCacheBlock.position(50, 5);
    l1InsCacheBlock.resize(100, 60);
    l1InsCacheBlock.addTo(canvas.graph);
    l1InsCacheBlock.on('change:position', function () {
        console.log('L1 instruction cache position: ' + l1InsCacheBlock.position());
    });
    l1InsCacheBlock.addTo(canvas.graph);

    var l1DataCacheBlock = new joint.shapes.standard.Rectangle();
    l1DataCacheBlock.attr({
        body: {
            rx: 6,
            ry: 6,
            fill: '#0086b3'
        },
        label: {
            fill: 'white',
            text: 'L1 Data\nCache\n16kB'
        }
    });
    l1DataCacheBlock.position(canvas.paper.options.width - 150, 10);
    l1DataCacheBlock.resize(100, 60);
    l1DataCacheBlock.addTo(canvas.graph);
    l1DataCacheBlock.on('change:position', function () {
        console.log('L1 Data cache position: ' + l1InsCacheBlock.position());
    });
    l1InsCacheBlock.addTo(canvas.graph);

    /*var sharedBusBlock = l1InsCacheBlock.clone();
    sharedBusBlock.attr('label/text', 'Shared Bus');
    var busWidth = (l1DataCacheBlock.position().x + l1DataCacheBlock.attributes.size.width) - l1InsCacheBlock.position().x;
    sharedBusBlock.resize(busWidth, 20);
    sharedBusBlock.translate(0, 100);
    sharedBusBlock.attr('body/fill', '#cc6600');
    sharedBusBlock.addTo(canvas.graph);*/

    var l2CombinedCacheBlock = new joint.shapes.standard.Rectangle();
    l2CombinedCacheBlock.attr({
        body: {
            rx: 6,
            ry: 6,
            fill: '#00a3cc'
        },
        label: {
            fill: 'white',
            text: 'L2 Combined Cache\n16kB'
        }
    });
    l2CombinedCacheBlock.resize(150, 70);
    var l1l2MidPoint = l1DataCacheBlock.position().x - (l1InsCacheBlock.position().x + l1InsCacheBlock.attributes.size.width);
    l1l2MidPoint /= 2;
    var l2PositionX = l1l2MidPoint + (l2CombinedCacheBlock.attributes.size.width / 2);
    var l2PositionY = l1DataCacheBlock.position().y + 130;
    l2CombinedCacheBlock.position(l2PositionX, l2PositionY);
    l2CombinedCacheBlock.on('change:position', function () {
        console.log('L1 Data cache position: ' + l2CombinedCacheBlock.position());
    });
    l2CombinedCacheBlock.addTo(canvas.graph);

    var mainMemoryInterfaceBlock = l1InsCacheBlock.clone();
    mainMemoryInterfaceBlock.attr('label/text', 'Main Memory Interface');
    var busWidth = (l1DataCacheBlock.position().x + l1DataCacheBlock.attributes.size.width) - l1InsCacheBlock.position().x;
    mainMemoryInterfaceBlock.resize(busWidth, 20);
    mainMemoryInterfaceBlock.translate(0, l2CombinedCacheBlock.position().y + 110);
    mainMemoryInterfaceBlock.attr('body/fill', '#009999');
    mainMemoryInterfaceBlock.addTo(canvas.graph);

    var mainMemoryBlock = mainMemoryInterfaceBlock.clone();
    mainMemoryBlock.resize(200, 70);
    var memPositionX = l2PositionX;
    memPositionX -= (mainMemoryBlock.attributes.size.width / 8);
    var memPositionY = mainMemoryInterfaceBlock.position().y + 60;
    mainMemoryBlock.attr('label/text', 'Main Memory\n32kB');
    mainMemoryBlock.position(memPositionX, memPositionY);
    mainMemoryBlock.attr('body/fill', '#2eb8b8');
    mainMemoryBlock.addTo(canvas.graph);

    // handle links
    // l1 i$ to shared bus
    var l1InsCacheToL2CacheLink = new joint.shapes.standard.Link();
    l1InsCacheToL2CacheLink.attr({
        line: {
            width: 3,
        }
    })
    l1InsCacheToL2CacheLink.source(l1InsCacheBlock);
    l1InsCacheToL2CacheLink.target(l2CombinedCacheBlock, {
        anchor: {
            name: 'center',
            args: {
                dx: -15
            }
        }
    });
    l1InsCacheToL2CacheLink.attr({
        line: {
            stroke: l1DataCacheBlock.attr('body/fill'),
            strokeWidth: 3,
            sourceMarker: {
                type: 'path',
                d: l1InsCacheToL2CacheLink.attr('line/targetMarker/d')
            }
        }
    });
    l1InsCacheToL2CacheLink.router('manhattan', {
        startDirections: ['bottom'],
        endDirections: ['top']
    });
    l1InsCacheToL2CacheLink.connector('rounded');
    l1InsCacheToL2CacheLink.addTo(canvas.graph);
    // l1 i$ to shared bus
    var l1DataCacheToL2CacheLink = new joint.shapes.standard.Link();
    l1DataCacheToL2CacheLink.source(l1DataCacheBlock);
    l1DataCacheToL2CacheLink.target(l2CombinedCacheBlock, {
        anchor: {
            name: 'center',
            args: {
                dx: 15
            }
        }
    });
    l1DataCacheToL2CacheLink.attr({
        line: {
            stroke: l1DataCacheBlock.attr('body/fill'),
            strokeWidth: 3,
            sourceMarker: {
                type: 'path',
                d: l1DataCacheToL2CacheLink.attr('line/targetMarker/d')
            }
        }
    });
    l1DataCacheToL2CacheLink.router('manhattan', {
        startDirections: ['bottom'],
        endDirections: ['top']
    });
    l1DataCacheToL2CacheLink.connector('rounded');
    l1DataCacheToL2CacheLink.addTo(canvas.graph);
    // L2 to main memory interface
    var l2ToMainMemInterfaceLink = l1DataCacheToL2CacheLink.clone();
    l2ToMainMemInterfaceLink.attr({
        line: {
            stroke: l2CombinedCacheBlock.attr('body/fill'),
            strokeWidth: 3
        }
    });
    l2ToMainMemInterfaceLink.source(l2CombinedCacheBlock);
    l2ToMainMemInterfaceLink.target(mainMemoryInterfaceBlock);
    l2ToMainMemInterfaceLink.addTo(canvas.graph);
    // L2 to main memory interface
    var memInterfaceToMainMemory = l2ToMainMemInterfaceLink.clone();
    memInterfaceToMainMemory.attr({
       line: {
           stroke: mainMemoryInterfaceBlock.attr('body/fill'),
           strokeWidth: 3
       } 
    });
    memInterfaceToMainMemory.source(mainMemoryInterfaceBlock);
    memInterfaceToMainMemory.target(mainMemoryBlock);
    memInterfaceToMainMemory.addTo(canvas.graph);

}

exports.show = initMemorySubsystemDiagram;