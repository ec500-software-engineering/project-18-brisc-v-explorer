utils = require('./utils.js');
diagram = require('./block_diagram.js');
htmlTemplates = require('./html_templates.js');

var currentDiagramId = '';

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

function changeText(id_value, text_str, text_index) {
    var fontObject = document.getElementById(id_value);
    fontObject.childNodes[text_index].remove();
    var t = document.createTextNode(text_str);
    fontObject.appendChild(t);
    return;

}

// Set single cycle diagram to match current parameters
function updateSingleCycleDiagram() {
    var svgIdList = ['sc_i_mem_size', 'sc_d_mem_size'];
    var memSize = compute_memory_size();
    updateBramSvg(memSize, svgIdList);
}

// Set five stage pipeline diagram to match current parameters
function updateFiveStagePipelineDiagram() {
    var svgIdList = ['5sp_i_mem_size', '5sp_d_mem_size'];
    var memSize = compute_memory_size();
    updateBramSvg(memSize, svgIdList);
}

// Set seven stage pipeline diagram to match current parameters
function updateSevenStagePipelineDiagram() {
    var svgIdList = ['7sp_i_mem_size', '7sp_d_mem_size'];
    var memSize = compute_memory_size();
    updateBramSvg(memSize, svgIdList);
}

// Set OOO diagram to match current parameters
function updateOOOPipleDiagram() {
    var svgIdList = ['ooo_i_mem_size', 'ooo_d_mem_size'];
    var memSize = compute_memory_size();
    updateBramSvg(memSize, svgIdList);
    var svgIdList = ['ooo_instruction_queue_length'];
    updateIQueueSvg('instruction_queue_length', svgIdList);
    document.getElementById("instruction_queue_length").value = "4";
    document.getElementById("instruction_queue_length").disabled = false;
}


function updateBramSvg(textNumber, svgIdList) {
    // TODO: use logging library
    console.log(textNumber);
    var svgText = "Invalid";
    if (textNumber < 0) {
        svgText = "Invalid";
    } else if (textNumber < 10) {
        svgText = (2 ** textNumber).toString() + "B";
    } else if (textNumber < 20) {
        svgText = Math.floor((2 ** textNumber) / 2 ** 10).toString() + "kB";
    } else if (textNumber < 30) {
        svgText = Math.floor((2 ** textNumber) / 2 ** 20).toString() + "MB";
    } else if (textNumber < 33) {
        svgText = Math.floor((2 ** textNumber) / 2 ** 30).toString() + "GB";
    }

    for (var i = 0; i < svgIdList.length; i++) {
        var svgId = svgIdList[i];
        changeText(svgId, svgText, 0);
    }
}

function updateIQueueSvg(inputId, svgIdList) {
    document.getElementById(inputId).oninput = function (inputEvent) {
        var textValue = document.getElementById(inputId).value;
        var textNumber = parseInt(textValue, 10);
        var svgText = "Invalid Length";

        if (textNumber < 0) {
            svgText = "Invalid<br />Length";
        }
        if (textNumber < 10) {
            svgText = "Length: " + textNumber.toString();
        } else if (textNumber < 100) {
            svgText = "Length:<br />" + textNumber.toString();
        }

        for (var i = 0; i < svgIdList.length; i++) {
            var svgId = svgIdList[i];
            changeText(svgId, svgText, 0);
        }
    };
}

function updateBlockDiagram(selector) {
    if (selector === diagram.BlockDiagramEnum.SINGLE_CYCLE)
        diagram.showSingleCycleDiagram();
    else if (selector === diagram.BlockDiagramEnum.FIVE_STAGE_PIPELINE_STALL 
             || selector === diagram.BlockDiagramEnum.FIVE_STAGE_PIPELINE_BYPASS)
        diagram.show5StagePipelineDiagram();
    else if (selector === diagram.BlockDiagramEnum.SEVEN_STAGE_PIPELINE_BYPASS) 
        diagram.show7StagePipelineDiagram();
    else
        console.log(`"${selector}" diagram not supported yet...`);
}

function switchGLSettingsTabTo(tabId, glLayout) {
    var stack = glLayout.root.getItemsById('settings_stack')[0];
    var tabs = glLayout.root.getItemsById(tabId);
    if (tabs !== undefined) {
        stack.setActiveContentItem(tabs[0]);
    }
}

function init() {
    var layoutConfig = {
        content: [{
            type: 'row',
            content: [{
                type: 'component',
                componentName: 'Getting Started',
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
                        componentName: 'Project Settings',
                        id: 'project_settings'
                }, {
                        type: 'component',
                        componentName: 'Core Settings',
                        id: 'core_settings'
                    
                }, {
                        type: 'component',
                        componentName: 'Memory Settings',
                        id: 'memory_settings'
                }, {
                        type: 'component',
                        componentName: 'Downloads',
                        id: 'downloads'
                }]
                }, {
                    type: 'component',
                    componentName: 'Console',
                    height: 20
                }]
            }, {
                type: 'component',
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
    layout.init();
    $('.selectpicker').selectpicker();
    diagram.initCanvas(function(objName) {
        if (objName === 'Memory Subsystem') {
            switchGLSettingsTabTo('memory_settings', layout);
        } else if (objName === 'Processor Interface') {
            switchGLSettingsTabTo('core_settings', layout);
        }
    });
    diagram.showSingleCycleDiagram();
    $('#cycle_type_sel').on('change', function(event) {
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
    $('#num_stages_sel').on('change', function(event) {
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
    var settingsStack = layout.root.getItemsById('settings_stack')[0];
    settingsStack.on('activeContentItemChanged', function(component) {
        if (component.config.id === 'memory_settings') {
            diagram.showMemorySubsystemDiagram();
        } else {
            updateBlockDiagram(currentDiagramId);
        }
    });
    currentDiagramId = diagram.BlockDiagramEnum.SINGLE_CYCLE;
    $(window).resize(function() {
        diagram.updateDiagramDimensions();
    });
    $('#program_choose').hide();
    $('input[name="default_program"]').on('change', function() {
        var radioId = $(this)[0].id;
        if (radioId === 'custom_radio') 
            $('#program_choose').slideDown();
        else {
            if ($('#program_choose').attr('display') !== 'none')
                $('#program_choose').slideUp();
        }
    });
}
exports.init = init;
exports.updateBlockDiagram = updateBlockDiagram;
exports.messageWindow = messageWindow;