var miniscule_1 = require("../miniscule");
console.log(miniscule_1.default
    .from("shipaddress", ["ship_id", "address_id as s_address_id"])
    .join(miniscule_1.default.from("address", ["address_id", "prefix"]), "s_address_id = address_id")
    .where("ship_id > 123")
    .where("ship_id < 500")
    .select(["prefix"])
    .toString());
