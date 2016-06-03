
import Mini from "../miniscule"; 

console.log(Mini
    .from("shipaddress", ["ship_id", "address_id as s_address_id"])
    .join(Mini.from("address", ["address_id", "prefix"]), "s_address_id = address_id")
    .where("ship_id > 123")
    .where("ship_id < 500")
    .select(["prefix"])
    .toString())
    ;
