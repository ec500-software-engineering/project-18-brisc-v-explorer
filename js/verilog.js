gui = require('./gui.js');
utils = require('./utils.js');
zeroFill = require('./verilog_local_repo/zero_fill_data.js');
singleCycle = require('./verilog_local_repo/single_cycle_base.js');
topModuletemplates = require('./verilog_local_repo/top_module_templates.js');
fiveStageStall = require('./verilog_local_repo/5_stage_pipeline_stall_base.js');
fiveStageStallBypass = require('./verilog_local_repo/5_stage_pipeline_stall_bypass.js');
sevenStageStallBypass = require('./verilog_local_repo/7_stage_pipeline_stall_bypass.js');


var local = {
    getProcessorSpecificMarcos: function (params) {
        var programMemory;
        var reg;

        switch (params['core_type']) {
            case "Single Cycle":
                programMemory = 'BRISC_V_inst.core0.IF.i_mem_interface.RAM.sram';
                reg = 'BRISC_V_inst.core0.ID.registers.register_file';
                break;
            case "5 Stage Stalled Pipeline":
                programMemory = 'BRISC_V_inst.core0.IF.i_mem_interface0.RAM.ram';
                reg = 'BRISC_V_inst.core0.ID.registers.register_file';
                break;
            case "5 Stage Bypassed Pipeline":
                programMemory = 'BRISC_V_inst.core0.IF.i_mem_interface0.RAM.ram';
                reg = 'BRISC_V_inst.core0.ID.registers.register_file';
                break;
            case "7 Stage Bypassed Pipeline":
                programMemory = 'BRISC_V_inst.core0.mem_hierarchy_inst.i_mem_interface0.RAM.sram';
                reg = 'BRISC_V_inst.core0.ID.registers.register_file';
                break;
            case "Out Of Order Pipeline":
                programMemory = "BRISC_V_inst.core0.IF.i_mem_interface0.RAM.ram";
                reg = "BRISC_V_inst.core0.regfile.register_file";
                break;
        }

        return [programMemory, reg];
    },


    getTopModule: function (param) {

        // Load Template File
        var projectTemplate = utils.getStrCopy(topModuletemplates.topModule.fileContent);

        // Set all of the user input parameters in the project template
        projectTemplate = projectTemplate.replace("PROJECT_NAME", param['project_name']); // In license
        projectTemplate = projectTemplate.replace("PROJECT_NAME", param['project_name']); // In Module Name
        projectTemplate = projectTemplate.replace("CORE_VALUE", param['core']);
        projectTemplate = projectTemplate.replace("DATA_WIDTH_VALUE", param['data_width']);
        projectTemplate = projectTemplate.replace("INDEX_BITS_VALUE", param['index_bits']);
        projectTemplate = projectTemplate.replace("OFFSET_BITS_VALUE", param['offset_bits']);
        projectTemplate = projectTemplate.replace("ADDRESS_BITS_VALUE", param['address_bits']);
        //project_template = project_template.replace("PRINT_CYCLES_MIN_VALUE", print_cycles_min);
        //project_template = project_template.replace("PRINT_CYCLES_MAX_VALUE", print_cycles_max);
        projectTemplate = projectTemplate.replace("PROGRAM_PATH", param['program']);
        return projectTemplate;
    },


    getTopModuleTb: function (params) {

        // Load Template File
        var projectTemplateTb = utils.getStrCopy(topModuletemplates.topModuleTb.fileContent);
        var macros = this.getProcessorSpecificMarcos(params);

        // Set Processor Specific Macros (Now the are just constants)
        projectTemplateTb = projectTemplateTb.replace("PROGRAM_MEMORY_VALUE", macros[0]); // zeros4096
        projectTemplateTb = projectTemplateTb.replace("PROGRAM_MEMORY_VALUE", macros[0]); // program
        projectTemplateTb = projectTemplateTb.replace("REGISTER_FILE_VALUE", macros[1]);

        // Set all of the user input parameters in the project template
        projectTemplateTb = projectTemplateTb.replace("PROJECT_NAME", params['project_name']); // In license
        projectTemplateTb = projectTemplateTb.replace("PROJECT_NAME", params['project_name']); // In Module Name
        projectTemplateTb = projectTemplateTb.replace("PROJECT_NAME", params['project_name']); // In Module Instantiation
        projectTemplateTb = projectTemplateTb.replace("CORE_VALUE", params['core']);
        projectTemplateTb = projectTemplateTb.replace("DATA_WIDTH_VALUE", params['data_width']);
        projectTemplateTb = projectTemplateTb.replace("INDEX_BITS_VALUE", params['index_bits']);
        projectTemplateTb = projectTemplateTb.replace("OFFSET_BITS_VALUE", params['offset_bits']);
        projectTemplateTb = projectTemplateTb.replace("ADDRESS_BITS_VALUE", params['address_bits']);
        //project_template_tb = project_template_tb.replace("PRINT_CYCLES_MIN_VALUE", print_cycles_min);
        //project_template_tb = project_template_tb.replace("PRINT_CYCLES_MAX_VALUE", print_cycles_max);
        projectTemplateTb = projectTemplateTb.replace("PROGRAM_PATH", params['program']);

        return projectTemplateTb;
    },
    
    getCoreSpecificContentList: function (coreName) {
        var docs = undefined;
        var modules = undefined;
        var contentList = null;
        switch (coreName) {
            case 'Single Cycle':
                modules = singleCycle.modules;
                docs = singleCycle.documentation;
                break;
            case '5 Stage Stalled Pipeline':
                modules = fiveStageStall.modules;
                docs = fiveStageStall.documentation;
                break;
            case '5 Stage Bypassed Pipeline':
                modules = fiveStageStallBypass.modules;
                docs = fiveStageStallBypass.doc;
                break;
            case '7 Stage Bypassed Pipeline':
                modules = sevenStageStallBypass.modules;
                docs = sevenStageStallBypass.documentation;
                break;
            case 'Out Of Order Pipeline':
                // TODO: add out of order support
                break;
            default:
                // TODO: log error
                break;
        }
        if (modules != undefined) {
            contentList = [];
            // compile list of source code files needed
            for (const [name, moduleDict] of Object.entries(modules)) {
                contentList.push(moduleDict);
            }
            // compile list documentation files needed
            for (const [name, docDict] of Object.entries(docs)) {
                contentList.push(docDict);
            }
        }
        return contentList;
    },

    getConfiguredProject: function (params) {
        var topModuleContent = this.getTopModule(params);
        var topModuleTbContent = this.getTopModuleTb(params);
        
        var projectContentList = this.getCoreSpecificContentList(params['core_type']);
        if (projectContentList != null) {
            // add memory initialization data
            projectContentList.push(zeroFill.zeros32);
            projectContentList.push(zeroFill.zeros4096);
            projectContentList.push({
                filename: params['project_name'] + '.v',
                fileContent: topModuleContent,
            });
            projectContentList.push({
                filename: params['project_name'] + '_tb.v',
                fileContent: topModuleTbContent
            });
        }
        return projectContentList;
    }

};

var remote = {
    getConfiguredProject: function (params, callback, saveArgs) {
        var urlParams = Object.keys(params).map(function (k) {
            return encodeURIComponent(k) + '=' + encodeURIComponent(params[k])
        }).join('&');
        var verilogEndpoint = 'http://168.122.210.26:8000/verilog_fetch?' + urlParams;
        gui.messageWindow.println('Please wait; retrieving project files from remote verilog repository...');
        JSZipUtils.getBinaryContent(verilogEndpoint, function (err, data) {
            if (err === null) {
                JSZip.loadAsync(data).then(function (zip) {
                    callback(params, zip, saveArgs);
                });
            } else {
                gui.messageWindow.println('Error: Failed to connect to remote Verilog Repository at IP address 168.122.210.26:8000');
            }
        });
    }
};
exports.local = local;
exports.remote = remote;