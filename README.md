## The BRISC-V Explorer

### Overview:
The BRISC-V Toolbox is a set of tools to enable rapid design space exploration of single and multi-core RISC-V architectures. A part of this toolbox is the BRISC-V Explorer. The BRISC-V Explorer will support quick configuration of BRISC-V single or multi-core RISC-V processors with a Graphical User Interface (GUI). Main goal is to enable users to easily select configuration parameters for the systems’ processing cores, cache system, on-chip network (NoC) and main memory. The Explorer will visualize the configured system and output RTL code to implement the user specified system.

### Required Features:
- Cross Platform
     - The BRISC-V Explorer must be supported on recent versions of Windows, Linux and Mac. 
     - To achieve cross platform compatibility, The Explorer must run in a web browser (primarily chrome).
- User Inputs
     - Users must be able to input parameters for each of the verilog parameters available in the BRISC-V verilog source code.
     - Users must be able to load a configuration from saved configurations.
- Visualization
   - Each parameter input by the user must be visualized in a block diagram of the BRISC-V single or multi-core system
      - The selected BRISC-V Core must be visualized
      - The selected cache hierarchy must be visualized
      - The selected NoC Router configuration must be visualized
   - The GUI should be broken into three panes:
      - Top Left - Configuration options - Here is where the user enters parameters for their system. This section should have multiple tabs for different types of parameters.
      - Top Right - Visualization - Here is where the configured system is visualized in a block diagram.
      - Bottom - Output Console - Here is where feedback is given to the user. Logs of user actions and any warnings or error messages should be printed here.
- Outputs
   - The Explorer must support a well defined project directory structure.
   - BRISC-V verilog RTL code must be the output when the user saves their configured system.
   - A project/configuration file must be output with the BRISC-V RTL.
   - A document describing the configuration of the generated system should also be available in the output. This could be done with a human readable project/configuration file or a separate README file.
   - A visualization of the system should be included in the output as a png or other common image format
