const coreSettingsTemplate = {
    html: `
<div class="container-fluid gl_container" id="core_settings">
  <h3>Core Configuration</h3>
  <form>
    <div class="form-group">
      <label for="num_cores">Number of Cores</label>
      <input type="number" class="form-control input-normal" id="num_cores" min=1 max=1 value=1 style="width: 30%;">
    </div>
    <div class="form-group">
      <label for="cycle_type_sel">Cycle Type</label><br>
      <select class="selectpicker" id="cycle_type_sel">
      	<option value="Single Cycle">Single Cycle</option>
        <option value="Multi Cycle">Multi Cycle</option>
      </select>
    </div>
    <div class="form-group" id="stage_group">
      <label for="num_stages_sel">Number of Stages</label><br>
      <select class="selectpicker" id="num_stages_sel">
      	<option value="5 Stage">5 Stage</option>
        <option value="7 Stage">7 Stage</option>
      </select>
    </div>
    <div class="form-group" id="pipeline_group_1">
      <label for="pipeline_logic_sel">Pipeline Logic</label><br>
      <select class="selectpicker" id="pipeline_logic_sel_1">
      	<option value="Stalled Pipeline">Stall</option>
        <option value="Bypassed Pipeline">Bypass</option>
      </select>
    </div>
     <div class="form-group" id="pipeline_group_2">
      <label for="pipeline_logic_sel">Pipeline Logic</label><br>
      <select class="selectpicker" id="pipeline_logic_sel_2">
      	<option value="Bypassed Pipeline">Bypass</option>
      </select>
    </div>
    <div class="form-group">
      <label for="address_bit_width">Address Bit Width</label>
      <input id="address_bit_width" type="number" class="form-control input-normal" id="bit_width" min=12 max=32 value=12 style="width: 30%;">
    </div>
    <div class="form-group">
      <label for="data_bit_width">Data Bit Width</label>
      <input id="data_bit_width" type="number" class="form-control input-normal" id="bit_width" min=12 max=32 value=12 style="width: 30%;">
    </div>
  </form>
</div>
`
};

const gettingStartedTemplate = {
    html: `
<div class="container gl_container" id="instructions">
  <h3>Instructions</h3>
  <p>
      Adjust the available parameters for your design exploration project. To download your configured BRISC-V core, navigate to the "Downloads" tab and then click "Download Project".
  </p>
  <p>
      Simulation or Synthesis should be started from the downloaded project directory to ensure the relative paths to included memory files are valid. You may have to change the relative paths in the top level module parameters if you start simulation or synthesis in a different location.
  </p>
</div>
`
};

const memorySettingsTemplate = {
    html: `
<div class="container gl_container" id="memory_settings">
  <h3>Memory Subsystem Configuration</h3>
  <hr>
  <h4>Cache Configuration</h4><br>
  <form>
    <div class="form-group">
      <label for="num_cores">Number of Cache Levels</label>
      <input type="number" class="form-control input-normal" id="num_cache_levels" min=1 max=2 value=2 style="width: 30%;"><br>
    <div class="form-group">
      <label for="inclusion_sel">Cache Inclusion Policy</label><br>
      <select class="selectpicker" id="inclusion_sel">
      	<option>Inclusive</option>
        <option>Exclusive</option>
      </select>
    </div>
    <div class="form-group">
      <label for="num_words">Line Size</label>
      <input type="number" class="form-control input-normal" id="line_size" min=1 value=8 style="width: 30%;">
    </div>
    <hr>
    <h4>L1 Cache Configuration</h4><br >
    <div class="form-group">
      <label for="associativity_sel_l1">Associativity</label><br>
      <select class="selectpicker" id="associativity_sel_l1">
      	<option value=2>2-way set associative</option>
      </select>
    </div>
    <div class="form-group">
      <label for="num_indexes_l1">Number of Indexes</label>
      <input type="number" class="form-control input-normal" id="num_indexes_l1" min=1 value=64 style="width: 30%;">
    </div>
    <hr>
    <h4>L2 Cache Configuration</h4><br >
    <div class="form-group">
      <label for="associativity_sel_l2">Associativity</label><br>
      <select class="selectpicker" id="associativity_sel_l2">
      	<option>2-way set associative</option>
      </select>
    </div>
    <div class="form-group">
      <label for="num_indexes_l2">Number of Indexes</label>
      <input type="number" class="form-control input-normal" id="num_indexes_l2" min=1 value=64 style="width: 30%;">
    </div>
    <hr>
    <h4>Main Memory Configuration</h4>
    </div>
    <div class="form-group">
      <label for="num_words">Capacity (in 4 byte words)</label>
      <input type="number" class="form-control input-normal" id="num_words" min=4096  value=4096 style="width: 30%;">
    </div>
  </form>
</div>
`
};

const downloadsTemplate = {
    html: `
<div class="container gl_container" id="downloads">
   <h2>Project Downloads</h2>
   <br >
   <section id="project-section">
      <div class="download">
         <button class="download-button fas fa-file-code" id="download_project_button">
         Download Project
         </button>
         <p>
            <small class="download-desc">Download the configured Verilog RTL source code to your local machine.</small>
         </p>
      </div>
   </section>
   <hr>
   <section id="diagram-section">
      <div class="download">
         <button class="download-button fas fa-images" id="download_diagram_button">
         Download Diagram
         </button>
         <p>
            <small class="download-desc">Download the block diagram of the configured project as a PNG image.</small>
         </p>
      </div>
   </section>
   <hr>
   <section id="config-section">
      <div class="form-group">
         <label for="config_name">Configuration Name</label>
         <input type="text" class="form-control input-normal" id="config_name" value="explorer.ebv" spellcheck="false" style="width: 60%;">
      </div>
      <div class="download">
         <button class="download-button fas fa-cogs" id="download_config_button">
         Download Config
         </button>
         <p>
            <small class="download-desc">Save the current project configuration to your local machine.</small>
         </p>
      </div>
   </section>
</div>
`
};

const consoleWindowTemplate = {
    html: `<div id="messages"></div>`
};

const canvasTemplate = {
    html: `<div id="diagram_div" class="gl_container"></div>`
};

const projectSettingsTemplate = {
    html: `
<div class="container gl_container" id="project_settings">
      	 <h2>Project Settings</h2><hr>
         <div class="form-group">
            <label for="project_name">Project Name</label>
            <input type="text" class="form-control input-normal" id="project_name" value="Default_Project" spellcheck="false" style="width: 60%;">
         </div>
         <div class="custom-control custom-radio">
            <input type="radio" class="custom-control-input" id="factorial_radio" name="default_program" checked>
            <label class="custom-control-label" for="factorial_radio">Factorial</label><br>
         </div>
         <div class="custom-control custom-radio">
         	<input type="radio" class="custom-control-input" id="gcd_radio" name="default_program">
            <label class="custom-control-label" for="gcd_radio">Greatest Common Divisor</label><br>
         </div>
         <div class="custom-control custom-radio">
         	<input type="radio" class="custom-control-input" id="custom_radio" name="default_program">
            <label class="custom-control-label" for="custom_radio">Custom Program</label><br>
         </div>
         <div id="program_choose">
               <br ><input type="file" id="program" name="files" />
         </div><br >
         <div id="configuration_choose">
               <label for="program">Import Configuration</label><br>
               <input type="file" id="config" name="files" accept=".ebv" />
         </div>
      </div>
`
};


exports.canvas = canvasTemplate;
exports.downloads = downloadsTemplate;
exports.memorySettings = memorySettingsTemplate;
exports.consoleWindow = consoleWindowTemplate;
exports.coreSettings = coreSettingsTemplate;
exports.gettingStarted = gettingStartedTemplate;
exports.projectSettings = projectSettingsTemplate;