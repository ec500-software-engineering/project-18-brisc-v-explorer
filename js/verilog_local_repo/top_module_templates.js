var topModuleTemplate = {
    fileContent: `/** @module : PROJECT_NAME
 *  @author : Adaptive & Secure Computing Systems (ASCS) Laboratory

 *  Copyright (c) 2018 BRISC-V (ASCS/ECE/BU)
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.

 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 *
 */

module PROJECT_NAME #(
  parameter CORE = CORE_VALUE,
  parameter DATA_WIDTH = DATA_WIDTH_VALUE,
  parameter INDEX_BITS = INDEX_BITS_VALUE,
  parameter OFFSET_BITS = OFFSET_BITS_VALUE,
  parameter ADDRESS_BITS = ADDRESS_BITS_VALUE,
  parameter PROGRAM = "PROGRAM_PATH"
) (
  input clock,
  input reset,

  // Control ports to set arbitrary PCs
  input start,
  input [ADDRESS_BITS-1:0] prog_address,

  // For I/O funstions
  input [1:0]    from_peripheral,
  input [31:0]   from_peripheral_data,
  input from_peripheral_valid,

  // In-System Programmer - A port to write instruction memory
  input isp_write,
  input [ADDRESS_BITS-1:0] isp_address,
  input [DATA_WIDTH-1:0] isp_data,

  output [1:0]  to_peripheral,
  output [31:0] to_peripheral_data,
  output to_peripheral_valid,

  // Core debug ports
  input report,
  output [ADDRESS_BITS-1:0] current_PC
);

RISC_V_Core #(
  .CORE(CORE),
  .DATA_WIDTH(DATA_WIDTH),
  .INDEX_BITS(INDEX_BITS),
  .OFFSET_BITS(OFFSET_BITS),
  .ADDRESS_BITS(ADDRESS_BITS),
  .PROGRAM(PROGRAM)
) core0 (
  .clock(clock),
  .reset(reset),
  .start(start),
  .prog_address(prog_address),

  .isp_write(isp_write),
  .isp_address(isp_address),
  .isp_data(isp_data),

  .from_peripheral(from_peripheral),
  .from_peripheral_data(from_peripheral_data),
  .from_peripheral_valid(from_peripheral_valid),
  .to_peripheral(to_peripheral),
  .to_peripheral_data(to_peripheral_data),
  .to_peripheral_valid(to_peripheral_valid),

  .report(report),
  .current_PC(current_PC)
);

endmodule
`
};
var topModuleTestbenchTemplate = {
    fileContent: `/** @module : PROJECT_NAME_tb
 *  @author : Adaptive & Secure Computing Systems (ASCS) Laboratory

 *  Copyright (c) 2018 BRISC-V (ASCS/ECE/BU)
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.

 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 *
 */


module PROJECT_NAME_tb();

parameter CORE = CORE_VALUE;
parameter DATA_WIDTH = DATA_WIDTH_VALUE;
parameter INDEX_BITS = INDEX_BITS_VALUE;
parameter OFFSET_BITS = OFFSET_BITS_VALUE;
parameter ADDRESS_BITS = ADDRESS_BITS_VALUE;
parameter PROGRAM = "PROGRAM_PATH";


// These parameters are relative paths to their respecitive files.
// The path is relative to the directory that the simulation was started in.
// If you did not lauch the simulation from this directory, you will need to
// change these parameters.
parameter ZEROS4096 = "zeros4096.dat";
parameter ZEROS32 = "zeros32.dat";

reg clock;
reg reset;
reg start;
reg [ADDRESS_BITS-1:0] prog_address;
reg report; // performance reporting

wire [ADDRESS_BITS-1:0] Current_PC;

// For I/O functions
reg [1:0]    from_peripheral;
reg [31:0]   from_peripheral_data;
reg          from_peripheral_valid;

wire [1:0]  to_peripheral;
wire [31:0] to_peripheral_data;
wire        to_peripheral_valid;

PROJECT_NAME #(
  .CORE(CORE),
  .DATA_WIDTH(DATA_WIDTH),
  .INDEX_BITS(INDEX_BITS),
  .OFFSET_BITS(OFFSET_BITS),
  .ADDRESS_BITS(ADDRESS_BITS),
  .PROGRAM(PROGRAM)
) BRISC_V_inst (
  .clock(clock),
  .reset(reset),
  .start(start),
  .prog_address(prog_address),

  .isp_write(1'b0),
  .isp_address({ADDRESS_BITS{1'b0}}),
  .isp_data({DATA_WIDTH{1'b0}}),

  .from_peripheral(from_peripheral),
  .from_peripheral_data(from_peripheral_data),
  .from_peripheral_valid(from_peripheral_valid),
  .to_peripheral(to_peripheral),
  .to_peripheral_data(to_peripheral_data),
  .to_peripheral_valid(to_peripheral_valid),

  .report(report),
  .current_PC(Current_PC)
);

// Clock generator. Adjust to match your frequency.
always #1 clock = ~clock;

// Initialize memories
initial begin
  $readmemh(ZEROS4096, PROGRAM_MEMORY_VALUE );
  $readmemh(ZEROS32, REGISTER_FILE_VALUE);
  $readmemh(PROGRAM, PROGRAM_MEMORY_VALUE);
end


initial begin
  clock  = 1;
  reset  = 1;
  report = 0;
  start = 0;
  prog_address = {ADDRESS_BITS{1'b0}};
  #10

  #1
  reset = 0;
  start = 1;
  #1

  start = 0;

end

endmodule
`
};

exports.topModule = topModuleTemplate;
exports.topModuleTb = topModuleTestbenchTemplate;