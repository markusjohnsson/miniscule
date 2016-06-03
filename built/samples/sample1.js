var miniscule_1 = require("../miniscule");
var shipadress = (function () {
    function shipadress() {
        this.ship_id = 0;
        this.address_id = 0;
    }
    return shipadress;
})();
var address = (function () {
    function address() {
        this.address_id = 0;
        this.prefix = "";
    }
    return address;
})();
console.log(miniscule_1.default.from(shipadress).toString());
console.log(miniscule_1.default.from(address).toString());
console.log(miniscule_1.default.from(address).where("ship_id < 500").toString());
console.log(miniscule_1.default
    .from(shipadress)
    .join(miniscule_1.default.from(address), function (s) { return s.address_id; }, function (s) { return s.address_id; }, function (s, a) { return ({ ship_id: s.ship_id, prefix: a.prefix }); })
    .where("ship_id > 123")
    .where("ship_id < 500")
    .select(function (s) { return s.prefix; })
    .toString());
