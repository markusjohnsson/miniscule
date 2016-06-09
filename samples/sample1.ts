
import Mini from "../miniscule"; 

class shipaddress {
    ship_id: number = 0;
    address_id: number = 0;
}

class address {
    address_id: number = 0;
    prefix: string = "";
}

console.log(Mini.from(shipaddress).select(a => ({ address_id: a.address_id})).toString());
// console.log(Mini.from(address).toString());
// console.log(Mini.from(address).where("ship_id < 500").toString());


console.log(Mini
    .from(shipaddress)
    .join(
        Mini.from(address), 
        s => s.address_id, 
        s => s.address_id, 
        (s, a) => ({ ship_id: s.ship_id, prefix: a.prefix }))
    .where(s => s.ship_id > 123)
    .where(s => s.ship_id < 500)
    .select(s => ({ myPrefix: s.prefix, myShipId: s.ship_id }))
    .toString())
    ;
