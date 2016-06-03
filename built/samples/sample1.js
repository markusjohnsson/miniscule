var miniscule_1 = require("../miniscule");
var shipadress = (function () {
    function shipadress() {
    }
    return shipadress;
})();
var address = (function () {
    function address() {
    }
    return address;
})();
console.log(miniscule_1.default
    .from(shipadress, ["ship_id", "address_id as s_address_id"])
    .join(miniscule_1.default.from(address, ["address_id", "prefix"]), "s_address_id = address_id")
    .where("ship_id > 123")
    .where("ship_id < 500")
    .select(["prefix"])
    .toString());
