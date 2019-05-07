utils = require('./utils.js');
diagram = require('./block_diagram.js');
htmlTemplates = require('./html_templates.js');

var currentDiagramId = '';
var memoryDiagramIsDisplayed = false;

var tabIdToStackObj = {};

var messageWindow = {
    displayStr: '',

    MAX_NUM_LINES: 100,

    print: function (str) {
        var messagesElem = document.getElementById('messages');
        if (messagesElem !== null) {
            this.displayStr += str.replace('\n', '<br>');
            messagesElem.innerHTML = this.displayStr;
            messagesElem.scrollTop = messagesElem.scrollHeight;
        }
    },

    println: function (str) {
        this.print(str + '\n');
    },

    clear: function () {
        var messagesElem = document.getElementById('messages');
        if (messagesElem !== null) {
            messagesElem.innerHTML = '';
            this.displayStr = '';
        }
    }
};


function getCacheMemorySizeFromInput() {
    var numAddrBits = parseInt($('#address_bit_width').val(), 10);
    var numDataBits = parseInt($('#data_bit_width').val(), 10);
    return numAddrBits + Math.log2(numDataBits) - 3;
}

function getMainMemorySizeFromInput() {
    var numWords = parseInt($('#num_words').val(), 10);
    return numWords * 4;  // assume word size is 4 (rv32i)
}


function updateBlockDiagram(selector) {
    if (selector === diagram.BlockDiagramEnum.SINGLE_CYCLE)
        diagram.showSingleCycleDiagram();
    else if (selector === diagram.BlockDiagramEnum.FIVE_STAGE_PIPELINE_STALL ||
        selector === diagram.BlockDiagramEnum.FIVE_STAGE_PIPELINE_BYPASS)
        diagram.show5StagePipelineDiagram();
    else if (selector === diagram.BlockDiagramEnum.SEVEN_STAGE_PIPELINE_BYPASS)
        diagram.show7StagePipelineDiagram();
    else
        console.log(`"${selector}" diagram not supported yet...`);
}

function switchGLSettingsTabTo(tabId, glLayout) {
    if (tabId in tabIdToStackObj) {
        var tabs = glLayout.root.getItemsById(tabId);
        if (tabs !== undefined) {
            tabIdToStackObj[tabId].setActiveContentItem(tabs[0]);
        }
    }
}

function init() {
    var layoutConfig = {
        settings: {
            showPopoutIcon: false,
            showMaximiseIcon: false,
            showCloseIcon: false
        },
        dimensions: {
            minItemWidth: 300
        },
        content: [{
            type: 'row',
            content: [{
                type: 'component',
                componentName: 'Getting Started',
                isClosable: false,
                width: 25
            }, {
                type: 'column',
                width: 35,
                content: [{
                    id: 'settings_stack',
                    type: 'stack',
                    height: 80,
                    content: [{
                        type: 'component',
                        isClosable: false,
                        componentName: 'Project Settings',
                        id: 'project_settings'
                }, {
                        type: 'component',
                        isClosable: false,
                        componentName: 'Core Settings',
                        id: 'core_settings'

                }, {
                        type: 'component',
                        isClosable: false,
                        componentName: 'Memory Settings',
                        id: 'memory_settings'
                }, {
                        type: 'component',
                        isClosable: false,
                        componentName: 'Downloads',
                        id: 'downloads'
                }]
                }, {
                    type: 'component',
                    isClosable: false,
                    componentName: 'Console',
                    height: 20
                }]
            }, {
                type: 'component',
                isClosable: false,
                componentName: 'Canvas',
                width: 40
            }]
        }]
    };
    var layout = new GoldenLayout(layoutConfig, '#gl_wrapper');
    layout.registerComponent('Getting Started', function (container, componentState) {
        container.getElement().html(htmlTemplates.gettingStarted.html);
    });
    layout.registerComponent('Core Settings', function (container, componentState) {
        container.getElement().html(htmlTemplates.coreSettings.html);
    });
    layout.registerComponent('Memory Settings', function (container, componentState) {
        container.getElement().html(htmlTemplates.memorySettings.html);
    });
    layout.registerComponent('Downloads', function (container, componentState) {
        container.getElement().html(htmlTemplates.downloads.html);
    });
    layout.registerComponent('Canvas', function (container, componentState) {
        container.getElement().html(htmlTemplates.canvas.html);
    });
    layout.registerComponent('Console', function (container, componentState) {
        container.getElement().html(htmlTemplates.consoleWindow.html);
    });
    layout.registerComponent('Project Settings', function (container, componentState) {
        container.getElement().html(htmlTemplates.projectSettings.html);
    });
    layout.on('componentCreated', function (component) {
        component.container.on('resize', function () {
            if (component.componentName === 'Canvas') {
                diagram.updateDiagramDimensions();
            }
        });
        component.container.on('show', function () {
            if (component.config.id === 'memory_settings') {
                diagram.showMemorySubsystemDiagram(parseInt($('#num_cache_levels').val()));
            } else {
                updateBlockDiagram(currentDiagramId);
            }
        });
    });
    layout.on('tabCreated', function(tab) {
        var component = tab.contentItem;
        var componentId = component.config.id;
        var parent = component.parent;
        tabIdToStackObj[componentId] = parent;
    });
    layout.init();
    $('.selectpicker').selectpicker();
    diagram.init(function (objName) {
        if (objName === 'Memory Subsystem') {
            switchGLSettingsTabTo('memory_settings', layout);
        } else if (objName === 'Processor Interface') {
            switchGLSettingsTabTo('core_settings', layout);
        }
    });
    diagram.showSingleCycleDiagram();
    $('#cycle_type_sel').on('change', function (event) {
        if (event.target.value === 'Single Cycle') {
            currentDiagramId = diagram.BlockDiagramEnum.SINGLE_CYCLE;
            updateBlockDiagram(currentDiagramId);
            $('#stage_group').slideUp();
            // FIXME: lazy...
            $('#pipeline_group_1').slideUp();
            $('#pipeline_group_2').slideUp();
        } else if (event.target.value === 'Multi Cycle') {
            currentDiagramId = diagram.BlockDiagramEnum.FIVE_STAGE_PIPELINE_STALL;
            updateBlockDiagram(currentDiagramId);
            $('#stage_group').slideDown();
            $('#pipeline_group_1').slideDown();
        }
    });
    $('#num_stages_sel').on('change', function (event) {
        if (event.target.value === '5 Stage') {
            $('#pipeline_group_2').hide();
            $('#pipeline_group_1').show();
            currentDiagramId = diagram.BlockDiagramEnum.FIVE_STAGE_PIPELINE_STALL;
            updateBlockDiagram(currentDiagramId);
        } else if (event.target.value === '7 Stage') {
            $('#pipeline_group_1').hide();
            $('#pipeline_group_2').show();
            currentDiagramId = diagram.BlockDiagramEnum.SEVEN_STAGE_PIPELINE_BYPASS;
            updateBlockDiagram(currentDiagramId);
        }
    });
    $('#stage_group').hide();
    $('#pipeline_group_1').hide();
    $('#pipeline_group_2').hide();
    currentDiagramId = diagram.BlockDiagramEnum.SINGLE_CYCLE;
    $(window).resize(function () {
        layout.updateSize($('#gl_wrapper').width(), $('#gl_wrapper').height());
        diagram.updateDiagramDimensions();
    });
    $('#program_choose').hide();
    $('input[name="default_program"]').on('change', function () {
        var radioId = $(this)[0].id;
        if (radioId === 'custom_radio')
            $('#program_choose').slideDown();
        else {
            if ($('#program_choose').attr('display') !== 'none')
                $('#program_choose').slideUp();
        }
    });
    $('#l2_hr').hide();
    $('#l2_cache_config_container').hide();
    $('#num_cache_levels').on('change', function() {
        diagram.showMemorySubsystemDiagram(parseInt($('#num_cache_levels').val()));
        var numCacheLevels = parseInt($('#num_cache_levels').val());
        if (numCacheLevels === 1) {
            $('#l2_cache_config_container').slideUp();
            $('#l2_hr').slideUp();
        } else if (numCacheLevels === 2) {
            $('#l2_cache_config_container').slideDown();
            $('#l2_hr').slideDown();
        }
        // so that higher levels get updated
        $('#address_bit_width').trigger('change');
        $('#num_words').trigger('change');
    });
    $('#address_bit_width').on('change', function() {
        var newSize = getCacheMemorySizeFromInput();
        var newSizeStr = utils.getHumanReadableSizeStrFromBits(newSize);
        var cacheLevels = parseInt($('#num_cache_levels').val(), 10);
        for (var lvl = 1; lvl <= cacheLevels; lvl++) {
            diagram.updateMemTitle(cacheLevels, `l${lvl}`, newSizeStr);
        }
    });
    $('#data_bit_width').on('change', function() {
        var newSize = getCacheMemorySizeFromInput();
        var newSizeStr = utils.getHumanReadableSizeStrFromBits(newSize);
        var cacheLevels = parseInt($('#num_cache_levels').val(), 10);
        for (var lvl = 1; lvl <= cacheLevels; lvl++) {
            diagram.updateMemTitle(cacheLevels, `l${lvl}`, newSizeStr);
        }
    });
    // just so the diagram is updated ot load time
    $('#address_bit_width').trigger('change');
    $('#num_words').on('change', function() {
        var newSize = getMainMemorySizeFromInput();
        var newSizeStr = utils.getHumanReadableSizeStrFromBytes(newSize);
        console.log(newSizeStr);
        var cacheLevels = parseInt($('#num_cache_levels').val(), 10);
        diagram.updateMemTitle(cacheLevels, 'main', newSizeStr);
    });
    $('#num_words').trigger('change');
     var stack = layout.root.getItemsById('settings_stack')[0];
    tabIdToStackObj['memory_settings'] = stack;
    tabIdToStackObj['core_settings'] = stack;
    
}
exports.init = init;
exports.updateBlockDiagram = updateBlockDiagram;
exports.messageWindow = messageWindow;