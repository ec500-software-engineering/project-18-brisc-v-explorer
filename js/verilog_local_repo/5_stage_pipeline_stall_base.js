var fiveStagePipelineStallBaseDocumentation = {
    readme: {
        filename: 'README',
        fileContent: `Description:
This version implements a 5 stage pipeline with stalls/flushes. No cache is
integrated yet. This core was the starting point for the bypassed pipeline
version. The BRISC-V_5_stage_pipeline_stall_bypass version should replace this
version as a starting point for future additions.

Features:
- 5 stage pipeline
    - 2 nops after JAL/JALR/any branch
- parameterized memory sizes
    - 4k words per memory by default
    - make sure stack pointer is small enough
    - setting stack pointer to 600 works in demos
- Signed shift bug in ALU has been fixed
- No peripherals are included
- No Cache

Updates:

The signed ALU bugs have been fixed. All ALU operations are now
correctly implemented as signed or unsigned.

The PC wire reset behavior has been moved from combinational to clocked logic to
allow instruction memory to be infered as BRAM.
`
    }
};

var fiveStagePipelineStallBaseModules = {
    iMemInterface: {
        filename: 'i_mem_interface.v',
        fileContent: `/** @module : i_memory_interface
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
    parameter ADDRESS_BITS = 12,
    parameter PROGRAM = "../software/applications/binaries/factorial.vmh"
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

BRAM #(
    .DATA_WIDTH(DATA_WIDTH),
    .ADDR_WIDTH(ADDRESS_BITS),
    .INIT_FILE(PROGRAM)
) RAM (
    .clock(clock),
    .readEnable(read),
    .readAddress(read_address),
    .readData(out_data),

    .writeEnable(write),
    .writeAddress(write_address),
    .writeData(in_data)
);

assign out_addr = read? read_address : 0;
assign valid    = (read | write)? 1'b1 : 1'b0;
assign ready    = (read | write)? 1'b0 : 1'b1; // Just for testing now

reg [31: 0] cycles;
always @ (posedge clock) begin
    cycles <= reset? 0 : cycles + 1;
    if (report)begin
        $display ("------ Core %d Memory Interface - Current Cycle %d --", CORE, cycles);
        $display ("| Address     [%h]", read_address);
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

`
    },
    writeBack: {
        filename: 'writeback.v',
        fileContent: `/** @module : writeback
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
 module writeback_unit #(parameter  CORE = 0, DATA_WIDTH = 32,
                            PRINT_CYCLES_MIN = 1, PRINT_CYCLES_MAX = 1000) (
      clock, reset,
      stall,
      opWrite,
      opSel, 
      opReg, 
      ALU_Result, 
      memory_data, 
      write, write_reg, write_data, 
      report
); 
 
input  clock; 
input  reset; 
input  stall;
input  opWrite; 
input  opSel; 
input  [4:0]  opReg;
input  [DATA_WIDTH-1:0] ALU_Result;
input  [DATA_WIDTH-1:0] memory_data; 

output  write;
output  [4:0]  write_reg;
output  [DATA_WIDTH-1:0] write_data;

input report; 

assign write_data = opSel? memory_data : ALU_Result; 
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

 
`
    },
    writeBackPipe: {
        filename: 'writeback_pipe.v',
        fileContent: `/** @module : writeback_pipe_unit
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
module writeback_pipe_unit #(parameter  DATA_WIDTH = 32,
                              ADDRESS_BITS = 20)(

    input clock, reset,
    input regWrite_writeback,
    input [4:0] write_reg_writeback,
    input [DATA_WIDTH-1:0] write_data_writeback,
    input write_writeback,

    output regWrite_fetch,
    output [4:0] write_reg_fetch,
    output [DATA_WIDTH-1:0] write_data_fetch,
    output write_fetch
);

reg [4:0] write_reg_writeback_to_fetch;
reg [DATA_WIDTH-1:0] write_data_writeback_to_fetch;
reg  write_writeback_to_fetch;
reg regWrite_writeback_to_fetch;


assign regWrite_fetch    =  regWrite_writeback_to_fetch;
assign write_reg_fetch   =  write_reg_writeback_to_fetch;
assign write_data_fetch  =  write_data_writeback_to_fetch;
assign write_fetch       =  write_writeback_to_fetch;


always @(posedge clock) begin
   if(reset) begin
       write_reg_writeback_to_fetch     <= 5'b0;
       write_data_writeback_to_fetch    <= {DATA_WIDTH{1'b0}};
       write_writeback_to_fetch         <= 1'b0;
       regWrite_writeback_to_fetch      <= 1'b0;
   end
   else begin
       write_reg_writeback_to_fetch     <=  write_reg_writeback;
       write_data_writeback_to_fetch    <=  write_data_writeback;
       write_writeback_to_fetch         <=  write_writeback;
       regWrite_writeback_to_fetch      <=  regWrite_writeback;
   end
end
endmodule
`
    },
    stallControl: {
        filename: 'stallControl.v',
        fileContent: `/*  @author : Adaptive & Secure Computing Systems (ASCS) Laboratory

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


module stall_control_unit  (
    input clock,
    input [4:0] rs1,
    input [4:0] rs2,
    input regwrite_decode,
    input regwrite_execute,
    input regwrite_memory,
    input regwrite_writeback,
    input [4:0] rd_execute,
    input [4:0] rd_memory,
    input [4:0] rd_writeback,

    output stall_needed
);

reg stall;
wire stall_interupt;
wire rs1_hazard_execute;
wire rs1_hazard_memory;
wire rs1_hazard_writeback;
wire rs2_hazard_execute;
wire rs2_hazard_memory;
wire rs2_hazard_writeback;
wire rs1_hazard_detected;
wire rs2_hazard_detected;

// Detect hazards between decode and other stages
assign rs1_hazard_execute   = (rs1 == rd_execute   ) & regwrite_execute  ;
assign rs1_hazard_memory    = (rs1 == rd_memory    ) & regwrite_memory   ;
assign rs1_hazard_writeback = (rs1 == rd_writeback ) & regwrite_writeback;

assign rs2_hazard_execute   = (rs2 == rd_execute   ) & regwrite_execute  ;
assign rs2_hazard_memory    = (rs2 == rd_memory    ) & regwrite_memory   ;
assign rs2_hazard_writeback = (rs2 == rd_writeback ) & regwrite_writeback;

// TODO: Add read enable to detect true reads. Not every instruction reads
// both registers.
assign rs1_hazard_detected = (rs1_hazard_execute    |
                              rs1_hazard_memory     |
                              rs1_hazard_writeback) & (rs1 != 5'd0);

assign rs2_hazard_detected = (rs2_hazard_execute    |
                              rs2_hazard_memory     |
                              rs2_hazard_writeback) & (rs2 != 5'd0);

assign stall_interupt = (rs1_hazard_detected | rs2_hazard_detected)?  1'b1 : 1'b0;

//needed extra stall cycle
assign stall_needed = stall_interupt | stall;

always @(posedge clock) begin
    stall <= stall_interupt;
end

endmodule
`
    },
    bSram: {
        filename: 'bsram.v',
        fileContent: `/** @module : BSRAM
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

 (* ram_style = "block" *)
module BSRAM #(
    parameter CORE = 0,
    parameter DATA_WIDTH = 32,
    parameter ADDR_WIDTH = 8,
    parameter INIT_FILE = "NONE",
    parameter PRINT_CYCLES_MIN = 1,
    parameter PRINT_CYCLES_MAX = 1000
) (
    input clock,
    input reset,
    input readEnable,
    input [ADDR_WIDTH-1:0]   readAddress,
    output [DATA_WIDTH-1:0]  readData,
    input writeEnable,
    input [ADDR_WIDTH-1:0]   writeAddress,
    input [DATA_WIDTH-1:0]   writeData,
    input report
);

localparam MEM_DEPTH = 1 << ADDR_WIDTH;

reg  [DATA_WIDTH-1:0]     sram [0:MEM_DEPTH-1];

//--------------Code Starts Here------------------
assign readData = (readEnable & writeEnable & (readAddress == writeAddress))?
                  writeData : readEnable? sram[readAddress] : 0;

initial begin
  if(INIT_FILE != "NONE") begin
    $readmemh(INIT_FILE, sram);
  end
end

always@(posedge clock) begin : RAM_WRITE
    if(writeEnable)
        sram[writeAddress] <= writeData;
end

reg [31: 0] cycles;
always @ (posedge clock) begin
    cycles <= reset? 0 : cycles + 1;
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

endmodule

`
    },
    alu: {
        filename: 'ALU.v',
        fileContent: `/** @module : ALU
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


wire signed [DATA_WIDTH-1:0] signed_operand_A;
wire signed [DATA_WIDTH-1:0] signed_operand_B;

wire [4:0] shamt = operand_B [4:0];     // I_immediate[4:0];

// wires for signed operations
wire [(DATA_WIDTH*2)-1:0] arithmetic_right_shift_double;
wire [DATA_WIDTH-1:0] arithmetic_right_shift;
wire signed [DATA_WIDTH-1:0] signed_less_than;
wire signed [DATA_WIDTH-1:0] signed_greater_than_equal;

assign signed_operand_A = operand_A;
assign signed_operand_B = operand_B;

assign zero   = (ALU_result==0);
assign branch = ((ALU_Control[4:3] == 2'b10) & (ALU_result == 1'b1))? 1'b1 : 1'b0;

// Signed Operations
assign arithmetic_right_shift_double = ({ {DATA_WIDTH{operand_A[DATA_WIDTH-1]}}, operand_A }) >> shamt;
assign arithmetic_right_shift = arithmetic_right_shift_double[DATA_WIDTH-1:0];
assign signed_less_than = signed_operand_A < signed_operand_B;
assign signed_greater_than_equal = signed_operand_A >= signed_operand_B;

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
`
    },
    execute: {
        filename: 'execute.v',
        fileContent: `/** @module : execute
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
module execution_unit #(parameter CORE = 0, DATA_WIDTH = 32, ADDRESS_BITS = 20,
                         PRINT_CYCLES_MIN = 1, PRINT_CYCLES_MAX = 1000 )(
        clock, reset, stall,
        ALU_Operation, 
        funct3, funct7,
        PC, ALU_ASrc, ALU_BSrc, 
        branch_op, 
        regRead_1, regRead_2, 
        extend,
        ALU_result, zero, branch, 
        JALR_target,    
        
        report
);
input  clock; 
input  reset;  
input  stall;
input [2:0] ALU_Operation; 
input [6:0] funct7; 
input [2:0] funct3;
input [ADDRESS_BITS-1:0]  PC;
input [1:0] ALU_ASrc; 
input ALU_BSrc;
input branch_op;
input [DATA_WIDTH-1:0]  regRead_1 ;
input [DATA_WIDTH-1:0]  regRead_2 ; 
input [DATA_WIDTH-1:0]  extend;

output zero, branch; 
output [DATA_WIDTH-1:0] ALU_result;
output [ADDRESS_BITS-1:0] JALR_target;

input report;

reg old_stall;
reg [ADDRESS_BITS-1:0] old_JALR_target;

wire [5:0] ALU_Control = (ALU_Operation == 3'b011)? 
                         6'b011_111 :      //pass for JAL and JALR
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

wire [DATA_WIDTH-1:0]  operand_A  =  (ALU_ASrc == 2'b01)? PC : 
                                     (ALU_ASrc == 2'b10)? (PC + 4) :
                                      regRead_1;

wire [DATA_WIDTH-1:0]  operand_B  =   ALU_BSrc ? extend : regRead_2;
wire ALU_branch;
assign branch  = (ALU_branch & branch_op)? 1 : 0; 

ALU #(DATA_WIDTH) EU (
        .ALU_Control(ALU_Control), 
        .operand_A(operand_A), 
        .operand_B(operand_B), 
        .ALU_result(ALU_result), 
        .zero(zero), 
        .branch(ALU_branch)
); 

/* Only JALR Target. JAL happens in the decode unit*/
assign JALR_target = old_stall ? old_JALR_target : {regRead_1 + extend} & 32'hffff_fffe;

always@(posedge clock) begin
    if(reset) begin
        old_JALR_target <= 32'h00000000;
        old_stall       <= 1'b0;
    end else begin
        old_JALR_target <= JALR_target;
        old_stall       <= stall;
    end
end

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
        $display ("| JALR_taget  [%h]", JALR_target);
        $display ("----------------------------------------------------------------------");
    end
end

endmodule
`
    },
    regFile: {
        filename: 'regFile.v',
        fileContent: `/** @module : regFile
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
module regFile #(parameter REG_DATA_WIDTH = 32, REG_SEL_BITS = 5) (
                clock, reset, read_sel1, read_sel2,
                wEn, write_sel, write_data, 
                read_data1, read_data2
);

input clock, reset, wEn; 
input [REG_DATA_WIDTH-1:0] write_data;
input [REG_SEL_BITS-1:0] read_sel1, read_sel2, write_sel;
output[REG_DATA_WIDTH-1:0] read_data1; 
output[REG_DATA_WIDTH-1:0] read_data2; 

(* ram_style = "distributed" *) 
reg   [REG_DATA_WIDTH-1:0] register_file[0:(1<<REG_SEL_BITS)-1];
integer i; 

always @(posedge clock)
    if(reset==1)
        register_file[0] <= 0; 
    else 
        if (wEn & write_sel != 0) register_file[write_sel] <= write_data;
          
//----------------------------------------------------
// Drive the outputs
//----------------------------------------------------
assign  read_data1 = register_file[read_sel1];
assign  read_data2 = register_file[read_sel2];

// TODO: REMOVE THIS. It is for debugging with signal tap.
wire [31:0] r1;
assign r1 = register_file[1];
wire [31:0] r14;
assign r14 = register_file[14];
wire [31:0] r15;
assign r15 = register_file[15];



endmodule
`
    },
    controlUnit: {
        filename: 'control_unit.v',
        fileContent: `/*  @author : Adaptive & Secure Computing Systems (ASCS) Laboratory

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


module control_unit #(parameter CORE = 0,
                       PRINT_CYCLES_MIN = 1, PRINT_CYCLES_MAX = 1000 )(
    clock, reset,
    opcode,
    branch_op, memRead,
    memtoReg, ALUOp,
    next_PC_sel,
    operand_A_sel, operand_B_sel,
    extend_sel,
    memWrite, regWrite,
    report
);

    input clock;
    input reset;
    input [6:0] opcode;

    output branch_op;
    output memRead;
    output memtoReg;
    output [2:0] ALUOp;
    output memWrite;
    output [1:0] next_PC_sel;
    output [1:0] operand_A_sel;
    output operand_B_sel;
    output [1:0] extend_sel;
    output regWrite;
    input  report;

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

    assign regWrite      = ((opcode == R_TYPE) | (opcode == I_TYPE) | (opcode == LOAD)
                            | (opcode == JALR) | (opcode == JAL) | (opcode == AUIPC)
                            | (opcode == LUI))? 1 : 0;
    assign memWrite      = (opcode == STORE)?   1 : 0;
    assign branch_op     = (opcode == BRANCH)?  1 : 0;
    assign memRead       = (opcode == LOAD)?    1 : 0;
    assign memtoReg      = (opcode == LOAD)?    1 : 0;

    assign ALUOp         = (opcode == R_TYPE)?  3'b000 :
                           (opcode == I_TYPE)?  3'b001 :
                           (opcode == STORE)?   3'b101 :
                           (opcode == LOAD)?    3'b100 :
                           (opcode == BRANCH)?  3'b010 :
                           ((opcode == JALR)  | (opcode == JAL))? 3'b011 :
                           ((opcode == AUIPC) | (opcode == LUI))? 3'b110 : 0;

    assign operand_A_sel = (opcode == AUIPC)?  2'b01 :
                           (opcode == LUI)?    2'b11 :
                           ((opcode == JALR)  | (opcode == JAL))?  2'b10 : 0;

    assign operand_B_sel = ((opcode == I_TYPE) | (opcode == STORE)|
                           (opcode == LOAD) | (opcode == AUIPC) |
                           (opcode == LUI))? 1 : 0;

    assign extend_sel    = ((opcode == I_TYPE)  | (opcode == LOAD))?  2'b00 :
                           (opcode == STORE)?   2'b01  :
                           ((opcode == AUIPC) | (opcode == LUI))? 2'b10 : 0;

    assign next_PC_sel   = (opcode == BRANCH)?  2'b01 :
                           (opcode == JAL)?     2'b10 :
                           (opcode == JALR)?    2'b11 : 0;

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
`
    },
    fetchUnit: {
        filename: 'fetch.v',
        fileContent: `/** @module : fetch_unit
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
  parameter ADDRESS_BITS = 12,
  parameter PROGRAM = "../software/applications/binaries/factorial.vmh",
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

  // In-System Programmer Interface
  input [ADDRESS_BITS-1:0] isp_address,
  input [DATA_WIDTH-1:0] isp_data,
  input isp_write,

  output [DATA_WIDTH-1:0]   instruction,
  output [ADDRESS_BITS-1:0] inst_PC,
  output valid,
  output ready,

  input report

);
reg fetch;
reg [1:0] old_PC_select;
reg [ADDRESS_BITS-1:0] old_PC;
reg  [ADDRESS_BITS-1:0] PC_reg;

// PC Must be registered to prevent combinational loop with cache stall
wire [ADDRESS_BITS-1:0] PC;
wire [ADDRESS_BITS-1:0] PC_plus4;
//Adjustment to be word addressable instruction addresses
wire [ADDRESS_BITS-1:0] inst_addr;
wire [ADDRESS_BITS-1:0] out_addr;

//assign PC = reset ? program_address : PC_reg;
assign PC = PC_reg;
assign PC_plus4 = PC + 4;
assign inst_addr = PC >> 2;
assign inst_PC = stall ? old_PC : out_addr << 2;

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
    .read(fetch),
    .write(isp_write),
    .read_address(inst_addr),
    .write_address(isp_address),
    .in_data(isp_data),
    .out_addr(out_addr),
    .out_data(instruction),
    .valid(valid),
    .ready(ready),
    .report(report)
);

always @ (posedge clock) begin
    if (reset) begin
        fetch        <= 0;
        PC_reg       <= program_address;
        old_PC       <= program_address;
    end
    else begin
        if (start) begin
            fetch        <= 1;
            PC_reg       <= program_address;
            old_PC       <= program_address;
        end
        else if(stall) begin
            fetch        <= 1;
            PC_reg       <= PC_reg;
            old_PC       <= old_PC;
        end
        else begin
            fetch        <= 1;
            PC_reg       <= (next_PC_select_execute == 2'b11)          ? JALR_target   :
                            (next_PC_select_execute == 2'b10)          ? JAL_target    :
                            (next_PC_select_execute == 2'b01) & branch ? branch_target :
                            (next_PC_select_execute == 2'b01) & ~branch? PC_reg - 4    :
                            PC_plus4;
            old_PC       <= PC_reg;
        end
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
        $display ("| PC          [%h]", PC);
        $display ("| old_PC      [%h]", old_PC);
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
`
    },
    fetchPipe: {
        filename: 'fetch_pipe.v',
        fileContent: `/** @module : fetch_pipe_unit
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


module fetch_pipe_unit #(parameter  DATA_WIDTH = 32, ADDRESS_BITS = 20 ) (
    input clock, reset, stall,
    input  [DATA_WIDTH-1:0]   instruction_fetch,
    input  [ADDRESS_BITS-1:0] inst_PC_fetch,
    output [DATA_WIDTH-1:0]   instruction_decode,
    output [ADDRESS_BITS-1:0] inst_PC_decode
);

localparam NOP = 32'h00000013;

reg old_stall;
reg [DATA_WIDTH-1:0]   old_instruction_decode;
reg [ADDRESS_BITS-1:0] inst_PC_fetch_to_decode;

assign instruction_decode =  old_stall ? old_instruction_decode : instruction_fetch;
assign inst_PC_decode     =  inst_PC_fetch_to_decode;

always @(posedge clock) begin
    if(reset) begin
        inst_PC_fetch_to_decode     <= {ADDRESS_BITS{1'b0}};
        old_instruction_decode      <= NOP;
        old_stall                   <= 1'b0;
    end
    else begin
        inst_PC_fetch_to_decode     <= inst_PC_fetch;
        old_instruction_decode      <= instruction_decode;
        old_stall                   <= stall;
    end
end

endmodule
`
    },
    dMemInterface: {
        filename: 'd_mem_interface.v',
        fileContent: `/** @module : d_memory_interface
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
    parameter ADDRESS_BITS = 12
) (
    input clock,
    input reset,
    input stall,
    input read,
    input write,
    input [ADDRESS_BITS-1:0] address,
    input [DATA_WIDTH-1:0] in_data,


    output [ADDRESS_BITS-1:0] out_addr,
    output [DATA_WIDTH-1:0] out_data,
    output valid,
    output ready,
    input  report
);

/*************
* MEMORY MAP *
*************/
localparam BSRAM_MIN_ADDR   = 32'h00000000;
//localparam BSRAM_MAX_ADDR   = 32'h000003FF;
localparam BSRAM_MAX_ADDR =  (1 << ADDRESS_BITS) - 1;

wire [DATA_WIDTH-1:0] bsram_out_data;
wire bsram_select;
wire bsram_write_enable;


assign bsram_select = (address >= BSRAM_MIN_ADDR) && (address <= BSRAM_MAX_ADDR);
assign bsram_write_enable = bsram_select & write;
assign out_data =  read ? bsram_out_data : {DATA_WIDTH{1'b0}};
assign out_addr = read ? address : 1'b0;
assign valid    = (read | write)? 1'b1 : 1'b0;
assign ready    = (read | write)? 1'b0 : 1'b1; // Just for testing now

BSRAM #(
    .CORE(CORE),
    .DATA_WIDTH(DATA_WIDTH),
    .ADDR_WIDTH(ADDRESS_BITS)
) RAM (
    .clock(clock),
    .reset(reset),
    .readEnable(read),
    .readAddress(address),
    .readData(bsram_out_data),

    .writeEnable(bsram_write_enable),
    .writeAddress(address),
    .writeData(in_data),

    .report(report)
);


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

`
    },
    executePipe: {
        filename: 'execute_pipe.v',
        fileContent: `/** @module : execute_pipe_unit
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


module execute_pipe_unit #(parameter  DATA_WIDTH = 32,
                             ADDRESS_BITS = 20)(

    input clock, reset, stall,
    input [DATA_WIDTH-1:0]   ALU_result_execute,
    input [DATA_WIDTH-1:0]   store_data_execute,
    input [4:0] rd_execute,
    input [1:0] next_PC_select_execute,
    input memRead_execute,
    input memWrite_execute,
    input regWrite_execute,
    input [DATA_WIDTH-1:0] instruction_execute,

    output [DATA_WIDTH-1:0]   ALU_result_memory,
    output [DATA_WIDTH-1:0]   store_data_memory,
    output [4:0] rd_memory,
    output [1:0] next_PC_select_memory,
    output memRead_memory,
    output memWrite_memory,
    output regWrite_memory,
    output [DATA_WIDTH-1:0] instruction_memory
);

localparam NOP = 32'h00000013;

reg  [DATA_WIDTH-1:0]   ALU_result_execute_to_memory;
reg  [DATA_WIDTH-1:0]   store_data_execute_to_memory;
reg  [4:0] rd_execute_to_memory;
reg  memRead_execute_to_memory;
reg  memWrite_execute_to_memory;
reg  [1:0] next_PC_select_execute_to_memory;
reg  regWrite_execute_to_memory;
reg  [DATA_WIDTH-1:0] instruction_execute_to_memory;

assign ALU_result_memory    = ALU_result_execute_to_memory;
assign store_data_memory    = store_data_execute_to_memory;
assign rd_memory            = rd_execute_to_memory;
assign memRead_memory       = memRead_execute_to_memory;
assign memWrite_memory      = memWrite_execute_to_memory;
assign next_PC_select_memory   = next_PC_select_execute_to_memory;
assign regWrite_memory      = regWrite_execute_to_memory;
assign instruction_memory   = instruction_execute_to_memory;

always @(posedge clock) begin
   if(reset) begin
      ALU_result_execute_to_memory    <= {DATA_WIDTH{1'b0}};
      store_data_execute_to_memory    <= {DATA_WIDTH{1'b0}};
      rd_execute_to_memory            <= 5'b0;
      memRead_execute_to_memory       <= 1'b1;
      memWrite_execute_to_memory      <= 1'b0;
      next_PC_select_execute_to_memory   <= 2'b0;
      regWrite_execute_to_memory      <= 1'b0;
      instruction_execute_to_memory   <= NOP;
   end
   else if(stall) begin
      // flush all but PC_select
      ALU_result_execute_to_memory    <= ALU_result_execute;
      store_data_execute_to_memory    <= store_data_execute;
      rd_execute_to_memory            <= rd_execute;
      memRead_execute_to_memory       <= memRead_execute;
      memWrite_execute_to_memory      <= memWrite_execute;
      next_PC_select_execute_to_memory   <= next_PC_select_execute_to_memory; // hold during stall
      regWrite_execute_to_memory      <= regWrite_execute;
      instruction_execute_to_memory   <= instruction_execute;
   end
   else begin
      ALU_result_execute_to_memory    <= ALU_result_execute;
      store_data_execute_to_memory    <= store_data_execute;
      rd_execute_to_memory            <= rd_execute;
      memRead_execute_to_memory       <= memRead_execute;
      memWrite_execute_to_memory      <= memWrite_execute;
      next_PC_select_execute_to_memory   <= next_PC_select_execute;
      regWrite_execute_to_memory      <= regWrite_execute;
      instruction_execute_to_memory   <= instruction_execute;
   end
end
endmodule
`
    },
    bram: {
        filename: 'bram.v',
        fileContent: `/** @module : BRAM
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
 
 (* ram_style = "block" *)
module BRAM #(parameter DATA_WIDTH = 32, ADDR_WIDTH = 8, INIT_FILE = "../software/applications/binaries/factorial.vmh"
) (
        clock,
        readEnable,
        readAddress,
        readData,
        writeEnable,
        writeAddress,
        writeData
); 

localparam MEM_DEPTH = 1 << ADDR_WIDTH;

input clock; 
input readEnable;
input [ADDR_WIDTH-1:0]   readAddress;
output [DATA_WIDTH-1:0]  readData;
input writeEnable;
input [ADDR_WIDTH-1:0]   writeAddress;
input [DATA_WIDTH-1:0]   writeData;
 
reg [DATA_WIDTH-1:0]     readData;
reg [DATA_WIDTH-1:0]     ram [0:MEM_DEPTH-1];
 
    //--------------Code Starts Here------------------ 
    always@(posedge clock) begin : RAM_READ
            readData <= (readEnable & writeEnable & (readAddress == writeAddress))? 
                        writeData : readEnable? ram[readAddress] : 0;
    end

    always@(posedge clock) begin : RAM_WRITE
        if(writeEnable)
            ram[writeAddress] <= writeData;
    end


    initial begin
        $readmemh(INIT_FILE, ram);
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

`
    },
    memoryPipe: {
        filename: 'memory_pipe.v',
        fileContent: `/** @module : memory_pipe_unit
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


module memory_pipe_unit #(parameter  DATA_WIDTH = 32,
                          ADDRESS_BITS = 20)(

    input clock,reset,
    input [DATA_WIDTH-1:0] ALU_result_memory,
    input [DATA_WIDTH-1:0] load_data_memory,
    input opwrite_memory,
    input opsel_memory,
    input [4:0] opReg_memory,
    input [DATA_WIDTH-1:0] instruction_memory,

    output [DATA_WIDTH-1:0] ALU_result_writeback,
    output [DATA_WIDTH-1:0] load_data_writeback,
    output opwrite_writeback,
    output opsel_writeback,
    output [4:0] opReg_writeback,
    output [DATA_WIDTH-1:0] instruction_writeback
    );

localparam NOP = 32'h00000013;

reg    [DATA_WIDTH-1:0] ALU_result_memory_to_writeback;
reg    [DATA_WIDTH-1:0] load_data_memory_to_writeback;
reg    opwrite_memory_to_writeback;
reg    opsel_memory_to_writeback;
reg    [4:0] opReg_memory_to_writeback;
reg    [DATA_WIDTH-1:0] instruction_memory_to_writeback;

assign ALU_result_writeback = ALU_result_memory_to_writeback;
assign load_data_writeback  = load_data_memory_to_writeback;
assign opwrite_writeback    = opwrite_memory_to_writeback;
assign opsel_writeback      = opsel_memory_to_writeback;
assign opReg_writeback      = opReg_memory_to_writeback;
assign instruction_writeback= instruction_memory_to_writeback;

always @(posedge clock) begin
    if(reset) begin
        ALU_result_memory_to_writeback  <= {DATA_WIDTH{1'b0}};
        load_data_memory_to_writeback   <= {DATA_WIDTH{1'b0}};
        opwrite_memory_to_writeback     <= 1'b0;
        opsel_memory_to_writeback       <= 1'b0;
        opReg_memory_to_writeback       <= 5'b0;
        instruction_memory_to_writeback <= NOP;
    end
    else begin
        ALU_result_memory_to_writeback  <= ALU_result_memory;
        load_data_memory_to_writeback   <= load_data_memory;
        opwrite_memory_to_writeback     <= opwrite_memory;
        opsel_memory_to_writeback       <= opsel_memory;
        opReg_memory_to_writeback       <= opReg_memory;
        instruction_memory_to_writeback <= instruction_memory;
   end
end
endmodule
`
    },
    decodePipe: {
        filename: 'decode_pipe.v',
        fileContent: `/** @module : decode_pipe_unit
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

module decode_pipe_unit #(parameter  DATA_WIDTH = 32,
                            ADDRESS_BITS = 20)(
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
    input [1:0] next_PC_select_memory,
    input [1:0] operand_A_sel_decode,
    input operand_B_sel_decode,
    input regWrite_decode,
    input [DATA_WIDTH-1:0] instruction_decode,

    output [DATA_WIDTH-1:0] rs1_data_execute,
    output [DATA_WIDTH-1:0] rs2_data_execute,
    output [6:0] funct7_execute,
    output [2:0] funct3_execute,
    output [4:0] rd_execute,
    output [6:0] opcode_execute,
    output [DATA_WIDTH-1:0] extend_imm_execute,
    output [ADDRESS_BITS-1:0] branch_target_execute,
    output [ADDRESS_BITS-1:0] JAL_target_execute,
    output [ADDRESS_BITS-1:0] PC_execute,
    output branch_op_execute,
    output memRead_execute,
    output [2:0] ALUOp_execute,
    output memWrite_execute,
    output [1:0] next_PC_select_execute,
    output [1:0] operand_A_sel_execute,
    output operand_B_sel_execute,
    output regWrite_execute,
    output [DATA_WIDTH-1:0] instruction_execute
);

localparam NOP = 32'h00000013;

reg [DATA_WIDTH-1:0] rs1_data_decode_to_execute;
reg [DATA_WIDTH-1:0] rs2_data_decode_to_execute;
reg [6:0] funct7_decode_to_execute;
reg [2:0] funct3_decode_to_execute;
reg [4:0] rd_decode_to_execute;
reg [6:0] opcode_decode_to_execute;
reg [DATA_WIDTH-1:0] extend_imm_decode_to_execute;
reg [ADDRESS_BITS-1:0] branch_target_decode_to_execute;
reg [ADDRESS_BITS-1:0] JAL_target_decode_to_execute;
reg [ADDRESS_BITS-1:0] PC_decode_to_execute;
reg branch_op_decode_to_execute;
reg memRead_decode_to_execute;
reg [2:0] ALUOp_decode_to_execute;
reg memWrite_decode_to_execute;
reg [1:0] next_PC_select_decode_to_execute;
reg [1:0] operand_A_sel_decode_to_execute;
reg operand_B_sel_decode_to_execute;
reg regWrite_decode_to_execute;
reg [DATA_WIDTH-1:0] instruction_decode_to_execute;


assign  rs1_data_execute       = rs1_data_decode_to_execute;
assign  rs2_data_execute       = rs2_data_decode_to_execute;
assign  funct7_execute         = funct7_decode_to_execute;
assign  funct3_execute         = funct3_decode_to_execute;
assign  rd_execute             = rd_decode_to_execute;
assign  opcode_execute         = opcode_decode_to_execute;
assign  extend_imm_execute     = extend_imm_decode_to_execute;
assign  branch_target_execute  = branch_target_decode_to_execute;
assign  JAL_target_execute     = JAL_target_decode_to_execute;
assign  PC_execute             = PC_decode_to_execute;
assign  branch_op_execute      = branch_op_decode_to_execute;
assign  memRead_execute        = memRead_decode_to_execute;
assign  ALUOp_execute          = ALUOp_decode_to_execute;
assign  memWrite_execute       = memWrite_decode_to_execute;
assign  next_PC_select_execute    = next_PC_select_decode_to_execute;
assign  operand_A_sel_execute  = operand_A_sel_decode_to_execute;
assign  operand_B_sel_execute  = operand_B_sel_decode_to_execute;
assign  regWrite_execute       = regWrite_decode_to_execute;
assign  instruction_execute    = instruction_decode_to_execute;

always @(posedge clock) begin
    if(reset) begin
        rs1_data_decode_to_execute       <= {DATA_WIDTH{1'b0}};
        rs2_data_decode_to_execute       <= {DATA_WIDTH{1'b0}};
        funct7_decode_to_execute         <= 7'b0;
        funct3_decode_to_execute         <= 3'b0;
        rd_decode_to_execute             <= 5'b0;
        opcode_decode_to_execute         <= 7'b0;
        extend_imm_decode_to_execute     <= {DATA_WIDTH{1'b0}};
        branch_target_decode_to_execute  <= {ADDRESS_BITS{1'b0}};
        JAL_target_decode_to_execute     <= {ADDRESS_BITS{1'b0}};
        PC_decode_to_execute             <= {ADDRESS_BITS{1'b0}};
        branch_op_decode_to_execute      <= 1'b0;
        memRead_decode_to_execute        <= 1'b0;
        ALUOp_decode_to_execute          <= 3'b0;
        memWrite_decode_to_execute       <= 1'b0;
        next_PC_select_decode_to_execute    <= 2'b0;
        operand_A_sel_decode_to_execute  <= 2'b0;
        operand_B_sel_decode_to_execute  <= 1'b0;
        regWrite_decode_to_execute       <= 1'b0;
        instruction_decode_to_execute    <= NOP;
    end
    else if(stall) begin
         // Send ADDI zero zero 0
         rs1_data_decode_to_execute       <= 5'd0;
         rs2_data_decode_to_execute       <= 5'd0;
         funct7_decode_to_execute         <= 7'd0;
         funct3_decode_to_execute         <= 3'd0;
         rd_decode_to_execute             <= 5'd0;
         opcode_decode_to_execute         <= 7'h13; // ADDi
         branch_target_decode_to_execute  <= branch_target_decode; // pass through target, held by holding inst_PC
         JAL_target_decode_to_execute     <= JAL_target_decode; // pass through target, held by holding inst_PC
         branch_op_decode_to_execute      <= 1'b0;
         memRead_decode_to_execute        <= 1'b0;
         ALUOp_decode_to_execute          <= 3'd1; // I type
         memWrite_decode_to_execute       <= 1'b0;
         next_PC_select_decode_to_execute <= next_PC_select_execute; // hold PC select
         operand_A_sel_decode_to_execute  <= 2'd0;
         operand_B_sel_decode_to_execute  <= 1'b1; // 1 for I type
         regWrite_decode_to_execute       <= 1'b1; // Decoded as 1, regfile prevents actual write
         extend_imm_decode_to_execute     <= {DATA_WIDTH{1'b0}};
         PC_decode_to_execute             <= {ADDRESS_BITS{1'b0}}; // should be held constant in fetch
         instruction_decode_to_execute    <= NOP;
    end
    else if( (next_PC_select_execute != 2'b00) || (next_PC_select_memory != 2'b00) ) begin
         // Send ADDI zero zero 0
         rs1_data_decode_to_execute       <= 5'd0;
         rs2_data_decode_to_execute       <= 5'd0;
         funct7_decode_to_execute         <= 7'd0;
         funct3_decode_to_execute         <= 3'd0;
         rd_decode_to_execute             <= 5'd0;
         opcode_decode_to_execute         <= 7'h13; // ADDi
         branch_target_decode_to_execute  <= {ADDRESS_BITS{1'b0}};
         JAL_target_decode_to_execute     <= {ADDRESS_BITS{1'b0}};
         branch_op_decode_to_execute      <= 1'b0;
         memRead_decode_to_execute        <= 1'b0;
         ALUOp_decode_to_execute          <= 3'd1; // I type
         memWrite_decode_to_execute       <= 1'b0;
         next_PC_select_decode_to_execute <= 2'd0;
         operand_A_sel_decode_to_execute  <= 2'd0;
         operand_B_sel_decode_to_execute  <= 1'b1; // 1 for I type
         regWrite_decode_to_execute       <= 1'b1; // Decoded as 1, regfile prevents actual write
         extend_imm_decode_to_execute     <= {DATA_WIDTH{1'b0}};
         PC_decode_to_execute             <= {ADDRESS_BITS{1'b0}}; // should be held constant in fetch
         instruction_decode_to_execute    <= NOP;
    end
    else begin
        rs1_data_decode_to_execute       <= rs1_data_decode;
        rs2_data_decode_to_execute       <= rs2_data_decode;
        funct7_decode_to_execute         <= funct7_decode;
        funct3_decode_to_execute         <= funct3_decode;
        rd_decode_to_execute             <= rd_decode;
        opcode_decode_to_execute         <= opcode_decode;
        branch_target_decode_to_execute  <= branch_target_decode;
        JAL_target_decode_to_execute     <= JAL_target_decode;
        branch_op_decode_to_execute      <= branch_op_decode;
        memRead_decode_to_execute        <= memRead_decode;
        ALUOp_decode_to_execute          <= ALUOp_decode;
        memWrite_decode_to_execute       <= memWrite_decode;
        next_PC_select_decode_to_execute <= next_PC_select_decode;
        operand_A_sel_decode_to_execute  <= operand_A_sel_decode;
        operand_B_sel_decode_to_execute  <= operand_B_sel_decode;
        regWrite_decode_to_execute       <= regWrite_decode;
        extend_imm_decode_to_execute     <= extend_imm_decode;
        PC_decode_to_execute             <= PC_decode;
        // For Debugging
        instruction_decode_to_execute    <= instruction_decode;
     end
end
endmodule





`
    },
    memory: {
        filename: 'memory.v',
        fileContent: `/** @module : memory
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
    parameter ADDRESS_BITS = 12,
    parameter PRINT_CYCLES_MIN = 1,
    parameter PRINT_CYCLES_MAX = 1000
) (
    input clock,
    input reset,
    input stall,
    input load,
    input store,
    input [ADDRESS_BITS-1:0] address,
    input [DATA_WIDTH-1:0] store_data,


    output [ADDRESS_BITS-1:0] data_addr,
    output [DATA_WIDTH-1:0] load_data,
    output valid,
    output ready,
    input report
 
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
    .stall(stall),
    .read(load),
    .write(store),
    .address(address),
    .in_data(store_data),
    .out_addr(data_addr),
    .out_data(load_data),
    .valid(valid),
    .ready(ready),
    .report(report)
);

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
`
    },
    core: {
        filename: 'RISC_V_Core.v',
        fileContent: `/** @module : RISC_V_Core
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
  parameter PROGRAM = "../software/applications/binaries/factorial.vmh"
) (
  input clock,

  input reset,
  input start,
  input stall_in,
  input [ADDRESS_BITS-1:0] prog_address,

  // For I/O functions
  input [1:0] from_peripheral,
  input [31:0] from_peripheral_data,
  input from_peripheral_valid,

  // In-System Programmer Interface
  input [ADDRESS_BITS-1:0] isp_address,
  input [DATA_WIDTH-1:0] isp_data,
  input isp_write,

  output reg [1:0] to_peripheral,
  output reg [31:0] to_peripheral_data,
  output reg to_peripheral_valid,

  input report, // performance reporting
  output [ADDRESS_BITS-1:0] current_PC
);

// TODO: Break up wire declarations by module/stage
wire [31:0]  instruction_fetch;
wire [31:0]  instruction_decode;
// For Debug
wire [31:0]  instruction_execute;
wire [31:0]  instruction_memory;
wire [31:0]  instruction_writeback;

wire [ADDRESS_BITS-1: 0] inst_PC_fetch;
wire [ADDRESS_BITS-1: 0] inst_PC_decode;
wire i_valid, i_ready;
wire d_valid, d_ready;
wire [4:0] rs1_decode;
wire [4:0] rs2_decode;
wire stall;
wire [ADDRESS_BITS-1: 0] JAL_target_decode;
wire [ADDRESS_BITS-1: 0] JAL_target_execute;
wire [ADDRESS_BITS-1: 0] JAL_target_memory;
wire [ADDRESS_BITS-1: 0] JALR_target_execute;
wire [ADDRESS_BITS-1: 0] JALR_target_memory;
wire [ADDRESS_BITS-1: 0] branch_target_decode;
wire [ADDRESS_BITS-1: 0] branch_target_execute;

wire  write_writeback;
wire  [4:0]  write_reg_writeback;
wire  [DATA_WIDTH-1:0] write_data_writeback;

wire [DATA_WIDTH-1:0]  rs1_data_decode;
wire [DATA_WIDTH-1:0]  rs2_data_decode;
wire [4:0]   rd_decode;
wire [6:0]  opcode_decode;
wire [6:0]  funct7_decode;
wire [2:0]  funct3_decode;

wire [DATA_WIDTH-1:0]  rs1_data_execute;
wire [DATA_WIDTH-1:0]  rs2_data_execute;
wire [DATA_WIDTH-1:0]  rs2_data_memory;
wire [4:0]   rd_execute;

wire [ADDRESS_BITS-1: 0] PC_execute;
wire [6:0]  opcode_execute;
wire [6:0]  funct7_execute;
wire [2:0]  funct3_execute;

wire memRead_decode;
wire memRead_execute;

wire memRead_memory;
wire memRead_writeback;
wire [4:0]  rd_memory;
wire [4:0]  rd_writeback;
wire memtoReg;
wire [2:0] ALUOp_decode;
wire [2:0] ALUOp_execute;
wire branch_op_decode;
wire branch_op_execute;
wire [1:0] next_PC_select_decode;
wire [1:0] next_PC_select_execute;
wire [1:0] next_PC_select_memory;
wire [1:0] operand_A_sel_decode;
wire [1:0] operand_A_sel_execute;
wire operand_B_sel_decode;
wire operand_B_sel_execute;
wire [1:0] extend_sel_decode;
wire [DATA_WIDTH-1:0]  extend_imm_decode;
wire [DATA_WIDTH-1:0]  extend_imm_execute;

wire memWrite_decode;
wire memWrite_execute;
wire memWrite_memory;
wire regWrite_decode;
wire regWrite_execute;
wire regWrite_memory;
wire regWrite_writeback;

wire branch_execute;
wire [DATA_WIDTH-1:0]   ALU_result_execute;
wire [DATA_WIDTH-1:0]   ALU_result_memory;
wire [DATA_WIDTH-1:0]   ALU_result_writeback;
wire [ADDRESS_BITS-1:0] generated_addr = ALU_result_memory; // the case the address is not 32-bit


wire zero; // Have not done anything with this signal

wire [DATA_WIDTH-1:0]    memory_data_memory;
wire [DATA_WIDTH-1:0]    memory_data_writeback;
wire [ADDRESS_BITS-1: 0] memory_addr; // To use to check the address coming out the memory stage

wire [1:0]   PC_select_fetch_pipe;

assign current_PC = inst_PC_fetch;

fetch_unit #(CORE, DATA_WIDTH, INDEX_BITS, OFFSET_BITS, ADDRESS_BITS, PROGRAM,
              PRINT_CYCLES_MIN, PRINT_CYCLES_MAX ) IF (
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

        .isp_address(isp_address),
        .isp_data(isp_data),
        .isp_write(isp_write),

        .instruction(instruction_fetch),
        .inst_PC(inst_PC_fetch),
        .valid(i_valid),
        .ready(i_ready),
        .report(report)

);

fetch_pipe_unit #(DATA_WIDTH, ADDRESS_BITS) IF_ID(
        .clock(clock),
        .reset(reset),
        .stall(stall),
        .instruction_fetch(instruction_fetch),
        .inst_PC_fetch(inst_PC_fetch),

        .instruction_decode(instruction_decode),
        .inst_PC_decode(inst_PC_decode)
 );

decode_unit #(CORE, ADDRESS_BITS, PRINT_CYCLES_MIN,
              PRINT_CYCLES_MAX) ID (
        .clock(clock),
        .reset(reset),

        .instruction(instruction_decode),
        .PC(inst_PC_decode),
        .extend_sel(extend_sel_decode),
        .write(write_writeback),
        .write_reg(write_reg_writeback),
        .write_data(write_data_writeback),

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


stall_control_unit ID_S (
        .clock(clock),
        .rs1(rs1_decode),
        .rs2(rs2_decode),
        .regwrite_decode(regWrite_decode),
        .regwrite_execute(regWrite_execute),
        .regwrite_memory(regWrite_memory),
        .regwrite_writeback(regWrite_writeback),
        .rd_execute(rd_execute),
        .rd_memory(rd_memory),
        .rd_writeback(rd_writeback),

        .stall_needed(stall)
);

control_unit #(CORE, PRINT_CYCLES_MIN, PRINT_CYCLES_MAX ) CU (
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

decode_pipe_unit #(DATA_WIDTH, ADDRESS_BITS) ID_EU(
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
        .next_PC_select_memory(next_PC_select_memory),
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



execution_unit #(CORE, DATA_WIDTH, ADDRESS_BITS,
                 PRINT_CYCLES_MIN, PRINT_CYCLES_MAX) EU (
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

execute_pipe_unit #(DATA_WIDTH, ADDRESS_BITS) EU_MU (
        .clock(clock),
        .reset(reset),
        .stall(stall),
        .ALU_result_execute(ALU_result_execute),
        .store_data_execute(rs2_data_execute),
        .rd_execute(rd_execute),
        .memWrite_execute(memWrite_execute),
        .memRead_execute(memRead_execute),
        .next_PC_select_execute(next_PC_select_execute),
        .regWrite_execute(regWrite_execute),
        // For Debug
        .instruction_execute(instruction_execute),

        .ALU_result_memory(ALU_result_memory),
        .store_data_memory(rs2_data_memory),
        .rd_memory(rd_memory),
        .memWrite_memory(memWrite_memory),
        .memRead_memory(memRead_memory),
        .next_PC_select_memory(next_PC_select_memory),
        .regWrite_memory(regWrite_memory),
        // For Debug
        .instruction_memory(instruction_memory)
);

memory_unit #(CORE, DATA_WIDTH, INDEX_BITS, OFFSET_BITS, ADDRESS_BITS,
              PRINT_CYCLES_MIN, PRINT_CYCLES_MAX ) MU (
        .clock(clock),
        .reset(reset),
        .stall(stall),

        .load(memRead_memory),
        .store(memWrite_memory),
        .address(generated_addr),
        .store_data(rs2_data_memory),
        .data_addr(memory_addr),
        .load_data(memory_data_memory),
        .valid(d_valid),
        .ready(d_ready),

        .report(report)
);
memory_pipe_unit #(DATA_WIDTH, ADDRESS_BITS) MU_WB (

         .clock(clock),
         .reset(reset),

         .ALU_result_memory(ALU_result_memory),
         .load_data_memory(memory_data_memory),
         .opwrite_memory(regWrite_memory),
         .opsel_memory(memRead_memory),
         .opReg_memory(rd_memory),
         // For Debug
         .instruction_memory(instruction_memory),

         .ALU_result_writeback(ALU_result_writeback),
         .load_data_writeback(memory_data_writeback),
         .opwrite_writeback(regWrite_writeback),
         .opsel_writeback(memRead_writeback),
         .opReg_writeback(rd_writeback),
         // For Debug
         .instruction_writeback(instruction_writeback)

);

writeback_unit #(CORE, DATA_WIDTH, PRINT_CYCLES_MIN, PRINT_CYCLES_MAX) WB (
        .clock(clock),
        .reset(reset),
        .stall(stall),

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
`
    },
    decode: {
        filename: 'decode.v',
        fileContent: `/** @module : decode
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
 // 32-bit Decoder
module decode_unit #(parameter CORE = 0, ADDRESS_BITS = 20,
                      PRINT_CYCLES_MIN = 1, PRINT_CYCLES_MAX = 1000  )(
       clock, reset,
       PC, instruction,
       extend_sel,
       // TODO: rename write_reg to write_sel to match read_sel signals. This
       // is more clear. -Alan
       write, write_reg, write_data, 

       opcode, funct3, funct7,
       rs1_data, rs2_data, rd, 
       extend_imm,
       branch_target, 
       JAL_target, 
       rs1,  rs2,
       report
); 
 
input  clock; 
input  reset; 
input  [ADDRESS_BITS-1:0] PC;
input  [31:0] instruction; 
input  [1:0] extend_sel; 
input  write;
input  [4:0]  write_reg;
input  [31:0] write_data;

output [31:0] rs1_data; 
output [31:0] rs2_data;
output [4:0]  rd;  
output [6:0]  opcode;
output [6:0]  funct7; 
output [2:0]  funct3;
output [31:0] extend_imm;
output [ADDRESS_BITS-1:0] branch_target; 
output [ADDRESS_BITS-1:0] JAL_target;
output [4:0] rs1;
output [4:0] rs2;
input report; 

// Read registers
assign  rs2           = instruction[24:20];
assign  rs1           = instruction[19:15];

wire[11:0] i_imm      = instruction[31:20];
wire[6:0]  s_imm_msb  = instruction[31:25];
wire[4:0]  s_imm_lsb  = instruction[11:7];
wire[19:0] u_imm      = instruction[31:12];
wire[11:0] i_imm_orig = instruction[31:20]; 
wire[19:0] uj_imm     = {instruction[31],instruction[19:12],instruction[20],instruction[30:21]};

//Forming the s immediate value from the two msb and lsb parts of the s immediate
wire[11:0] s_imm_orig     = {s_imm_msb,s_imm_lsb};
wire[12:0] sb_imm_orig    = {s_imm_msb[6],s_imm_lsb[0],s_imm_msb[5:0],s_imm_lsb[4:1],1'b0};

/* Instruction decoding */
assign opcode        = instruction[6:0];
assign funct7        = instruction[31:25];
assign funct3        = instruction[14:12];

/* Write register */
assign  rd           = instruction[11:7];

/* Only workig with BEQ at the moment */
wire[31:0] sb_imm_32      = {{19{sb_imm_orig[12]}}, sb_imm_orig};
assign branch_target      = PC + sb_imm_32;

/* Extensions */
wire[31:0] u_imm_32       = {u_imm,12'b0};
wire[31:0] i_imm_32       = {{20{i_imm_orig[11]}}, i_imm_orig[11:0] };
wire[31:0] s_imm_32       = {{20{s_imm_orig[11]}}, s_imm_orig};

assign extend_imm         = (extend_sel == 2'b01)? s_imm_32 : 
                            (extend_sel == 2'b10)? u_imm_32 : i_imm_32;

/* Only JAL Target. JALR happens in the execution unit*/
wire[31:0] uj_imm_32      = {{11{uj_imm[19]}},uj_imm[19:0],1'b0}; 
assign JAL_target         = uj_imm_32 + PC;

regFile #(32, 5) registers (
                .clock(clock), 
                .reset(reset), 
                .read_sel1(rs1), 
                .read_sel2(rs2),
                .wEn(write), 
                .write_sel(write_reg), 
                .write_data(write_data), 
                .read_data1(rs1_data), 
                .read_data2(rs2_data)
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
`
    },
};

exports.modules = fiveStagePipelineStallBaseModules;
exports.documentation = fiveStagePipelineStallBaseDocumentation;
