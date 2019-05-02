blockDiagramUtils = require('../block_diagram.js');

function initMemorySubsystemDiagram(canvas) {
    canvas.graph.clear();
    canvas.graphScale.x = 1;
    canvas.graphScale.y = 1;
    canvas.paper.scale(canvas.graphScale.x, canvas.graphScale.y);

    var l1InsCacheBlock = new joint.shapes.standard.Rectangle();
    l1InsCacheBlock.position(50, 10);
    l1InsCacheBlock.attr('label/text', 'L1 Instruction\nCache\n16kB');
    l1InsCacheBlock.attr('body/fill', '#b32d00');
    l1InsCacheBlock.attr('label/fill', 'white');
    l1InsCacheBlock.resize(100, 60);
    l1InsCacheBlock.addTo(canvas.graph);
    l1InsCacheBlock.on('change:position', function () {
        console.log('L1 instruction cache position: ' + l1InsCacheBlock.position());
    });
    l1InsCacheBlock.addTo(canvas.graph);

    var l1DataCacheBlock = new joint.shapes.standard.Rectangle();
    l1DataCacheBlock.position(canvas.paper.options.width - 150, 10);
    l1DataCacheBlock.attr('label/text', 'L1 Data\nCache\n16kB');
    l1DataCacheBlock.attr('body/fill', '#b32d00');
    l1DataCacheBlock.attr('label/fill', 'white');
    l1DataCacheBlock.resize(100, 60);
    l1DataCacheBlock.addTo(canvas.graph);
    l1DataCacheBlock.on('change:position', function () {
        console.log('L1 Data cache position: ' + l1InsCacheBlock.position());
    });
    l1InsCacheBlock.addTo(canvas.graph);

    var sharedBusBlock = l1InsCacheBlock.clone();
    sharedBusBlock.attr('label/text', 'Shared Bus');
    var busWidth = (l1DataCacheBlock.position().x + l1DataCacheBlock.attributes.size.width) - l1InsCacheBlock.position().x;
    sharedBusBlock.resize(busWidth, 20);
    sharedBusBlock.translate(0, 100);
    sharedBusBlock.attr('body/fill', '#cc6600');
    sharedBusBlock.addTo(canvas.graph);

    var l2CombinedCacheBlock = new joint.shapes.standard.Rectangle();
    l2CombinedCacheBlock.attr('label/text', 'L2 Combined Cache\n16kB');
    l2CombinedCacheBlock.attr('body/fill', '#992600');
    l2CombinedCacheBlock.attr('label/fill', 'white');
    l2CombinedCacheBlock.resize(150, 70);
    l2CombinedCacheBlock.addTo(canvas.graph);
    l2CombinedCacheBlock.on('change:position', function () {
        console.log('L1 Data cache position: ' + l2CombinedCacheBlock.position());
    });
    var l2PositionX = (sharedBusBlock.position().x + (sharedBusBlock.attributes.size.width / 2));
    l2PositionX -= (l2CombinedCacheBlock.attributes.size.width / 2);
    var l2PositionY = sharedBusBlock.position().y + 50;
    l2CombinedCacheBlock.position(l2PositionX, l2PositionY);
    l2CombinedCacheBlock.addTo(canvas.graph);

    var mainMemoryInterfaceBlock = sharedBusBlock.clone();
    mainMemoryInterfaceBlock.attr('label/text', 'Main Memory Interface');
    mainMemoryInterfaceBlock.translate(0, l2CombinedCacheBlock.attributes.size.height + 80);
    mainMemoryInterfaceBlock.attr('body/fill', '#cc6600');
    mainMemoryInterfaceBlock.addTo(canvas.graph);

    var mainMemoryBlock = mainMemoryInterfaceBlock.clone();
    mainMemoryBlock.resize(200, 70);
    var memPositionX = l2PositionX;
    memPositionX -= (mainMemoryBlock.attributes.size.width / 8);
    var memPositionY = mainMemoryInterfaceBlock.position().y + 50;
    mainMemoryBlock.attr('label/text', 'Main Memory\n32kB');
    mainMemoryBlock.position(memPositionX, memPositionY);
    mainMemoryBlock.attr('body/fill', '#802000');
    mainMemoryBlock.addTo(canvas.graph);

    // handle links
    // l1 i$ to shared bus
    var busMiddleX = sharedBusBlock.position().x +
        (sharedBusBlock.attributes.size.width / 2);
    var l1InsCacheMiddleX = l1InsCacheBlock.position().x +
        (l1InsCacheBlock.attributes.size.width / 2);
    var l1InsTargetAnchorDelta = busMiddleX - l1InsCacheMiddleX;
    var l1InsCacheToSharedBusLink = new joint.shapes.standard.Link();
    l1InsCacheToSharedBusLink.source(l1InsCacheBlock);
    l1InsCacheToSharedBusLink.target(sharedBusBlock, {
        anchor: {
            name: 'center',
            args: {
                dx: -l1InsTargetAnchorDelta
            }
        }
    });
    l1InsCacheToSharedBusLink.attr({
        line: {
            sourceMarker: {
                type: 'path',
                d: l1InsCacheToSharedBusLink.attr('line/targetMarker/d')
            }
        }
    });
    l1InsCacheToSharedBusLink.addTo(canvas.graph);
    // l1 i$ to shared bus
    var l1DataCacheMiddleX = l1DataCacheBlock.position().x +
        (l1DataCacheBlock.attributes.size.width / 2);
    var l1DataTargetAnchorDelta = busMiddleX - l1DataCacheMiddleX;
    var l1DataCacheToSharedBusLink = new joint.shapes.standard.Link();
    l1DataCacheToSharedBusLink.source(l1DataCacheBlock);
    l1DataCacheToSharedBusLink.target(sharedBusBlock, {
        anchor: {
            name: 'center',
            args: {
                dx: -l1DataTargetAnchorDelta
            }
        }
    });
    l1DataCacheToSharedBusLink.attr({
        line: {
            sourceMarker: {
                type: 'path',
                d: l1DataCacheToSharedBusLink.attr('line/targetMarker/d')
            }
        }
    });
    l1DataCacheToSharedBusLink.addTo(canvas.graph);
    // bus to L2
    var sharedBusToL2Link = l1DataCacheToSharedBusLink.clone();
    sharedBusToL2Link.source(sharedBusBlock);
    sharedBusToL2Link.target(l2CombinedCacheBlock);
    sharedBusToL2Link.addTo(canvas.graph);
    // L2 to main memory interface
    var l2ToMainMemInterfaceLink = l1DataCacheToSharedBusLink.clone();
    l2ToMainMemInterfaceLink.source(l2CombinedCacheBlock);
    l2ToMainMemInterfaceLink.target(mainMemoryInterfaceBlock);
    l2ToMainMemInterfaceLink.addTo(canvas.graph);
    // L2 to main memory interface
    var memInterfaceToMainMemory = l2ToMainMemInterfaceLink.clone();
    memInterfaceToMainMemory.source(mainMemoryInterfaceBlock);
    memInterfaceToMainMemory.target(mainMemoryBlock);
    memInterfaceToMainMemory.addTo(canvas.graph);

}

exports.show = initMemorySubsystemDiagram;
