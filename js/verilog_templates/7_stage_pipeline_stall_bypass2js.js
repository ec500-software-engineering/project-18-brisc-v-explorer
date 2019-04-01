function get_seven_stage_pipeline_stall_bypass_dummy_cache(zip) {
  var file_content =`module dummy_cache #(
    parameter CORE = 0,
    parameter DATA_WIDTH = 32,
    parameter ADDRESS_BITS = 12,
    parameter PROGRAM = "../software/applications/binaries/<your_program>",
    parameter MISS_THRESHOLD = 3,
    parameter HIT_THRESHOLD = 3
) (

    input clock,
    input reset,

    input read,
    input write,
    input [ADDRESS_BITS-1:0] address,
    input [DATA_WIDTH-1:0] in_data,

    output reg valid,
    output reg ready,
    output [ADDRESS_BITS-1:0] out_addr,
    output [DATA_WIDTH-1:0] out_data

);

localparam CACHE_HIT   = 8'd0;
localparam CACHE_MISS = 8'd1;

reg [7:0] count;
reg [7:0] state;

wire [DATA_WIDTH-1:0] bram_read_data;
wire [DATA_WIDTH-1:0] bram_write_data;

assign bram_write_data = in_data;
assign out_data = valid ? bram_read_data : {DATA_WIDTH{1'b0}};

always@(posedge clock) begin
  if (reset) begin
        ready <= 1'b0;
        valid <= 1'b0;
        count <= 8'd0;
        state <= CACHE_HIT;
  end else begin
    case(state)
      CACHE_HIT: begin
        ready <= 1'b1;
        valid <= write; 
        count <= count > HIT_THRESHOLD ? 8'd0 : count + 8'd1;
        state <= count > HIT_THRESHOLD ? CACHE_MISS : CACHE_HIT;
      end
      CACHE_MISS: begin
        ready <= 1'b0;
        valid <= 1'b0;
        count <= count > MISS_THRESHOLD ? 8'd0 : count + 8'd1;
        state <= count > MISS_THRESHOLD ? CACHE_HIT : CACHE_MISS;
      end
      default: begin
        ready <= 1'b0;
        valid <= 1'b0;
        count <= 8'd0;
        state <= state;
      end
    endcase
  end
end

BRAM #(
    .DATA_WIDTH(DATA_WIDTH),
    .ADDR_WIDTH(ADDRESS_BITS),
    .INIT_FILE(PROGRAM)
) RAM (
        .clock(clock),
        .readEnable(read_enable),
        .readAddress(address),
        .readData(bram_read_data),

        .writeEnable(write_enable),
        .writeAddress(address),
        .writeData(bram_write_data)
);



endmodule
`;
  zip.file('dummy_cache.v', file_content);
}

function get_seven_stage_pipeline_stall_bypass_i_mem_interface(zip) {
  var file_content =`/** @module : i_memory_interface
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
 */

module i_mem_interface #(
  parameter CORE = 0,
  parameter DATA_WIDTH = 32,
  parameter INDEX_BITS = 6,
  parameter OFFSET_BITS = 3,
  parameter ADDRESS_BITS = 11,
  parameter PROGRAM = "../software/applications/binaries/<your_program>"
) (
  input clock,
  input reset,

  input read,
  input write,
  input [ADDRESS_BITS-1:0] read_address,
  input [ADDRESS_BITS-1:0] write_address,
  input [DATA_WIDTH-1:0] in_data,

  output valid,
  output ready,
  output [ADDRESS_BITS-1:0] out_addr,
  output [DATA_WIDTH-1:0] out_data,

  input  report

);

reg [ADDRESS_BITS-1:0] read_address_reg;

BSRAM #(
  .DATA_WIDTH(DATA_WIDTH),
  .ADDR_WIDTH(ADDRESS_BITS),
  .INIT_FILE(PROGRAM)
) RAM (
  .clock(clock),
  // Read
  .readEnable(1'b1), // Read signal checked at addr reg
  .readAddress(read_address_reg),
  .readData(out_data),
  // Write
  .writeEnable(write),
  .writeAddress(write_address),
  .writeData(in_data),

  .report(report)
);

assign out_addr = read_address_reg;

// TODO: Remove write condition from valid/ready signals
assign valid =  (read | write);
assign ready = !(read | write); // Just for testing now

// This logic stalls read address when readEnable is low. This is opposed to
// the old version which did not stall read address and set readData to 0.
// Stalling read address (and therefore readData) allows the pipeline to
// stall the whole BRAM memory stage.
always@(posedge clock) begin
  if(reset) begin
    read_address_reg <= {ADDRESS_BITS{1'b0}};
  end else begin
    read_address_reg <= read ? read_address : read_address_reg;
  end
end

reg [31: 0] cycles;
always @ (posedge clock) begin
  cycles <= reset? 0 : cycles + 1;
  if (report)begin
    $display ("------ Core %d Memory Interface - Current Cycle %d --", CORE, cycles);
    $display ("| Rd Address  [%h]", read_address);
    $display ("| Wr Address  [%h]", write_address);
    $display ("| Read        [%b]", read);
    $display ("| Write       [%b]", write);
    $display ("| Out Data    [%h]", out_data);
    $display ("| In Data     [%h]", in_data);
    $display ("| Ready       [%b]", ready);
    $display ("| Valid       [%b]", valid);
    $display ("----------------------------------------------------------------------");
  end
end

endmodule

`;
  zip.file('i_mem_interface.v', file_content);
}

function get_seven_stage_pipeline_stall_bypass_writeback(zip) {
  var file_content =`/** @module : writeback
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
 */
module writeback_unit #(
  parameter CORE = 0,
  parameter DATA_WIDTH = 32,
  parameter PRINT_CYCLES_MIN = 1,
  parameter PRINT_CYCLES_MAX = 1000
) (
  input clock,
  input reset,
  input stall,
  input opWrite,
  input opSel,
  input [4:0] opReg,
  input [DATA_WIDTH-1:0] ALU_Result,
  input [DATA_WIDTH-1:0] memory_data,

  output write,
  output [4:0] write_reg,
  output [DATA_WIDTH-1:0] write_data,

  input report

);

assign write_data = opSel ? memory_data : ALU_Result;
assign write_reg  = opReg;
assign write      = opWrite;

reg [31: 0] cycles;
always @ (posedge clock) begin
  cycles <= reset? 0 : cycles + 1;
  //if (report & ((cycles >=  PRINT_CYCLES_MIN) & (cycles < PRINT_CYCLES_MAX +1)))begin
  if (report)begin
    $display ("------ Core %d Writeback Unit - Current Cycle %d ----", CORE, cycles);
    $display ("| opSel       [%b]", opSel);
    $display ("| opReg       [%b]", opReg);
    $display ("| ALU_Result  [%d]", ALU_Result);
    $display ("| Memory_data [%d]", memory_data);
    $display ("| write       [%b]", write);
    $display ("| write_reg   [%d]", write_reg);
    $display ("| write_data  [%d]", write_data);
    $display ("----------------------------------------------------------------------");
  end
end

endmodule

`;
  zip.file('writeback.v', file_content);
}

function get_seven_stage_pipeline_stall_bypass_memory_hierarchy(zip) {
  var file_content =`module memory_hierarchy #(
  parameter CORE = 0,
  parameter DATA_WIDTH = 32,
  parameter INDEX_BITS = 6,
  parameter OFFSET_BITS = 3,
  parameter ADDRESS_BITS = 11,
  parameter PROGRAM = "../software/applications/binaries/<your_program>"
) (

  input clock,
  input reset,

  // Instruction Memory Interface
  input i_mem_read,
  input [ADDRESS_BITS-1:0] i_mem_read_address,
  output [ADDRESS_BITS-1:0] i_mem_out_addr,
  output [DATA_WIDTH-1:0] i_mem_out_data,
  output i_mem_valid,
  output i_mem_ready,

  // In-System Programmer Interface
  input [ADDRESS_BITS-1:0] isp_address,
  input [DATA_WIDTH-1:0] isp_data,
  input isp_write,


  output [ADDRESS_BITS-1:0] d_mem_out_addr,
  output [DATA_WIDTH-1:0] d_mem_out_data,
  output d_mem_valid,
  output d_mem_ready,
  input [ADDRESS_BITS-1:0] d_mem_address,
  input [DATA_WIDTH-1:0] d_mem_in_data,
  input d_mem_read,
  input d_mem_write,

  input report

);

i_mem_interface #(
  .CORE(CORE),
  .DATA_WIDTH(DATA_WIDTH),
  .INDEX_BITS(INDEX_BITS),
  .OFFSET_BITS(OFFSET_BITS),
  .ADDRESS_BITS(ADDRESS_BITS),
  .PROGRAM(PROGRAM)
) i_mem_interface0 (
  .clock(clock),
  .reset(reset),
  .write(isp_write),
  .write_address(isp_address),
  .in_data(isp_data),
  .read(i_mem_read),
  .read_address(i_mem_read_address),
  .out_addr(i_mem_out_addr),
  .out_data(i_mem_out_data),
  .valid(i_mem_valid),
  .ready(i_mem_ready),
  .report(report)
);


d_mem_interface #(
    .CORE(CORE),
    .DATA_WIDTH(DATA_WIDTH),
    .INDEX_BITS(INDEX_BITS),
    .OFFSET_BITS(OFFSET_BITS),
    .ADDRESS_BITS(ADDRESS_BITS)
) d_mem_interface0 (
    .clock(clock),
    .reset(reset),
    .read(d_mem_read),
    .write(d_mem_write),
    .address(d_mem_address),
    .in_data(d_mem_in_data),
    .out_addr(d_mem_out_addr),
    .out_data(d_mem_out_data),
    .valid(d_mem_valid),
    .ready(d_mem_ready),
    .report(report)
);

endmodule
`;
  zip.file('memory_hierarchy.v', file_content);
}

function get_seven_stage_pipeline_stall_bypass_zeros32(zip) {
  var file_content =`@00000000
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
`;
  zip.file('zeros32.dat', file_content);
}

function get_seven_stage_pipeline_stall_bypass_test_wrapper(zip) {
  var file_content =`/** @module : i_memory_interface
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
 */

module test_wrapper #(
    parameter CORE = 0,
    parameter DATA_WIDTH = 32,
    parameter INDEX_BITS = 6,
    parameter OFFSET_BITS = 3,
    parameter ADDRESS_BITS = 11,
    parameter PROGRAM = "../software/applications/binaries/<your_program>"
) (

    input clock,
    input reset,

    input read,
    input write,
    input [ADDRESS_BITS-1:0] read_address,
    input [ADDRESS_BITS-1:0] write_address,
    input [DATA_WIDTH-1:0] in_data,

    output reg [DATA_WIDTH-1:0] out_data


);

reg read_reg;
reg write_reg;
reg [ADDRESS_BITS-1:0] read_address_reg;
reg [ADDRESS_BITS-1:0] write_address_reg;
reg [DATA_WIDTH-1:0] in_data_reg;

BRAM #(
//BRAM_ADDRESS_STALL #(
    .DATA_WIDTH(DATA_WIDTH),
    .ADDR_WIDTH(ADDRESS_BITS),
    .INIT_FILE(PROGRAM)
) RAM (
        .clock(clock),
        .readEnable(read_reg),
        .readAddress(read_address_reg),
        .readData(out_data_wire),

        .writeEnable(write_reg),
        .writeAddress(write_address_reg),
        .writeData(in_data_reg)
);


always@(posedge clock) begin
  read_reg <= read;
  write_reg <= write;
  read_address_reg <= read_address;
  out_data <= out_data_wire;
  write_reg <= write;
  write_address_reg <= write_address;
  in_data_reg <= in_data;
end

endmodule

`;
  zip.file('test_wrapper.v', file_content);
}

function get_seven_stage_pipeline_stall_bypass_stallControl(zip) {
  var file_content =`/*  @author : Adaptive & Secure Computing Systems (ASCS) Laboratory

 *  Copyright (c) 2018 BRISC-V (ASCS/ECE/BU)
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 z
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 *
 *
 */

/*********************************************************************************
*                              stallControl.v                                    *
*********************************************************************************/


module stall_and_bypass_control_unit (
  input clock,
  input [4:0] rs1,
  input [4:0] rs2,
  input regwrite_execute,
  input regwrite_memory1,
  input regwrite_memory2,
  input regwrite_writeback,
  input [4:0] rd_execute,
  input [4:0] rd_memory1,
  input [4:0] rd_memory2,
  input [4:0] rd_writeback,
  input [6:0] opcode_execute,
  input [6:0] opcode_memory1,

  output [2:0] rs1_data_bypass,
  output [2:0] rs2_data_bypass,
  output stall
);


wire rs1_stall_detected;
wire rs2_stall_detected;
wire stall_detected;

wire rs1_hazard_execute;
wire rs1_hazard_memory1;
wire rs1_hazard_memory2;
wire rs1_hazard_writeback;
wire rs1_load_hazard_execute;
wire rs1_load_hazard_memory1;
wire rs1_load_hazard;

wire rs2_hazard_execute;
wire rs2_hazard_memory1;
wire rs2_hazard_memory2;
wire rs2_hazard_writeback;
wire rs2_load_hazard_execute;
wire rs2_load_hazard_memory1;
wire rs2_load_hazard;

wire load_opcode_in_execute;
wire load_opcode_in_memory1;

localparam [6:0] LOAD = 7'b0000011;

// Detect hazards between decode and other stages
assign load_opcode_in_execute = opcode_execute == LOAD;
assign load_opcode_in_memory1 = opcode_memory1 == LOAD;

assign rs1_hazard_execute     = (rs1 == rd_execute   ) &  regwrite_execute  ;
assign rs1_hazard_memory1     = (rs1 == rd_memory1   ) &  regwrite_memory1  ;
assign rs1_hazard_memory2     = (rs1 == rd_memory2   ) &  regwrite_memory2  ;
assign rs1_hazard_writeback   = (rs1 == rd_writeback ) &  regwrite_writeback;

assign rs2_hazard_execute     = (rs2 == rd_execute   ) &  regwrite_execute  ;
assign rs2_hazard_memory1     = (rs2 == rd_memory1   ) &  regwrite_memory1  ;
assign rs2_hazard_memory2     = (rs2 == rd_memory2   ) &  regwrite_memory2  ;
assign rs2_hazard_writeback   = (rs2 == rd_writeback ) &  regwrite_writeback;

// TODO: Add read enable to detect true reads. Not every instruction reads
// both registers.
assign rs1_load_hazard_execute = rs1_hazard_execute & load_opcode_in_execute;
assign rs1_load_hazard_memory1 = rs1_hazard_memory1 & load_opcode_in_memory1;
assign rs1_load_hazard         = rs1_load_hazard_execute | rs1_load_hazard_memory1 ;
assign rs1_stall_detected      = rs1_load_hazard & (rs1 != 5'd0);

assign rs2_load_hazard_execute = rs2_hazard_execute & load_opcode_in_execute;
assign rs2_load_hazard_memory1 = rs2_hazard_memory1 & load_opcode_in_memory1;
assign rs2_load_hazard         = rs2_load_hazard_execute | rs2_load_hazard_memory1 ;
assign rs2_stall_detected      = rs2_load_hazard & (rs2 != 5'd0);

//stall on a loadword and rd overlap
assign stall_detected = rs1_stall_detected | rs2_stall_detected;

// The "Bonus" stall cycle has been removed.
assign stall = stall_detected;

//data bypassing to decode rs mux
assign rs1_data_bypass = (rs1_hazard_execute   & !stall) ? 3'b001 :
                         (rs1_hazard_memory1   & !stall) ? 3'b010 :
                         (rs1_hazard_memory2   & !stall) ? 3'b011 :
                         (rs1_hazard_writeback & !stall) ? 3'b100 :
                         3'b000;

assign rs2_data_bypass = (rs2_hazard_execute   & !stall) ? 3'b001 :
                         (rs2_hazard_memory1   & !stall) ? 3'b010 :
                         (rs2_hazard_memory2   & !stall) ? 3'b011 :
                         (rs2_hazard_writeback & !stall) ? 3'b100 :
                         3'b000;

endmodule
`;
  zip.file('stallControl.v', file_content);
}

function get_seven_stage_pipeline_stall_bypass_bsram(zip) {
  var file_content =`/** @module : BSRAM
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
 */

//Same cycle read memory access

// (//* ram_style = "block" *//)
module BSRAM #(
  parameter CORE = 0,
  parameter DATA_WIDTH = 32,
  parameter ADDR_WIDTH = 8,
  parameter INIT_FILE = "../software/applications/binaries/zeros4096.dat",   //  memory needs to be prefilled with zeros
  parameter PRINT_CYCLES_MIN = 1,
  parameter PRINT_CYCLES_MAX = 1000
) (
  input clock,
  input readEnable,
  input [ADDR_WIDTH-1:0]   readAddress,
  output [DATA_WIDTH-1:0]  readData,
  input writeEnable,
  input [ADDR_WIDTH-1:0]   writeAddress,
  input [DATA_WIDTH-1:0]   writeData,
  input report
);

localparam MEM_DEPTH = 1 << ADDR_WIDTH;

reg [DATA_WIDTH-1:0] sram [0:MEM_DEPTH-1];

assign readData = (readEnable & writeEnable & (readAddress == writeAddress))?
                  writeData : readEnable? sram[readAddress] : 0;

initial begin
    $readmemh(INIT_FILE, sram);
end

always@(posedge clock) begin : RAM_WRITE
  if(writeEnable)
    sram[writeAddress] <= writeData;
end

/*
always @ (posedge clock) begin
  //if (report & ((cycles >=  PRINT_CYCLES_MIN) & (cycles < PRINT_CYCLES_MAX +1)))begin
  if (report)begin
    $display ("------ Core %d SBRAM Unit - Current Cycle %d --------", CORE, cycles);
    $display ("| Read        [%b]", readEnable);
    $display ("| Read Address[%h]", readAddress);
    $display ("| Read Data   [%h]", readData);
    $display ("| Write       [%b]", writeEnable);
    $display ("| Write Addres[%h]", writeAddress);
    $display ("| Write Data  [%h]", writeData);
    $display ("----------------------------------------------------------------------");
  end
end
*/

endmodule

`;
  zip.file('bsram.v', file_content);
}

function get_seven_stage_pipeline_stall_bypass_ALU(zip) {
  var file_content =`/** @module : ALU
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
 */

module ALU #(parameter DATA_WIDTH = 32)(
        ALU_Control,
        operand_A, operand_B,
        ALU_result, zero, branch
);
input [5:0] ALU_Control;
input [DATA_WIDTH-1:0]  operand_A ;
input [DATA_WIDTH-1:0]  operand_B ;
output zero, branch;
output [DATA_WIDTH-1:0] ALU_result;


wire [4:0] shamt;
wire signed [DATA_WIDTH-1:0] signed_operand_A;
wire signed [DATA_WIDTH-1:0] signed_operand_B;

// wires for signed operations
wire [(DATA_WIDTH*2)-1:0] arithmetic_right_shift_double;
wire [DATA_WIDTH-1:0] arithmetic_right_shift;
wire signed [DATA_WIDTH-1:0] signed_less_than;
wire signed [DATA_WIDTH-1:0] signed_greater_than_equal;

assign shamt = operand_B [4:0]; // I_immediate[4:0];

assign signed_operand_A = operand_A;
assign signed_operand_B = operand_B;

assign zero   = (ALU_result==0);
assign branch = (ALU_Control[4:3] == 2'b10) & (ALU_result == 1'b1);

// Signed Operations
assign arithmetic_right_shift_double = ({ {DATA_WIDTH{operand_A[DATA_WIDTH-1]}}, operand_A }) >> shamt;
assign arithmetic_right_shift        = arithmetic_right_shift_double[DATA_WIDTH-1:0];
assign signed_less_than              = signed_operand_A < signed_operand_B;
assign signed_greater_than_equal     = signed_operand_A >= signed_operand_B;

assign ALU_result =
            (ALU_Control == 6'b000_000)? operand_A + operand_B:                /* ADD, ADDI*/
            (ALU_Control == 6'b001_000)? operand_A - operand_B:                /* SUB */
            (ALU_Control == 6'b000_100)? operand_A ^ operand_B:                /* XOR, XORI*/
            (ALU_Control == 6'b000_110)? operand_A | operand_B:                /* OR, ORI */
            (ALU_Control == 6'b000_111)? operand_A & operand_B:                /* AND, ANDI */
            (ALU_Control == 6'b000_010)? signed_less_than:                     /* SLT, SLTI */
            (ALU_Control == 6'b000_011)? operand_A < operand_B:                /* SLTU, SLTIU */
            (ALU_Control == 6'b000_001)? operand_A << shamt:                   /* SLL, SLLI => 0's shifted in from right */
            (ALU_Control == 6'b000_101)? operand_A >> shamt:                   /* SRL, SRLI => 0's shifted in from left */
            (ALU_Control == 6'b001_101)? arithmetic_right_shift:               /* SRA, SRAI => sign bit shifted in from left */
            (ALU_Control == 6'b011_111)? operand_A:                            /* operand_A = PC+4 for JAL   and JALR */
            (ALU_Control == 6'b010_000)? operand_A == operand_B:               /* BEQ */
            (ALU_Control == 6'b010_001)? operand_A != operand_B:               /* BNE */
            (ALU_Control == 6'b010_100)? signed_less_than:                     /* BLT */
            (ALU_Control == 6'b010_101)? signed_greater_than_equal:            /* BGE */
            (ALU_Control == 6'b010_110)? operand_A < operand_B:                /* BLTU */
            (ALU_Control == 6'b010_111)? operand_A >= operand_B:               /* BGEU */
            {DATA_WIDTH{1'b0}};
endmodule
`;
  zip.file('ALU.v', file_content);
}

function get_seven_stage_pipeline_stall_bypass_zeros4096(zip) {
  var file_content =`@00000000
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
00000000 
`;
  zip.file('zeros4096.dat', file_content);
}

function get_seven_stage_pipeline_stall_bypass_execute(zip) {
  var file_content =`/** @module : execute
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
 */

// 32-bit Exection
module execution_unit #(
  parameter CORE = 0,
  parameter DATA_WIDTH = 32,
  parameter ADDRESS_BITS = 20,
  parameter PRINT_CYCLES_MIN = 1,
  parameter PRINT_CYCLES_MAX = 1000
) (
  input clock,
  input reset,
  input stall,
  input [2:0] ALU_Operation,
  input [6:0] funct7,
  input [2:0] funct3,
  input [ADDRESS_BITS-1:0] PC,
  input [1:0] ALU_ASrc,
  input ALU_BSrc,
  input branch_op,
  input [DATA_WIDTH-1:0] regRead_1,
  input [DATA_WIDTH-1:0] regRead_2,
  input [DATA_WIDTH-1:0] extend,

  output zero,
  output branch,
  output [DATA_WIDTH-1:0] ALU_result,
  output [ADDRESS_BITS-1:0] JALR_target,

  input report
);

wire [5:0] ALU_Control;
wire [DATA_WIDTH-1:0] operand_A;
wire [DATA_WIDTH-1:0] operand_B;
wire ALU_branch;

assign ALU_Control = (ALU_Operation == 3'b011)?
                     6'b011_111      : //pass for JAL and JALR
                     (ALU_Operation == 3'b010)?
                     {3'b010,funct3} : //branches

                     //R Type instructions
                     ({ALU_Operation, funct7} == {3'b000, 7'b0000000})?
                     {3'b000,funct3} :
                     ({ALU_Operation, funct7} == {3'b000, 7'b0100000})?
                     {3'b001,funct3} :
                     (ALU_Operation == 3'b000)?
                     {3'b000,funct3} :

                     //I Type instructions
                     ({ALU_Operation, funct3, funct7} == {3'b001, 3'b101, 7'b0000000})?
                     {3'b000,funct3} :
                     ({ALU_Operation, funct3, funct7} == {3'b001, 3'b101, 7'b0100000})?
                     {3'b001,funct3} :
                     ({ALU_Operation, funct3} == {3'b001, 3'b101})?
                     {3'b000,funct3} :
                     (ALU_Operation == 3'b001)?
                     {3'b000,funct3} :
                     6'b000_000;      //addition


assign operand_A = (ALU_ASrc == 2'b01) ? PC     :
                   (ALU_ASrc == 2'b10) ? PC + 4 :
                   regRead_1;

assign operand_B = ALU_BSrc ? extend : regRead_2;
assign branch    = (ALU_branch & branch_op)? 1 : 0;

// Only JALR Target. JAL happens in the decode unit
assign JALR_target = {regRead_1 + extend} & 32'hffff_fffe;


ALU #(DATA_WIDTH) EU (
        .ALU_Control(ALU_Control),
        .operand_A(operand_A),
        .operand_B(operand_B),
        .ALU_result(ALU_result),
        .zero(zero),
        .branch(ALU_branch)
);

reg [31: 0] cycles;
always @ (posedge clock) begin
    cycles <= reset? 0 : cycles + 1;
    //if (report & ((cycles >=  PRINT_CYCLES_MIN) & (cycles < PRINT_CYCLES_MAX +1)))begin
    if (report)begin
        $display ("------ Core %d Execute Unit - Current Cycle %d ------", CORE, cycles);
        $display ("| ALU_Operat  [%b]", ALU_Operation);
        $display ("| funct7      [%b]", funct7);
        $display ("| funct3      [%b]", funct3);
        $display ("| ALU_Control [%b]", ALU_Control);
        $display ("| operand_A   [%h]", operand_A);
        $display ("| operand_B   [%h]", operand_B);
        $display ("| Zero        [%b]", zero);
        $display ("| Branch      [%b]", branch);
        $display ("| ALU_result  [%h]", ALU_result);
        //$display ("| JALR_taget  [%h]", JALR_target);
        $display ("----------------------------------------------------------------------");
    end
end

endmodule
`;
  zip.file('execute.v', file_content);
}

function get_seven_stage_pipeline_stall_bypass_regFile(zip) {
  var file_content =`/** @module : regFile
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
 */

// Parameterized register file
module regFile #(
  parameter REG_DATA_WIDTH = 32,
  parameter REG_SEL_BITS   = 5
) (
  input clock,
  input reset,
  input wEn,
  input [REG_DATA_WIDTH-1:0] write_data,
  input [REG_SEL_BITS-1:0] read_sel1,
  input [REG_SEL_BITS-1:0] read_sel2,
  input [REG_SEL_BITS-1:0] write_sel,
  output [REG_DATA_WIDTH-1:0] read_data1,
  output [REG_DATA_WIDTH-1:0] read_data2


);

(* ram_style = "distributed" *)
reg [REG_DATA_WIDTH-1:0] register_file[0:(1<<REG_SEL_BITS)-1];

always @(posedge clock) begin
  if(reset==1)
    register_file[0] <= 0;
  else
    if (wEn & write_sel != 0) register_file[write_sel] <= write_data;
end

//----------------------------------------------------
// Drive the outputs
//----------------------------------------------------
assign read_data1 = register_file[read_sel1];
assign read_data2 = register_file[read_sel2];

// Note: This was for debugging with signal tap. It has been kept because
// removing it hurt synthesis results in Quartus Prime Lite 17.1. Without
// these lines the zero registers are not removed by the optimizations and the
// Fmax of the design is hurt because of the larger register file.
wire [31:0] r1;
assign r1 = register_file[1];
wire [31:0] r14;
assign r14 = register_file[14];
wire [31:0] r15;
assign r15 = register_file[15];

endmodule
`;
  zip.file('regFile.v', file_content);
}

function get_seven_stage_pipeline_stall_bypass_control_unit(zip) {
  var file_content =`/*  @author : Adaptive & Secure Computing Systems (ASCS) Laboratory

 *  Copyright (c) 2018 BRISC-V (ASCS/ECE/BU)
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 z
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 *
 *
 */

/*********************************************************************************
*                              control_unit.v                                    *
*********************************************************************************/


module control_unit #(
  parameter CORE = 0,
  PRINT_CYCLES_MIN = 1,
  PRINT_CYCLES_MAX = 1000
) (
  input clock,
  input reset,
  input [6:0] opcode,

  output branch_op,
  output memRead,
  output memtoReg,
  output [2:0] ALUOp,
  output memWrite,
  output [1:0] next_PC_sel,
  output [1:0] operand_A_sel,
  output operand_B_sel,
  output [1:0] extend_sel,
  output regWrite,

  input  report

);

localparam [6:0]R_TYPE  = 7'b0110011,
                I_TYPE  = 7'b0010011,
                STORE   = 7'b0100011,
                LOAD    = 7'b0000011,
                BRANCH  = 7'b1100011,
                JALR    = 7'b1100111,
                JAL     = 7'b1101111,
                AUIPC   = 7'b0010111,
                LUI     = 7'b0110111,
                FENCES  = 7'b0001111,
                SYSCALL = 7'b1110011;

assign regWrite      = (opcode == R_TYPE) | (opcode == I_TYPE) | (opcode == LOAD)  |
                       (opcode == JALR)   | (opcode == JAL)    | (opcode == AUIPC) |
                       (opcode == LUI);
assign memWrite      = (opcode == STORE);
assign branch_op     = (opcode == BRANCH);
assign memRead       = (opcode == LOAD);
assign memtoReg      = (opcode == LOAD);

assign ALUOp         = (opcode == R_TYPE)?  3'b000 :
                       (opcode == I_TYPE)?  3'b001 :
                       (opcode == STORE) ?  3'b101 :
                       (opcode == LOAD)  ?  3'b100 :
                       (opcode == BRANCH)?  3'b010 :
                       ((opcode == JALR)  | (opcode == JAL))? 3'b011 :
                       ((opcode == AUIPC) | (opcode == LUI))? 3'b110 : 3'b000;

assign operand_A_sel = (opcode == AUIPC) ?  2'b01 :
                       (opcode == LUI)   ?  2'b11 :
                       (opcode == JALR)  | (opcode == JAL) ?  2'b10 : 2'b00;

assign operand_B_sel = (opcode == I_TYPE) | (opcode == STORE) |
                       (opcode == LOAD)   | (opcode == AUIPC) |
                       (opcode == LUI);

assign extend_sel    = (opcode == I_TYPE) | (opcode == LOAD) ? 2'b00 :
                       (opcode == STORE)                     ? 2'b01 :
                       (opcode == AUIPC) | (opcode == LUI)   ? 2'b10 :
                       2'b00;

assign next_PC_sel   = (opcode == BRANCH) ? 2'b01 :
                       (opcode == JAL)    ? 2'b10 :
                       (opcode == JALR)   ? 2'b11 :
                       2'b00;

reg [31: 0] cycles;
always @ (posedge clock) begin
    cycles <= reset? 0 : cycles + 1;
    //if (report & ((cycles >=  PRINT_CYCLES_MIN) & (cycles < PRINT_CYCLES_MAX +1)))begin
    if (report)begin
        $display ("------ Core %d Control Unit - Current Cycle %d ------", CORE, cycles);
        $display ("| Opcode      [%b]", opcode);
        $display ("| Branch_op   [%b]", branch_op);
        $display ("| memRead     [%b]", memRead);
        $display ("| memtoReg    [%b]", memtoReg);
        $display ("| memWrite    [%b]", memWrite);
        $display ("| RegWrite    [%b]", regWrite);
        $display ("| ALUOp       [%b]", ALUOp);
        $display ("| Extend_sel  [%b]", extend_sel);
        $display ("| ALUSrc_A    [%b]", operand_A_sel);
        $display ("| ALUSrc_B    [%b]", operand_B_sel);
        $display ("| Next PC     [%b]", next_PC_sel);
        $display ("----------------------------------------------------------------------");
    end
end
endmodule
`;
  zip.file('control_unit.v', file_content);
}

function get_seven_stage_pipeline_stall_bypass_fetch(zip) {
  var file_content =`/** @module : fetch_unit
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
 */

module fetch_unit #(
  parameter CORE = 0,
  parameter DATA_WIDTH = 32,
  parameter INDEX_BITS = 6,
  parameter OFFSET_BITS = 3,
  parameter ADDRESS_BITS = 20,
  parameter PROGRAM = "../software/applications/binaries/<your_program>",
  parameter PRINT_CYCLES_MIN = 1,
  parameter PRINT_CYCLES_MAX = 1000
) (
  input clock,
  input reset,
  input start,
  input stall,
  input [1:0] next_PC_select_execute,
  input [ADDRESS_BITS-1:0] program_address,
  input [ADDRESS_BITS-1:0] JAL_target,
  input [ADDRESS_BITS-1:0] JALR_target,
  input branch,
  input [ADDRESS_BITS-1:0] branch_target,

  // Instruction Memory Interface (Fetch unit only reads)
  input [DATA_WIDTH-1:0] i_mem_out_data,
  // the address associated with current i_mem_out_data
  input [ADDRESS_BITS-1:0] i_mem_out_addr,
  input i_mem_valid,
  input i_mem_ready,
  output i_mem_read,
  output [ADDRESS_BITS-1:0] i_mem_read_address,


  output [DATA_WIDTH-1:0] instruction,
  output [ADDRESS_BITS-1:0] inst_PC,
  output reg valid,
  output reg ready,

  input report
);

localparam NOP = 32'h00000013;

reg fetch;
reg [ADDRESS_BITS-1:0] PC_reg;

wire [ADDRESS_BITS-1:0] PC_plus4;

assign i_mem_read         = fetch & ~stall;
assign PC_plus4           = PC_reg + 4;
assign i_mem_read_address = PC_reg >> 2;

assign inst_PC     = i_mem_out_addr << 2;
assign instruction = i_mem_out_data;

always @ (posedge clock) begin
  if (reset) begin
    fetch  <= 1'b0;
    PC_reg <= program_address;
  end else if (start) begin
    fetch  <= 1'b1;
    PC_reg <= program_address;
  end else if(stall) begin
    fetch  <= 1'b1;
    PC_reg <= PC_reg;
  end else begin
    fetch  <= 1'b1;
    PC_reg <= (next_PC_select_execute == 2'b11)           ? JALR_target   :
              (next_PC_select_execute == 2'b10)           ? JAL_target    :
              (next_PC_select_execute == 2'b01) & branch  ? branch_target :
              (next_PC_select_execute == 2'b01) & ~branch ? PC_reg - 8    :
              PC_plus4;
  end
end

// These don't do anyhting useful yet.
always@(posedge clock) begin
  if(reset) begin
    valid       <= 1'b0;
    ready       <= 1'b0;
  end else begin
    valid       <= i_mem_valid;
    ready       <= 1'b0; // hold low untill something needs this
  end
end

reg [31: 0] cycles;
always @ (posedge clock) begin
    cycles <= reset? 0 : cycles + 1;
    //if (report & ((cycles >=  PRINT_CYCLES_MIN) & (cycles < PRINT_CYCLES_MAX +1)))begin
    if (report)begin
        $display ("------ Core %d Fetch Unit - Current Cycle %d --------", CORE, cycles);
        $display ("| Prog_Address[%h]", program_address);
        $display ("| next_PC_select_execute[%b]", next_PC_select_execute);
        $display ("| PC_reg      [%h]", PC_reg);
        $display ("| PC_plus4    [%h]", PC_plus4);
        $display ("| JAL_target  [%h]", JAL_target);
        $display ("| JALR_target [%h]", JALR_target);
        $display ("| Branch      [%b]", branch);
        $display ("| branchTarget[%h]", branch_target);
        $display ("| Read        [%b]", fetch);
        $display ("| instruction [%h]", instruction);
        $display ("| inst_PC     [%h]", inst_PC);
        $display ("| Ready       [%b]", ready);
        $display ("| Valid       [%b]", valid);
        $display ("----------------------------------------------------------------------");
    end
end

endmodule
`;
  zip.file('fetch.v', file_content);
}

function get_seven_stage_pipeline_stall_bypass_fetch_pipe(zip) {
  var file_content =`/** @module : fetch_pipe_unit
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
 */
//////////////////////////////////////////////////////////////////////////////////

module fetch_pipe_unit #(
  parameter DATA_WIDTH = 32,
  parameter ADDRESS_BITS = 20
) (
  input clock,
  input reset,
  input stall,

  input [ADDRESS_BITS-1:0] inst_PC_fetch,
  input [DATA_WIDTH-1:0]   instruction_fetch,

  output reg [ADDRESS_BITS-1:0] inst_PC_decode,
  output reg [DATA_WIDTH-1:0]   instruction_decode
);

localparam NOP = 32'h00000013;

always @(posedge clock) begin
  if(reset) begin
    inst_PC_decode     <= {ADDRESS_BITS{1'b0}};
    instruction_decode <= NOP;
  end else begin
    inst_PC_decode     <= stall ? inst_PC_decode : inst_PC_fetch;
    instruction_decode <= stall ? instruction_decode : instruction_fetch;
  end
end

endmodule

`;
  zip.file('fetch_pipe.v', file_content);
}

function get_seven_stage_pipeline_stall_bypass_d_mem_interface(zip) {
  var file_content =`/** @module : d_memory_interface
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
 */

module d_mem_interface #(
    parameter CORE = 0,
    parameter DATA_WIDTH = 32,
    parameter INDEX_BITS = 6,
    parameter OFFSET_BITS = 3,
    parameter ADDRESS_BITS = 20
) (
    input clock,
    input reset,
    input read,
    input write,
    input [ADDRESS_BITS-1:0] address,
    input [DATA_WIDTH-1:0] in_data,


    output reg [ADDRESS_BITS-1:0] out_addr,
    output [DATA_WIDTH-1:0] out_data,
    output reg valid,
    output reg ready,

    input  report
);

BRAM #(
    .DATA_WIDTH(DATA_WIDTH),
    .ADDR_WIDTH(ADDRESS_BITS)
) RAM (
    .clock(clock),
    .readEnable(read),
    .readAddress(address),
    .readData(out_data),

    .writeEnable(write),
    .writeAddress(address),
    .writeData(in_data)
);

always@(posedge clock) begin
  if(reset) begin
    out_addr <= {ADDRESS_BITS{1'b0}};
    valid <= 1'b0;
    ready <= 1'b0;
  end else begin
    out_addr <= address;
    valid    <= read|write;
    ready    <= ~(read|write); // Just for testing now
  end
end


reg [31: 0] cycles;
always @ (posedge clock) begin
    cycles <= reset? 0 : cycles + 1;
    if (report)begin
        $display ("------ Core %d Memory Interface - Current Cycle %d --", CORE, cycles);

        $display ("| Address     [%h]", address);
        $display ("| Read        [%b]", read);
        $display ("| Write       [%b]", write);
        $display ("| Out Data    [%h]", out_data);
        $display ("| In Data     [%h]", in_data);
        $display ("| Ready       [%b]", ready);
        $display ("| Valid       [%b]", valid);
        $display ("----------------------------------------------------------------------");
    end
end

endmodule

`;
  zip.file('d_mem_interface.v', file_content);
}

function get_seven_stage_pipeline_stall_bypass_execute_pipe(zip) {
  var file_content =`/** @module : execute_pipe_unit
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
 */
//////////////////////////////////////////////////////////////////////////////////


module execute_pipe_unit #(
  parameter DATA_WIDTH = 32,
  parameter ADDRESS_BITS = 20
) (
  input clock,
  input reset,

  input [DATA_WIDTH-1:0] ALU_result_execute,
  input [DATA_WIDTH-1:0] store_data_execute,
  input [4:0] rd_execute,
  input [6:0] opcode_execute,
  input [1:0] next_PC_select_execute,
  input memRead_execute,
  input memWrite_execute,
  input regWrite_execute,
  input [DATA_WIDTH-1:0] instruction_execute,

  output reg [DATA_WIDTH-1:0] ALU_result_memory1,
  output reg [DATA_WIDTH-1:0] store_data_memory1,
  output reg [4:0] rd_memory1,
  output reg [6:0] opcode_memory1,
  output reg [1:0] next_PC_select_memory1,
  output reg memRead_memory1,
  output reg memWrite_memory1,
  output reg regWrite_memory1,
  output reg [DATA_WIDTH-1:0] instruction_memory1

);

localparam NOP = 32'h00000013;

always @(posedge clock) begin
  if(reset) begin
    ALU_result_memory1     <= {DATA_WIDTH{1'b0}};
    store_data_memory1     <= {DATA_WIDTH{1'b0}};
    rd_memory1             <= 5'b0;
    opcode_memory1         <= 7'b0;
    memRead_memory1        <= 1'b1;
    memWrite_memory1       <= 1'b0;
    next_PC_select_memory1 <= 2'b0;
    regWrite_memory1       <= 1'b0;
    instruction_memory1    <= NOP;
  end else begin
    ALU_result_memory1     <= ALU_result_execute;
    store_data_memory1     <= store_data_execute;
    rd_memory1             <= rd_execute;
    opcode_memory1         <= opcode_execute;
    memRead_memory1        <= memRead_execute;
    memWrite_memory1       <= memWrite_execute;
    next_PC_select_memory1 <= next_PC_select_execute;
    regWrite_memory1       <= regWrite_execute;
    instruction_memory1    <= instruction_execute;
  end
end

endmodule
`;
  zip.file('execute_pipe.v', file_content);
}

function get_seven_stage_pipeline_stall_bypass_bram(zip) {
  var file_content =`/** @module : BRAM
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
 */

//(//* ram_style = "block" *//) // Xilinx Synthesis Attrubute
module BRAM #(
  parameter DATA_WIDTH = 32,
  parameter ADDR_WIDTH = 8,
  parameter INIT_FILE = "NONE"
) (
  input clock,
  // Read Signals
  input readEnable,
  input [ADDR_WIDTH-1:0] readAddress,
  output [DATA_WIDTH-1:0] readData,
  // Write Signals
  input writeEnable,
  input [ADDR_WIDTH-1:0] writeAddress,
  input [DATA_WIDTH-1:0]writeData

);

localparam MEM_DEPTH = 1 << ADDR_WIDTH;

reg [ADDR_WIDTH-1:0] readAddress_reg;
reg [DATA_WIDTH-1:0] ram [0:MEM_DEPTH-1];

// Even with assign statment, reads are still synchronous because of
// registered readAddress. Quartus still infers BRAM with this.
assign readData = (writeEnable & (readAddress == writeAddress))?
                writeData : ram[readAddress_reg];

// This logic stalls read address when readEnable is low. This is opposed to
// the old version which did not stall read address and set readData to 0.
// Stalling read address (and therefore readData) allows the pipeline to
// stall the whole BRAM memory stage.
always@(posedge clock) begin : RAM_READ
  if (readEnable) begin
    readAddress_reg <= readAddress;
  end else begin
    readAddress_reg <= readAddress_reg;
  end
end

// Write Logic
always@(posedge clock) begin : RAM_WRITE
  if(writeEnable)
    ram[writeAddress] <= writeData;
end

initial begin
  if(INIT_FILE != "NONE") begin
    $readmemh(INIT_FILE, ram);
  end
end

/*
always @ (posedge clock) begin
  if(readEnable | writeEnable) begin
    $display ("-------------------------------BRAM-------------------------------------------");
    $display ("Read [%b]\t\t\tWrite [%b]", readEnable, writeEnable);
    $display ("Read Address [%h] \t\t Write Address [%h]", readAddress, writeAddress);
    $display ("Read Data [%h]", readData);
    $display ("Write Data [%h]",writeData);
    $display ("-----------------------------------------------------------------------------");
    end
 end
*/
endmodule

`;
  zip.file('bram.v', file_content);
}

function get_seven_stage_pipeline_stall_bypass_memory_pipe(zip) {
  var file_content =`/** @module : memory_pipe_unit
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
 */
//////////////////////////////////////////////////////////////////////////////////


module memory_pipe_unit #(
  parameter DATA_WIDTH   = 32,
  parameter ADDRESS_BITS = 20
) (
  input clock,
  input reset,

  input [DATA_WIDTH-1:0] ALU_result_memory1,
  input [DATA_WIDTH-1:0] load_data_memory2,
  input opwrite_memory1,
  input opSel_memory1,
  input [4:0] opReg_memory1,
  input [1:0] next_PC_select_memory1,
  input [DATA_WIDTH-1:0] instruction_memory1,

  output reg [DATA_WIDTH-1:0] ALU_result_writeback,
  output reg [DATA_WIDTH-1:0] load_data_writeback,
  output reg opwrite_writeback,
  output reg opSel_writeback,
  output reg [4:0] opReg_writeback,
  output reg [1:0] next_PC_select_writeback,
  output reg [DATA_WIDTH-1:0] instruction_writeback,

  output [DATA_WIDTH-1:0] bypass_data_memory2,
  output reg [1:0] next_PC_select_memory2,
  output reg opwrite_memory2,
  output reg [4:0] opReg_memory2
);

localparam NOP = 32'h00000013;

reg opSel_memory2;
reg [DATA_WIDTH-1:0] ALU_result_memory2;
reg [DATA_WIDTH-1:0] instruction_memory2;

assign bypass_data_memory2 = opSel_memory2 ? load_data_memory2 : ALU_result_memory2;

always @(posedge clock) begin
  if(reset) begin
    ALU_result_memory2       <= {DATA_WIDTH{1'b0}};
    opwrite_memory2          <= 1'b0;
    opSel_memory2            <= 1'b0;
    opReg_memory2            <= 5'b0;
    next_PC_select_memory2   <= 2'b00;
    instruction_memory2      <= NOP;

    ALU_result_writeback     <= {DATA_WIDTH{1'b0}};
    load_data_writeback      <= {DATA_WIDTH{1'b0}};
    opwrite_writeback        <= 1'b0;
    opSel_writeback          <= 1'b0;
    opReg_writeback          <= 5'b0;
    next_PC_select_writeback <= 2'b00;
    instruction_writeback    <= NOP;
  end else begin
    ALU_result_memory2       <= ALU_result_memory1;
    opwrite_memory2          <= opwrite_memory1;
    opSel_memory2            <= opSel_memory1;
    opReg_memory2            <= opReg_memory1;
    next_PC_select_memory2   <= next_PC_select_memory1;
    instruction_memory2      <= instruction_memory1;

    ALU_result_writeback     <= ALU_result_memory2;
    load_data_writeback      <= load_data_memory2;
    opwrite_writeback        <= opwrite_memory2;
    opSel_writeback          <= opSel_memory2;
    opReg_writeback          <= opReg_memory2;
    next_PC_select_writeback <= next_PC_select_memory2;
    instruction_writeback    <= instruction_memory2;
 end
end

endmodule
`;
  zip.file('memory_pipe.v', file_content);
}

function get_seven_stage_pipeline_stall_bypass_decode_pipe(zip) {
  var file_content =`/** @module : decode_pipe_unit
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
 */
//////////////////////////////////////////////////////////////////////////////////

module decode_pipe_unit #(
  parameter DATA_WIDTH = 32,
  parameter ADDRESS_BITS = 20
) (
  input clock, reset, stall,
  input [DATA_WIDTH-1:0] rs1_data_decode,
  input [DATA_WIDTH-1:0] rs2_data_decode,
  input [6:0] funct7_decode,
  input [2:0] funct3_decode,
  input [4:0] rd_decode,
  input [6:0] opcode_decode,
  input [DATA_WIDTH-1:0] extend_imm_decode,
  input [ADDRESS_BITS-1:0] branch_target_decode,
  input [ADDRESS_BITS-1:0] JAL_target_decode,
  input [ADDRESS_BITS-1:0] PC_decode,
  input branch_op_decode,
  input memRead_decode,
  input [2:0] ALUOp_decode,
  input memWrite_decode,
  input [1:0] next_PC_select_decode,
  input [1:0] next_PC_select_memory1,
  input [1:0] next_PC_select_memory2,
  input [1:0] operand_A_sel_decode,
  input operand_B_sel_decode,
  input regWrite_decode,
  input [DATA_WIDTH-1:0] instruction_decode,

  output reg [DATA_WIDTH-1:0] rs1_data_execute,
  output reg [DATA_WIDTH-1:0] rs2_data_execute,
  output reg [6:0] funct7_execute,
  output reg [2:0] funct3_execute,
  output reg [4:0] rd_execute,
  output reg [6:0] opcode_execute,
  output reg [DATA_WIDTH-1:0] extend_imm_execute,
  output reg [ADDRESS_BITS-1:0] branch_target_execute,
  output reg [ADDRESS_BITS-1:0] JAL_target_execute,
  output reg [ADDRESS_BITS-1:0] PC_execute,
  output reg branch_op_execute,
  output reg memRead_execute,
  output reg [2:0] ALUOp_execute,
  output reg memWrite_execute,
  output reg [1:0] next_PC_select_execute,
  output reg [1:0] operand_A_sel_execute,
  output reg operand_B_sel_execute,
  output reg regWrite_execute,
  output reg [DATA_WIDTH-1:0] instruction_execute
);

localparam NOP = 32'h00000013;

wire bubble;

// Note: Breaking up stall and next_PC_select conditions into different
// if/else statments added 0.2MHz to Fmax but used ~15 more logic elements.
// For readability, they are combined into a single if condition.
assign bubble = (next_PC_select_execute != 2'b00) ||
                (next_PC_select_memory1 != 2'b00) ||
                (next_PC_select_memory2 != 2'b00) ||
                stall;

always @(posedge clock) begin
  if(reset) begin
    rs1_data_execute       <= {DATA_WIDTH{1'b0}};
    rs2_data_execute       <= {DATA_WIDTH{1'b0}};
    funct7_execute         <= 7'b0;
    funct3_execute         <= 3'b0;
    rd_execute             <= 5'b0;
    opcode_execute         <= 7'b0;
    extend_imm_execute     <= {DATA_WIDTH{1'b0}};
    branch_target_execute  <= {ADDRESS_BITS{1'b0}};
    JAL_target_execute     <= {ADDRESS_BITS{1'b0}};
    PC_execute             <= {ADDRESS_BITS{1'b0}};
    branch_op_execute      <= 1'b0;
    memRead_execute        <= 1'b0;
    ALUOp_execute          <= 3'b0;
    memWrite_execute       <= 1'b0;
    next_PC_select_execute <= 2'b0;
    operand_A_sel_execute  <= 2'b0;
    operand_B_sel_execute  <= 1'b0;
    regWrite_execute       <= 1'b0;
    instruction_execute    <= NOP;
  end else if(bubble) begin
    // Send ADDI zero zero 0
    rs1_data_execute       <= 5'd0;
    rs2_data_execute       <= 5'd0;
    funct7_execute         <= 7'd0;
    funct3_execute         <= 3'd0;
    rd_execute             <= 5'd0;
    opcode_execute         <= 7'h13; // ADDi
    branch_target_execute  <= {ADDRESS_BITS{1'b0}};
    JAL_target_execute     <= {ADDRESS_BITS{1'b0}};
    branch_op_execute      <= 1'b0;
    memRead_execute        <= 1'b0;
    ALUOp_execute          <= 3'd1; // I type
    memWrite_execute       <= 1'b0;
    next_PC_select_execute <= 2'd0;
    operand_A_sel_execute  <= 2'd0;
    operand_B_sel_execute  <= 1'b1; // 1 for I type
    regWrite_execute       <= 1'b1; // Decoded as 1, regfile prevents actual write
    extend_imm_execute     <= {DATA_WIDTH{1'b0}};
    PC_execute             <= {ADDRESS_BITS{1'b0}}; // should be held constant in fetch
    instruction_execute    <= NOP;
  end else begin
    rs1_data_execute       <= rs1_data_decode;
    rs2_data_execute       <= rs2_data_decode;
    funct7_execute         <= funct7_decode;
    funct3_execute         <= funct3_decode;
    rd_execute             <= rd_decode;
    opcode_execute         <= opcode_decode;
    branch_target_execute  <= branch_target_decode;
    JAL_target_execute     <= JAL_target_decode;
    branch_op_execute      <= branch_op_decode;
    memRead_execute        <= memRead_decode;
    ALUOp_execute          <= ALUOp_decode;
    memWrite_execute       <= memWrite_decode;
    next_PC_select_execute <= next_PC_select_decode;
    operand_A_sel_execute  <= operand_A_sel_decode;
    operand_B_sel_execute  <= operand_B_sel_decode;
    regWrite_execute       <= regWrite_decode;
    extend_imm_execute     <= extend_imm_decode;
    PC_execute             <= PC_decode;
    // For Debugging
    instruction_execute    <= instruction_decode;
  end
end

endmodule

`;
  zip.file('decode_pipe.v', file_content);
}

function get_seven_stage_pipeline_stall_bypass_memory(zip) {
  var file_content =`/** @module : memory
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
 */

module memory_unit #(
  parameter CORE = 0,
  parameter DATA_WIDTH = 32,
  parameter INDEX_BITS = 6,
  parameter OFFSET_BITS = 3,
  parameter ADDRESS_BITS = 20,
  parameter PRINT_CYCLES_MIN = 1,
  parameter PRINT_CYCLES_MAX = 1000
) (
  input clock,
  input reset,

  // Connections from previous (Execute) pipeline stage
  input stall,
  input load,
  input store,
  input [ADDRESS_BITS-1:0] address,
  input [DATA_WIDTH-1:0] store_data,

  // Connections to next (Writeback) pipeline stage
  output [ADDRESS_BITS-1:0] data_addr,
  output [DATA_WIDTH-1:0] load_data,
  output valid,
  output ready,


  // Data Memory Interface
  input [ADDRESS_BITS-1:0] d_mem_out_addr,
  input [DATA_WIDTH-1:0]   d_mem_out_data,
  input d_mem_valid,
  input d_mem_ready,

  output [ADDRESS_BITS-1:0] d_mem_address,
  output [DATA_WIDTH-1:0]   d_mem_in_data,
  output d_mem_read,
  output d_mem_write,

  input report
);

// Connect Pipeline Inputs/Ouputs to Data Memory Interface
assign load_data     = d_mem_out_data;
assign data_addr     = d_mem_out_addr;
assign valid         = d_mem_valid;
assign ready         = d_mem_ready;
assign d_mem_address = address;
assign d_mem_in_data = store_data;
assign d_mem_read    = load;
assign d_mem_write   = store;

reg [31: 0] cycles;
always @ (posedge clock) begin
  cycles <= reset? 0 : cycles + 1;
  //if (report & ((cycles >=  PRINT_CYCLES_MIN) & (cycles < PRINT_CYCLES_MAX +1)))begin
  if (report)begin
    $display ("------ Core %d Memory Unit - Current Cycle %d -------", CORE, cycles);
    $display ("| Address     [%h]", address);
    $display ("| Load        [%b]", load);
    $display ("| Data Address[%h]", data_addr);
    $display ("| Load Data   [%h]", load_data);
    $display ("| Store       [%b]", store);
    $display ("| Store Data  [%h]", store_data);
    $display ("| Ready       [%b]", ready);
    $display ("| Valid       [%b]", valid);
    $display ("----------------------------------------------------------------------");
  end
end

endmodule
`;
  zip.file('memory.v', file_content);
}

function get_seven_stage_pipeline_stall_bypass_README(zip) {
  var file_content =`Description:

This version of BRISC-V implements a 7 stage pipeline with forwarding and
bypassing. It should only stall on a load/use hazard. No cache is implemented
yet. Instruction and data memories are implemented as BRAMs (The instruction
memory uses the BSRAM module and address stall logic in the i_mem_interface
module).

This version has been cleaned up and opimized. All instances of 'old_stall'
have been removed. The old_stall signal was used when a signal's stall logic
was placed after its register, forcing the signal to be stored in an
'old_<signal>' register. Using these 'old' signals cost alot of area and
significantly penalized Fmax. The table below compares the optimized 7 stage
processor with the 5 stage processor.

+----------------+----------------+----------------+
|                | 5 Stage Bypass | 7 Stage Bypass |
+----------------+----------------+----------------+
| Logic Elements | 3,406          | 3,366          |
+----------------+----------------+----------------+
| Fmax           | 61.5MHz        | 81.1MHz        |
+----------------+----------------+----------------+

THIS 7 STAGE VERSION SHOULD BE THE STARTING POINT FOR ALL NEW DESIGNS.

This verison is the fastest version of the processor and is smaller than the
5 stage bypassed processor despite having two extra pipeline stages.

Features:
- 7 stage pipeline
    - forwarding/bypassing
    - should only stall on load/use
    - smaller than the 5 stage bypassed processor
- 4096 word BRAM memory by default.
    - Memory size can be changed
    - make sure stack pointer is small enough
    - setting stack pointer to 450 works in demos

Updates:

- Change most of the code style to make it uniform.

- Removed all instances of 'old_stall', including the "Bonus" stall cycle.

- Moved instruction memory to memory hierarchy module. Now fetch module has an
  instruction memory interface that could support several types of memory, such
  as caches or bram.

- Moved data memory to memory hierarchy module. Now the memory unit module has
  a data memory interface taht could support several types of memory, such as
  caches or bram.

- Fixed kernel frontend: Change line 18 from
    "addi s3,zero,0"
    to
    "addi a3,zero,0"

- Deleted PC wire variable from fetch unit, replaced it with the existing PC_reg
  variable because they were eqivilant.

`;
  zip.file('README', file_content);
}

function get_seven_stage_pipeline_stall_bypass_RISC_V_Core(zip) {
  var file_content =`/** @module : RISC_V_Core
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

module RISC_V_Core #(
  parameter CORE = 0,
  parameter DATA_WIDTH = 32,
  parameter INDEX_BITS = 6,
  parameter OFFSET_BITS = 3,
  parameter ADDRESS_BITS = 12,
  parameter PRINT_CYCLES_MIN = 0,
  parameter PRINT_CYCLES_MAX = 15,
  parameter PROGRAM = "../software/applications/binaries/short_mandelbrot.vmh"
) (
  input clock,

  input reset,
  input start,
  input [ADDRESS_BITS-1:0] prog_address,

  // For I/O funstions
  input [1:0] from_peripheral,
  input [31:0] from_peripheral_data,
  input from_peripheral_valid,

  output reg [1:0] to_peripheral,
  output reg [31:0] to_peripheral_data,
  output reg to_peripheral_valid,

  // In-System Programmer Interface
  input [ADDRESS_BITS-1:0] isp_address,
  input [DATA_WIDTH-1:0] isp_data,
  input isp_write,

  input report, // performance reporting
  output [ADDRESS_BITS-1:0] current_PC
);

// TODO: Break up wire declarations by module/stage
wire [31:0]  instruction_fetch1; // output of i_mem_interface
wire [31:0]  instruction_fetch2; // output of fetch unit
wire [31:0]  instruction_decode;
// For Debug
wire [31:0]  instruction_execute;
wire [31:0]  instruction_memory1;
wire [31:0]  instruction_writeback;

wire [ADDRESS_BITS-1: 0] inst_PC_fetch;
wire [ADDRESS_BITS-1: 0] inst_PC_decode;
wire valid_fetch2;
wire ready_fetch2;
wire valid_memory2;
wire ready_memory2;
wire [4:0] rs1_decode;
wire [4:0] rs2_decode;
wire stall;
wire [ADDRESS_BITS-1: 0] JAL_target_decode;
wire [ADDRESS_BITS-1: 0] JAL_target_execute;
wire [ADDRESS_BITS-1: 0] JALR_target_execute;
wire [ADDRESS_BITS-1: 0] branch_target_decode;
wire [ADDRESS_BITS-1: 0] branch_target_execute;

wire  write_writeback;
wire  [4:0]  write_reg_writeback;
wire  [DATA_WIDTH-1:0] write_data_writeback;

wire [DATA_WIDTH-1:0]  rs1_data_decode;
wire [DATA_WIDTH-1:0]  rs2_data_decode;
wire [4:0]  rd_decode;
wire [6:0]  opcode_decode;
wire [6:0]  funct7_decode;
wire [2:0]  funct3_decode;

wire [DATA_WIDTH-1:0]  rs1_data_execute;
wire [DATA_WIDTH-1:0]  rs2_data_execute;
wire [DATA_WIDTH-1:0]  rs2_data_memory1;
wire [4:0]   rd_execute;

wire [ADDRESS_BITS-1: 0] PC_execute;
wire [6:0]  opcode_execute;
wire [6:0]  opcode_memory1;
wire [6:0]  funct7_execute;
wire [2:0]  funct3_execute;

wire memRead_decode;
wire memRead_execute;
wire memRead_memory1;
wire memRead_writeback;

wire [4:0]  rd_memory1;
wire [4:0]  rd_memory2;
wire [4:0]  rd_writeback;
wire memtoReg;
wire [2:0] ALUOp_decode;
wire [2:0] ALUOp_execute;
wire branch_op_decode;
wire branch_op_execute;
wire [1:0] next_PC_select_decode;
wire [1:0] next_PC_select_execute;
wire [1:0] next_PC_select_memory1;
wire [1:0] next_PC_select_memory2;
wire [1:0] next_PC_select_writeback; // TODO: MAke this memory2 when extra memory stage is added
wire [1:0] operand_A_sel_decode;
wire [1:0] operand_A_sel_execute;
wire operand_B_sel_decode;
wire operand_B_sel_execute;
wire [1:0] extend_sel_decode;
wire [DATA_WIDTH-1:0]  extend_imm_decode;
wire [DATA_WIDTH-1:0]  extend_imm_execute;

wire memWrite_decode;
wire memWrite_execute;
wire memWrite_memory1;
wire regWrite_decode;
wire regWrite_execute;
wire regWrite_memory1;
wire regWrite_memory2;
wire regWrite_writeback;

wire branch_execute;
wire [DATA_WIDTH-1:0]   ALU_result_execute;
wire [DATA_WIDTH-1:0]   ALU_result_memory1;
wire [DATA_WIDTH-1:0]   ALU_result_writeback;
wire [ADDRESS_BITS-1:0] generated_addr = ALU_result_memory1; // the case the address is not 32-bit

wire zero; // Have not done anything with this signal

wire [DATA_WIDTH-1:0]    memory_data_memory2;
wire [DATA_WIDTH-1:0]    memory_data_writeback;
wire [DATA_WIDTH-1:0]    bypass_data_memory2;
wire [ADDRESS_BITS-1: 0] memory_addr_memory2; // To use to check the address coming out the memory stage

wire [2:0] rs1_data_bypass;
wire [2:0] rs2_data_bypass;

// Memory Hierarchy Wires - Instruction Memory Interface
wire i_mem_read;
wire [ADDRESS_BITS-1:0] i_mem_read_address;
wire [ADDRESS_BITS-1:0] i_mem_out_addr;
wire [DATA_WIDTH-1:0] i_mem_out_data;
wire i_mem_valid;
wire i_mem_ready;

// Memory Hierarchy Wires - Data Memory Interface
wire [ADDRESS_BITS-1:0] d_mem_out_addr;
wire [DATA_WIDTH-1:0] d_mem_out_data;
wire d_mem_valid;
wire d_mem_ready;
wire [ADDRESS_BITS-1:0] d_mem_address;
wire [DATA_WIDTH-1:0] d_mem_in_data;
wire d_mem_read;
wire d_mem_write;


// Assignments to make debugging easier
assign current_PC         = inst_PC_fetch;
assign instruction_fetch1 = i_mem_out_data;

memory_hierarchy #(
  .CORE(CORE),
  .DATA_WIDTH(DATA_WIDTH),
  .INDEX_BITS(INDEX_BITS),
  .OFFSET_BITS(OFFSET_BITS),
  .ADDRESS_BITS(ADDRESS_BITS),
  .PROGRAM(PROGRAM)
) mem_hierarchy_inst (
  .clock(clock),
  .reset(reset),

  // Instruction Memory Interface
  .i_mem_read(i_mem_read),
  .i_mem_read_address(i_mem_read_address),
  .i_mem_out_addr(i_mem_out_addr),
  .i_mem_out_data(i_mem_out_data),
  .i_mem_valid(i_mem_valid),
  .i_mem_ready(i_mem_ready),

  // Data Memory Interface
  .d_mem_address(d_mem_address),
  .d_mem_read(d_mem_read),
  .d_mem_write(d_mem_write),
  .d_mem_in_data(d_mem_in_data),
  .d_mem_out_addr(d_mem_out_addr),
  .d_mem_out_data(d_mem_out_data),
  .d_mem_valid(d_mem_valid),
  .d_mem_ready(d_mem_ready),

  // In-System Programmer Interface
  .isp_address(isp_address),
  .isp_data(isp_data),
  .isp_write(isp_write),

  .report(report)

);

fetch_unit #(
  .CORE(CORE),
  .DATA_WIDTH(DATA_WIDTH),
  .INDEX_BITS(INDEX_BITS),
  .OFFSET_BITS(OFFSET_BITS),
  .ADDRESS_BITS(ADDRESS_BITS),
  .PROGRAM(PROGRAM),
  .PRINT_CYCLES_MIN(PRINT_CYCLES_MIN),
  .PRINT_CYCLES_MAX(PRINT_CYCLES_MAX)
) IF (
  .clock(clock),
  .reset(reset),
  .start(start),
  .stall(stall),
  .next_PC_select_execute(next_PC_select_execute),
  .program_address(prog_address),
  .JAL_target(JAL_target_execute),
  .JALR_target(JALR_target_execute),
  .branch(branch_execute),
  .branch_target(branch_target_execute),

  // Instruction Memory Interface
  .i_mem_read(i_mem_read),
  .i_mem_read_address(i_mem_read_address),
  .i_mem_out_addr(i_mem_out_addr),
  .i_mem_out_data(i_mem_out_data),
  .i_mem_valid(i_mem_valid),
  .i_mem_ready(i_mem_read),

  .instruction(instruction_fetch2),
  .inst_PC(inst_PC_fetch),
  .valid(valid_fetch2), // Unused in 7 stage BRAM
  .ready(ready_fetch2), // Unused in 7 stage BRAM
  .report(report)

);

fetch_pipe_unit #(
  .DATA_WIDTH(DATA_WIDTH),
  .ADDRESS_BITS(ADDRESS_BITS)
) IF_ID (
  .clock(clock),
  .reset(reset),
  .stall(stall),
  .instruction_fetch(instruction_fetch2),
  .inst_PC_fetch(inst_PC_fetch),

  .instruction_decode(instruction_decode),
  .inst_PC_decode(inst_PC_decode)
 );

decode_unit #(
  .CORE(CORE),
  .ADDRESS_BITS(ADDRESS_BITS),
  .DATA_WIDTH(DATA_WIDTH),
  .PRINT_CYCLES_MIN(PRINT_CYCLES_MIN),
  .PRINT_CYCLES_MAX(PRINT_CYCLES_MAX)
) ID (
  .clock(clock),
  .reset(reset),
  .PC(inst_PC_decode),
  .instruction(instruction_decode),

  .extend_sel(extend_sel_decode),
  .write(write_writeback),
  .write_reg(write_reg_writeback),
  .write_data(write_data_writeback),
  .rs1_data_bypass(rs1_data_bypass),
  .rs2_data_bypass(rs2_data_bypass),
  .ALU_result_execute(ALU_result_execute),
  .ALU_result_memory1(ALU_result_memory1),
  .ALU_result_memory2(bypass_data_memory2),
  .ALU_result_writeback(write_data_writeback),

  .opcode(opcode_decode),
  .funct3(funct3_decode),
  .funct7(funct7_decode),
  .rs1_data(rs1_data_decode),
  .rs2_data(rs2_data_decode),
  .rd(rd_decode),
  .extend_imm(extend_imm_decode),
  .branch_target(branch_target_decode),
  .JAL_target(JAL_target_decode),
  .rs1(rs1_decode),
  .rs2(rs2_decode),
  .report(report)
);

stall_and_bypass_control_unit ID_SB (
  .clock(clock),
  .rs1(rs1_decode),
  .rs2(rs2_decode),
  .regwrite_execute(regWrite_execute),
  .regwrite_memory1(regWrite_memory1),
  .regwrite_memory2(regWrite_memory2),
  .regwrite_writeback(regWrite_writeback),
  .rd_execute(rd_execute),
  .rd_memory1(rd_memory1),
  .rd_memory2(rd_memory2),
  .rd_writeback(rd_writeback),
  .opcode_execute(opcode_execute),
  .opcode_memory1(opcode_memory1),

  .rs1_data_bypass(rs1_data_bypass),
  .rs2_data_bypass(rs2_data_bypass),
  .stall(stall)
);

control_unit #(
  .CORE(CORE),
  .PRINT_CYCLES_MIN(PRINT_CYCLES_MIN),
  .PRINT_CYCLES_MAX(PRINT_CYCLES_MAX)
) CU (
  .clock(clock),
  .reset(reset),

  .opcode(opcode_decode),
  .branch_op(branch_op_decode),
  .memRead(memRead_decode),
  .memtoReg(memtoReg),
  .ALUOp(ALUOp_decode),
  .memWrite(memWrite_decode),
  .next_PC_sel(next_PC_select_decode),
  .operand_A_sel(operand_A_sel_decode),
  .operand_B_sel(operand_B_sel_decode),
  .extend_sel(extend_sel_decode),
  .regWrite(regWrite_decode),

  .report(report)
);

decode_pipe_unit #(
  .DATA_WIDTH(DATA_WIDTH),
  .ADDRESS_BITS(ADDRESS_BITS)
) ID_EU (
  .clock(clock),
  .reset(reset),
  .stall(stall),
  .rs1_data_decode(rs1_data_decode),
  .rs2_data_decode(rs2_data_decode),
  .funct7_decode(funct7_decode),
  .funct3_decode(funct3_decode),
  .rd_decode(rd_decode),
  .opcode_decode(opcode_decode),
  .extend_imm_decode(extend_imm_decode),
  .branch_target_decode(branch_target_decode),
  .JAL_target_decode(JAL_target_decode),
  .PC_decode(inst_PC_decode),
  .branch_op_decode(branch_op_decode),
  .memRead_decode(memRead_decode),
  .ALUOp_decode(ALUOp_decode),
  .memWrite_decode(memWrite_decode),
  .next_PC_select_decode(next_PC_select_decode),
  .next_PC_select_memory1(next_PC_select_memory1),
  .next_PC_select_memory2(next_PC_select_memory2),
  .operand_A_sel_decode(operand_A_sel_decode),
  .operand_B_sel_decode(operand_B_sel_decode),
  .regWrite_decode(regWrite_decode),
  // For Debug
  .instruction_decode(instruction_decode),

  .rs1_data_execute(rs1_data_execute),
  .rs2_data_execute(rs2_data_execute),
  .funct7_execute(funct7_execute),
  .funct3_execute(funct3_execute),
  .rd_execute(rd_execute),
  .opcode_execute(opcode_execute),
  .extend_imm_execute(extend_imm_execute),
  .branch_target_execute(branch_target_execute),
  .JAL_target_execute(JAL_target_execute),
  .PC_execute(PC_execute),
  .branch_op_execute(branch_op_execute),
  .memRead_execute(memRead_execute),
  .ALUOp_execute(ALUOp_execute),
  .memWrite_execute(memWrite_execute),
  .next_PC_select_execute(next_PC_select_execute),
  .operand_A_sel_execute(operand_A_sel_execute),
  .operand_B_sel_execute(operand_B_sel_execute),
  .regWrite_execute(regWrite_execute),
  // For Debug
  .instruction_execute(instruction_execute)
);



execution_unit #(
  .CORE(CORE),
  .DATA_WIDTH(DATA_WIDTH),
  .ADDRESS_BITS(ADDRESS_BITS),
  .PRINT_CYCLES_MIN(PRINT_CYCLES_MIN),
  .PRINT_CYCLES_MAX(PRINT_CYCLES_MAX)
) EU (
  .clock(clock),
  .reset(reset),
  .stall(stall),

  .ALU_Operation(ALUOp_execute),
  .funct3(funct3_execute),
  .funct7(funct7_execute),
  .branch_op(branch_op_execute),
  .PC(PC_execute),
  .ALU_ASrc(operand_A_sel_execute),
  .ALU_BSrc(operand_B_sel_execute),
  .regRead_1(rs1_data_execute),
  .regRead_2(rs2_data_execute),
  .extend(extend_imm_execute),
  .ALU_result(ALU_result_execute),
  .zero(zero),
  .branch(branch_execute),
  .JALR_target(JALR_target_execute),

  .report(report)
);

execute_pipe_unit #(
  .DATA_WIDTH(DATA_WIDTH),
  .ADDRESS_BITS(ADDRESS_BITS)
) EU_MU (
  .clock(clock),
  .reset(reset),
  //.stall(stall),
  .ALU_result_execute(ALU_result_execute),
  .store_data_execute(rs2_data_execute),
  .rd_execute(rd_execute),
  .opcode_execute(opcode_execute),
  .memWrite_execute(memWrite_execute),
  .memRead_execute(memRead_execute),
  .next_PC_select_execute(next_PC_select_execute),
  .regWrite_execute(regWrite_execute),
  // For Debug
  .instruction_execute(instruction_execute),

  .ALU_result_memory1(ALU_result_memory1),
  .store_data_memory1(rs2_data_memory1),
  .rd_memory1(rd_memory1),
  .opcode_memory1(opcode_memory1),
  .memWrite_memory1(memWrite_memory1),
  .memRead_memory1(memRead_memory1),
  .next_PC_select_memory1(next_PC_select_memory1),
  .regWrite_memory1(regWrite_memory1),
  // For Debug
  .instruction_memory1(instruction_memory1)
);

memory_unit #(
  .CORE(CORE),
  .DATA_WIDTH(DATA_WIDTH),
  .INDEX_BITS(INDEX_BITS),
  .OFFSET_BITS(OFFSET_BITS),
  .ADDRESS_BITS(ADDRESS_BITS),
  .PRINT_CYCLES_MIN(PRINT_CYCLES_MIN),
  .PRINT_CYCLES_MAX(PRINT_CYCLES_MAX)
) MU (
  .clock(clock),
  .reset(reset),
  .stall(stall),

  // Connections to/from pipeline stages
  .load(memRead_memory1),
  .store(memWrite_memory1),
  .address(generated_addr),
  .store_data(rs2_data_memory1),
  //.ALU_result(ALU_result_memory),
  .data_addr(memory_addr_memory2),
  .load_data(memory_data_memory2),
  //.bypass_data(bypass_data_memory),
  .valid(valid_memory2), // Unused in 7 stage BRAM
  .ready(ready_memory2), // Unused in 7 stage BRAM

  // Data Memory Interface 
  .d_mem_out_addr(d_mem_out_addr),
  .d_mem_out_data(d_mem_out_data),
  .d_mem_valid(d_mem_valid),
  .d_mem_ready(d_mem_ready),

  .d_mem_address(d_mem_address),
  .d_mem_in_data(d_mem_in_data),
  .d_mem_read(d_mem_read),
  .d_mem_write(d_mem_write),

  .report(report)
);
memory_pipe_unit #(
  .DATA_WIDTH(DATA_WIDTH),
  .ADDRESS_BITS(ADDRESS_BITS)
) MU_WB (
  .clock(clock),
  .reset(reset),

  .ALU_result_memory1(ALU_result_memory1),
  .load_data_memory2(memory_data_memory2), // memory_data_memory1 is the bram register
  .opwrite_memory1(regWrite_memory1),
  .opSel_memory1(memRead_memory1),
  .opReg_memory1(rd_memory1),
  .next_PC_select_memory1(next_PC_select_memory1),
  // For Debug
  .instruction_memory1(instruction_memory1),

  .ALU_result_writeback(ALU_result_writeback),
  .load_data_writeback(memory_data_writeback),
  .opwrite_writeback(regWrite_writeback),
  .opSel_writeback(memRead_writeback),
  .opReg_writeback(rd_writeback),
  .next_PC_select_writeback(next_PC_select_writeback),
  // For Debug
  .instruction_writeback(instruction_writeback),

  .bypass_data_memory2(bypass_data_memory2),
  .next_PC_select_memory2(next_PC_select_memory2),
  .opwrite_memory2(regWrite_memory2),
  .opReg_memory2(rd_memory2)
);

writeback_unit #(
  .CORE(CORE),
  .DATA_WIDTH(DATA_WIDTH),
  .PRINT_CYCLES_MIN(PRINT_CYCLES_MIN),
  .PRINT_CYCLES_MAX(PRINT_CYCLES_MAX)
) WB (
  .clock(clock),
  .reset(reset),
  .stall(stall),

  // TODO: Rename op* ports. It is not clear what op means. they also
  // violate the naming convention of using underscores and lower case.
  .opWrite(regWrite_writeback),
  .opSel(memRead_writeback),
  .opReg(rd_writeback),
  .ALU_Result(ALU_result_writeback),
  .memory_data(memory_data_writeback),
  .write(write_writeback),
  .write_reg(write_reg_writeback),
  .write_data(write_data_writeback),

  .report(report)
);



//Register s2-s11 [$x18-$x27] are saved across calls ... Using s2-s9 [x18-x25] for final results
always @ (posedge clock) begin
         //if (write && ((write_reg >= 18) && (write_reg <= 25)))  begin
         if (write_writeback && ((write_reg_writeback >= 10) && (write_reg_writeback <= 17)))  begin
              to_peripheral       <= 0;
              to_peripheral_data  <= write_data_writeback;
              to_peripheral_valid <= 1;
              //$display (" Core [%d] Register [%d] Value = %d", CORE, write_reg_fetch, write_data_fetch);
         end
         else to_peripheral_valid <= 0;
end

endmodule
`;
  zip.file('RISC_V_Core.v', file_content);
}

function get_seven_stage_pipeline_stall_bypass_decode(zip) {
  var file_content =`/** @module : decode
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
 */

// TODO: Remove all '=' from wire declarations.
// 32-bit Decoder
module decode_unit #(
  parameter CORE = 0,
  parameter ADDRESS_BITS = 20,
  parameter DATA_WIDTH = 32,
  parameter PRINT_CYCLES_MIN = 1,
  parameter PRINT_CYCLES_MAX = 1000
) (

  input  clock,
  input  reset,
  input  [ADDRESS_BITS-1:0] PC,
  input  [DATA_WIDTH-1:0] instruction,
  input  [1:0] extend_sel,
  input  write,
         // TODO: rename write_reg to write_sel to match read_sel signals. This
         // is more clear. -Alan
  input  [4:0]  write_reg,
  input  [DATA_WIDTH-1:0] write_data,
  input  [2:0] rs1_data_bypass,
  input  [2:0] rs2_data_bypass,
  input  [DATA_WIDTH-1:0] ALU_result_execute,
  input  [DATA_WIDTH-1:0] ALU_result_memory1,
  input  [DATA_WIDTH-1:0] ALU_result_memory2,
  input  [DATA_WIDTH-1:0] ALU_result_writeback,

  output [DATA_WIDTH-1:0] rs1_data,
  output [DATA_WIDTH-1:0] rs2_data,
  output [4:0]  rd,
  output [6:0]  opcode,
  output [6:0]  funct7,
  output [2:0]  funct3,
  output [DATA_WIDTH-1:0] extend_imm,
  output [ADDRESS_BITS-1:0] branch_target,
  output [ADDRESS_BITS-1:0] JAL_target,
  output [4:0] rs1,
  output [4:0] rs2,

  input report

); 
 
wire[DATA_WIDTH-1:0] rs1_data_decode;
wire[DATA_WIDTH-1:0] rs2_data_decode;
wire[11:0] i_imm      = instruction[31:20];
wire[6:0]  s_imm_msb  = instruction[31:25];
wire[4:0]  s_imm_lsb  = instruction[11:7];
wire[19:0] u_imm      = instruction[31:12];
wire[11:0] i_imm_orig = instruction[31:20]; 
wire[19:0] uj_imm     = {instruction[31],instruction[19:12],instruction[20],instruction[30:21]};

//Forming the s immediate value from the two msb and lsb parts of the s immediate
wire[11:0] s_imm_orig  = {s_imm_msb,s_imm_lsb};
wire[12:0] sb_imm_orig = {s_imm_msb[6],s_imm_lsb[0],s_imm_msb[5:0],s_imm_lsb[4:1],1'b0};

// Read registers
assign  rs2           = instruction[24:20];
assign  rs1           = instruction[19:15];

/* Instruction decoding */
assign opcode        = instruction[6:0];
assign funct7        = instruction[31:25];
assign funct3        = instruction[14:12];

/* Write register */
assign  rd           = instruction[11:7];

/* Only workig with BEQ at the moment */
wire[31:0] sb_imm_32 = {{19{sb_imm_orig[12]}}, sb_imm_orig};
assign branch_target = PC + sb_imm_32;

/* Extensions */
wire[31:0] u_imm_32  = {u_imm,12'b0};
wire[31:0] i_imm_32  = {{20{i_imm_orig[11]}}, i_imm_orig[11:0] };
wire[31:0] s_imm_32  = {{20{s_imm_orig[11]}}, s_imm_orig};

assign extend_imm    = (extend_sel == 2'b01)? s_imm_32 :
                       (extend_sel == 2'b10)? u_imm_32 : i_imm_32;

/* Only JAL Target. JALR happens in the execution unit*/
wire[31:0] uj_imm_32 = {{11{uj_imm[19]}},uj_imm[19:0],1'b0};
assign JAL_target    = uj_imm_32 + PC;

//mux's select for data bypassing
assign rs1_data      = (rs1_data_bypass == 3'b000)? rs1_data_decode      :
                       (rs1_data_bypass == 3'b001)? ALU_result_execute   :
                       (rs1_data_bypass == 3'b010)? ALU_result_memory1   :
                       (rs1_data_bypass == 3'b011)? ALU_result_memory2   :
                       (rs1_data_bypass == 3'b100)? ALU_result_writeback :
                       {DATA_WIDTH{1'b0}};

assign rs2_data      = (rs2_data_bypass == 3'b000)? rs2_data_decode      :
                       (rs2_data_bypass == 3'b001)? ALU_result_execute   :
                       (rs2_data_bypass == 3'b010)? ALU_result_memory1   :
                       (rs2_data_bypass == 3'b011)? ALU_result_memory2   :
                       (rs2_data_bypass == 3'b100)? ALU_result_writeback :
                       {DATA_WIDTH{1'b0}};

regFile #(32, 5) registers (
                .clock(clock),
                .reset(reset),
                .read_sel1(rs1),
                .read_sel2(rs2),
                .wEn(write),
                .write_sel(write_reg),
                .write_data(write_data),
                .read_data1(rs1_data_decode),
                .read_data2(rs2_data_decode)
);

reg [31: 0] cycles;
always @ (posedge clock) begin
    cycles <= reset? 0 : cycles + 1;
    //if (report & ((cycles >=  PRINT_CYCLES_MIN) & (cycles < PRINT_CYCLES_MAX +1)))begin
    if (report)begin
        $display ("------ Core %d Decode Unit - Current Cycle %d -------", CORE, cycles);
        $display ("| PC          [%h]", PC);
        $display ("| Instruction [%h]", instruction);
        $display ("| rs1         [%d]", rs1);
        $display ("| rs1_data    [%d]", rs1_data);
        $display ("| rs2         [%d]", rs2);
        $display ("| rs2_data    [%d]", rs2_data);
        $display ("| rsd         [%d]", rd);
        $display ("| jumpTarget  [%h]", JAL_target);
        $display ("| branchTarget[%h]", branch_target);
        $display ("| Opcode      [%b]    Funct3 [%b]      Funct7  [%b]", opcode, funct3, funct7);
        $display ("| Immediate   [%d] Hex    [%h] Bin     [%b]", extend_imm, extend_imm, extend_imm[7:0]);
        $display ("| write       [%b]", write);
        $display ("| write_reg   [%d]", write_reg);
        $display ("| write_data  [%d]", write_data);
        $display ("----------------------------------------------------------------------");
    end
end

endmodule
`;
  zip.file('decode.v', file_content);
}

function seven_stage_pipeline_stall_bypass_get_function_list() {
  function_list =[get_seven_stage_pipeline_stall_bypass_dummy_cache, get_seven_stage_pipeline_stall_bypass_i_mem_interface, get_seven_stage_pipeline_stall_bypass_writeback, get_seven_stage_pipeline_stall_bypass_memory_hierarchy, get_seven_stage_pipeline_stall_bypass_zeros32, get_seven_stage_pipeline_stall_bypass_test_wrapper, get_seven_stage_pipeline_stall_bypass_stallControl, get_seven_stage_pipeline_stall_bypass_bsram, get_seven_stage_pipeline_stall_bypass_ALU, get_seven_stage_pipeline_stall_bypass_zeros4096, get_seven_stage_pipeline_stall_bypass_execute, get_seven_stage_pipeline_stall_bypass_regFile, get_seven_stage_pipeline_stall_bypass_control_unit, get_seven_stage_pipeline_stall_bypass_fetch, get_seven_stage_pipeline_stall_bypass_fetch_pipe, get_seven_stage_pipeline_stall_bypass_d_mem_interface, get_seven_stage_pipeline_stall_bypass_execute_pipe, get_seven_stage_pipeline_stall_bypass_bram, get_seven_stage_pipeline_stall_bypass_memory_pipe, get_seven_stage_pipeline_stall_bypass_decode_pipe, get_seven_stage_pipeline_stall_bypass_memory, get_seven_stage_pipeline_stall_bypass_README, get_seven_stage_pipeline_stall_bypass_RISC_V_Core, get_seven_stage_pipeline_stall_bypass_decode];
return function_list;
}

