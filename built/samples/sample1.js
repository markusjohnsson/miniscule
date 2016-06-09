var miniscule_1 = require("../miniscule");
var shipaddress = (function () {
    function shipaddress() {
        this.ship_id = 0;
        this.address_id = 0;
    }
    return shipaddress;
})();
var address = (function () {
    function address() {
        this.address_id = 0;
        this.prefix = "";
    }
    return address;
})();
console.log(miniscule_1.default.from(shipaddress).select(function (a) { return ({ address_id: a.address_id }); }).toString());
// console.log(Mini.from(address).toString());
// console.log(Mini.from(address).where("ship_id < 500").toString());
console.log(miniscule_1.default
    .from(shipaddress)
    .join(miniscule_1.default.from(address).where(function (p) { return p.address_id < 500; }), function (s) { return s.address_id; }, function (s) { return s.address_id; }, function (s, a) { return ({ myShip: s.ship_id, thatPrefix: a.prefix }); })
    .where(function (s) { return s.myShip > 123; })
    .where(function (s) { return s.myShip < 500; })
    .select(function (s) { return ({ myPrefix: s.thatPrefix, myShipId: s.myShip }); })
    .toString());
