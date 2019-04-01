

function selectCoreType(selector) {

	var single_cycle_svg = document.getElementById("diagram_single_cycle_svg");
	var five_stage_pipeline = document.getElementById("diagram_five_stage_pipeline_svg");
  var seven_stage_pipeline = document.getElementById("diagram_seven_stage_pipeline_svg");
	var ooo_pipeline = document.getElementById("diagram_ooo_pipeline_svg");

  // Single Cycle
	if (selector.value == "Single Cycle") {
			single_cycle_svg.style.display = "block";
      single_cycle_update();
	} else {
			single_cycle_svg.style.display = "none";
	}

  // Five Stage Pipeline
	if (selector.value == "5 Stage Stalled Pipeline" || selector.value == "5 Stage Bypassed Pipeline") {
			five_stage_pipeline.style.display = "block";
      five_stage_pipeline_update();
	} else {
			five_stage_pipeline.style.display = "none";
	}

  // Seven Stage Pipeline
	if (selector.value == "7 Stage Bypassed Pipeline") {
			seven_stage_pipeline.style.display = "block";
      seven_stage_pipeline_update();
	} else {
			seven_stage_pipeline.style.display = "none";
  }

  // Out Of Order Pipeline
	if (selector.value == "Out Of Order Pipeline") {
			ooo_pipeline.style.display = "block";
      ooo_pipeline_update();
	} else {
			ooo_pipeline.style.display = "none";
      document.getElementById("instruction_queue_length").value = "N/A";
      document.getElementById("instruction_queue_length").disabled = true;
	}


};

function changeText(id_value, text_str, text_index) {

    var font_object = document.getElementById(id_value);
		font_object.childNodes[text_index].remove();
		var t = document.createTextNode(text_str);
		font_object.appendChild(t);
    return;

};

// Set single cycle diagram to match current parameters
function single_cycle_update() {
    var svg_ids = ['sc_i_mem_size', 'sc_d_mem_size'];
    var mem_size = compute_memory_size();
    update_bram_svg(mem_size, svg_ids);
};

// Set five stage pipeline diagram to match current parameters
function five_stage_pipeline_update() {
    var svg_ids = ['5sp_i_mem_size', '5sp_d_mem_size'];
    var mem_size = compute_memory_size();
    update_bram_svg(mem_size, svg_ids);
};

// Set seven stage pipeline diagram to match current parameters
function seven_stage_pipeline_update() {
    var svg_ids = ['7sp_i_mem_size', '7sp_d_mem_size'];
    var mem_size = compute_memory_size();
    update_bram_svg(mem_size, svg_ids);
};

// Set OOO diagram to match current parameters
function ooo_pipeline_update() {
    var svg_ids = ['ooo_i_mem_size', 'ooo_d_mem_size'];
    var mem_size = compute_memory_size();
    update_bram_svg(mem_size, svg_ids);
    var svg_ids = ['ooo_instruction_queue_length'];
    update_i_queue_svg('instruction_queue_length',svg_ids);

    document.getElementById("instruction_queue_length").value = "4";
    document.getElementById("instruction_queue_length").disabled = false;
};


function get_id_as_int(input_id) {
  //var e = document.getElementById(input_id);
  //e.oninput = function (inputEvent) {
  var text_value = document.getElementById(input_id).value;
  var text_number = parseInt(text_value,10);
  //}
  return text_number;
}


function compute_memory_size() {
  var address_bits = get_id_as_int('address_bits');
  var data_width = get_id_as_int('data_width');
  return address_bits+Math.log2(data_width)-3;
}

function update_bram_svg(text_number, svg_ids) {
  /*
  var e = document.getElementById(input_id);
  e.oninput = function (inputEvent) {
    var text_value = document.getElementById(input_id).value;
    var text_number = parseInt(text_value,10);
    */

    console.log(text_number);
    var svg_text = "Invalid";
    if(text_number<0) {
      svg_text = "Invalid";
    }
    else if(text_number<10) {
      svg_text = (2**text_number).toString()+"B";
    }
    else if(text_number<20) {
      svg_text = Math.floor((2**text_number)/2**10).toString()+"kB";
    }
    else if(text_number<30) {
      svg_text = Math.floor((2**text_number)/2**20).toString()+"MB";
    }
    else if(text_number<33) {
      svg_text = Math.floor((2**text_number)/2**30).toString()+"GB";
    }

    for (var i=0; i<svg_ids.length; i++) {
      var svg_id = svg_ids[i];
      changeText(svg_id, svg_text, 0);
    }

  //};
};

function update_i_queue_svg(input_id, svg_ids) {
  var e = document.getElementById(input_id);
  e.oninput = function (inputEvent) {

    var text_value = document.getElementById(input_id).value;
    var text_number = parseInt(text_value,10);
    var  svg_text = "Invalid Length";

    if(text_number < 0) {
      svg_text = "Invalid<br />Length";
    }
    if (text_number < 10 ) {
      svg_text = "Length: " + text_number.toString();
    }
    else if( text_number < 100) {
      svg_text = "Length:<br />" + text_number.toString();
    }

    for (var i=0; i<svg_ids.length; i++) {
      var svg_id = svg_ids[i];
      changeText(svg_id, svg_text, 0);
    }
  };
};





function saveProject() {

  var disp_str;
  if(!document.getElementById("program").files[0]){
    disp_str = "Error: You must select a program file\n";
		document.getElementById("output_textarea").value = disp_str;
    return;
  }


  var param = get_user_parameters();

  var project_template = create_top_module(param);
  var project_template_tb = create_top_module_tb(param);


  // Build zip file with project contents
	var zip = new JSZip();
  zip.file(param['project_name']+".v", project_template);
  zip.file(param['project_name']+"_tb.v", project_template_tb);

  param['program_reader'].onload = function(e) {
    // Put program in zip
		zip.file(param['program'].slice(2), param['program_reader'].result);

		generateZip(zip, param);

		// Display parameters on output text area
		disp_str = "Generating Project with the following settings:\n";
		disp_str += "Project Name: " + param['project_name'] + "\n";
		disp_str += "Core Type: " + param['core_type'] + "\n";
		disp_str += "Data Width: " + param['data_width'] + "\n";
		disp_str += "Index Bits: " + param['index_bits'] + " (Fixed and Unused)\n";
		disp_str += "Offset Bits: " + param['offset_bits'] + " (Fixed and Unused)\n";
		disp_str += "Address Bits: " + param['address_bits'] + "\n";
		disp_str += "Program: " + param['program'] + "\n";
		// Overwrite any output currently in the text area. This may not be the best
		// action to take. Consider appending text and storing 100ish lines.
		document.getElementById("output_textarea").value = disp_str;

		// Generate and download the zip file
		zip.generateAsync({type:"blob"})
		.then(function(content) {
				// see FileSaver.js
				saveAs(content, param['project_name']+".zip");
		});
  }

  var file = document.getElementById("program").files[0]; // get first file
  param['program_reader'].readAsText(file);



}

function create_top_module(param) {

  // Load Template File
  var project_template = get_project_template();

  // Set all of the user input parameters in the project template
  project_template = project_template.replace("PROJECT_NAME", param['project_name']); // In license
  project_template = project_template.replace("PROJECT_NAME", param['project_name']); // In Module Name
  project_template = project_template.replace("CORE_VALUE", param['core']);
  project_template = project_template.replace("DATA_WIDTH_VALUE", param['data_width']);
  project_template = project_template.replace("INDEX_BITS_VALUE", param['index_bits']);
  project_template = project_template.replace("OFFSET_BITS_VALUE", param['offset_bits']);
  project_template = project_template.replace("ADDRESS_BITS_VALUE", param['address_bits']);
  //project_template = project_template.replace("PRINT_CYCLES_MIN_VALUE", print_cycles_min);
  //project_template = project_template.replace("PRINT_CYCLES_MAX_VALUE", print_cycles_max);
  project_template = project_template.replace("PROGRAM_PATH", param['program']);
  return project_template;
}

function create_top_module_tb(param) {

  // Load Template File
  var project_template_tb = get_project_template_tb();
  var macros = get_processor_specific_macros(param);

  // Set Processor Specific Macros (Now the are just constants)
  project_template_tb = project_template_tb.replace("PROGRAM_MEMORY_VALUE", macros[0]); // zeros4096
  project_template_tb = project_template_tb.replace("PROGRAM_MEMORY_VALUE", macros[0]); // program
  project_template_tb = project_template_tb.replace("REGISTER_FILE_VALUE", macros[1]);

  // Set all of the user input parameters in the project template
  project_template_tb = project_template_tb.replace("PROJECT_NAME", param['project_name']); // In license
  project_template_tb = project_template_tb.replace("PROJECT_NAME", param['project_name']); // In Module Name
  project_template_tb = project_template_tb.replace("PROJECT_NAME", param['project_name']); // In Module Instantiation
  project_template_tb = project_template_tb.replace("CORE_VALUE", param['core']);
  project_template_tb = project_template_tb.replace("DATA_WIDTH_VALUE", param['data_width']);
  project_template_tb = project_template_tb.replace("INDEX_BITS_VALUE", param['index_bits']);
  project_template_tb = project_template_tb.replace("OFFSET_BITS_VALUE", param['offset_bits']);
  project_template_tb = project_template_tb.replace("ADDRESS_BITS_VALUE", param['address_bits']);
  //project_template_tb = project_template_tb.replace("PRINT_CYCLES_MIN_VALUE", print_cycles_min);
  //project_template_tb = project_template_tb.replace("PRINT_CYCLES_MAX_VALUE", print_cycles_max);
  project_template_tb = project_template_tb.replace("PROGRAM_PATH", param['program']);

  return project_template_tb;
}

function get_processor_specific_macros(param) {

  var program_memory;
  var register_file;

	switch (param['core_type']) {
		case "Single Cycle":
      program_memory = 'BRISC_V_inst.core0.IF.i_mem_interface.RAM.sram';
      register_file = 'BRISC_V_inst.core0.ID.registers.register_file';
			break;
		case "5 Stage Stalled Pipeline":
      program_memory = 'BRISC_V_inst.core0.IF.i_mem_interface0.RAM.ram';
      register_file = 'BRISC_V_inst.core0.ID.registers.register_file';
			break;
		case "5 Stage Bypassed Pipeline":
      program_memory = 'BRISC_V_inst.core0.IF.i_mem_interface0.RAM.ram';
      register_file = 'BRISC_V_inst.core0.ID.registers.register_file';
			break;
		case "7 Stage Bypassed Pipeline":
      program_memory = 'BRISC_V_inst.core0.mem_hierarchy_inst.i_mem_interface0.RAM.sram';
      register_file = 'BRISC_V_inst.core0.ID.registers.register_file';
			break;
		case "Out Of Order Pipeline":
      program_memory = "BRISC_V_inst.core0.IF.i_mem_interface0.RAM.ram";
      register_file = "BRISC_V_inst.core0.regfile.register_file";
			break;
  }

  return [program_memory, register_file];
}

function generateZip(zip, param) {

  var function_list;
	switch (param['core_type']) {
		case "Single Cycle":
      function_list = single_cycle_base_get_function_list();
			break;
		case "5 Stage Stalled Pipeline":
      function_list = five_stage_pipeline_stall_base_get_function_list();
			break;
		case "5 Stage Bypassed Pipeline":
      function_list = five_stage_pipeline_stall_bypass_get_function_list();
			break;
		case "7 Stage Bypassed Pipeline":
      function_list = seven_stage_pipeline_stall_bypass_get_function_list();
			break;
		case "Out Of Order Pipeline":
      function_list = out_out_order_get_function_list();
			break;
  }

	for (var i = 0; i < function_list.length; i++) {
    function_list[i](zip);
	}

}

function get_user_parameters() {
  // Get all of the user input parameters
  var dict = {}
  dict['project_name'] = document.getElementById("project_name").value;
  dict['core_type'] = document.getElementById("sel1").value;
  // Hard code this parameter. It is not used in these cores.
  dict['core'] = 0;
  dict['data_width'] = document.getElementById("data_width").value;
  // Cache are unused in the current cores
  dict['num_indexesL1'] = document.getElementById("num_indexesL1").value;
  dict['associativityL1'] = document.getElementById("associativityL1").value;
  dict['line_size'] = document.getElementById("line_size").value;
  dict['index_bits'] = Math.log2(dict['num_indexesL1']);
  dict['offset_bits'] = Math.log2(dict['line_size']);
  dict['address_bits'] = document.getElementById("address_bits").value;

  //var print_cycles_min
  //var print_cycles_max

	// Get file name
	dict['program'] = "./"+document.getElementById("program").files[0].name;
  // Load the file content
  var reader = new FileReader();
  dict['program_reader'] = reader;

  return dict;
}


function clean_project_name() {
  // This function finds and removes/replaces charachters that cannot be in
  // verilog module names.

  var project_name = document.getElementById("project_name").value;
  var clean_project_name = project_name.replace(/[^a-zA-Z1-9 ]/g, "_");
  var disp_str;

  if(clean_project_name != project_name) {
    disp_str = "Warning: Replacing non alpha-numeric charachters in Project Name with underscores.";
    disp_str += "\nOriginal Name: " + project_name;
    disp_str += "\nClean Name: " + clean_project_name;
    document.getElementById("output_textarea").value = disp_str;
    document.getElementById("project_name").value = clean_project_name;
  }

}

onload = function () {

  // Address Bits Update
  var svg_ids = ['sc_i_mem_size', 'sc_d_mem_size', '5sp_i_mem_size', '5sp_d_mem_size', 'ooo_i_mem_size', 'ooo_d_mem_size'];
  update_bram_svg(compute_memory_size(), svg_ids);

  // Instruction Queue Update
  selector = document.getElementById('sel1');
  if (selector.value == "Out Of Order Pipeline") {
    var svg_ids = ['ooo_instruction_queue_length'];
    update_i_queue_svg('instruction_queue_length', svg_ids);
  }

};
