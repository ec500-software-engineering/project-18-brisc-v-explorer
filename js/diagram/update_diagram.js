onload = function () {

  // Address Bits Update
  var e = document.getElementById('address_bits');
  e.oninput = function (inputEvent) {
    var svg_ids = ['i_mem_size', 'd_mem_size'];
    update_svg('address_bits', svg_ids);
  };
};

function update_svg (input_id, svg_ids) {
  var e = document.getElementById(input_id);
  e.oninput = function (inputEvent) {
    var text_value = document.getElementById(input_id).value;
    var text_number = parseInt(text_value,10);
    var svg_text = (2**text_number).toString()+"B"
    for (var i=0; i<svg_ids.length; i++) {
      var svg_id = svg_ids[i];
      changeText(svg_id, svg_text);
    }

  };
};

