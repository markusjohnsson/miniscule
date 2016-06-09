
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
        (s, a) => ({ myShip: s.ship_id, thatPrefix: a.prefix }))
    .where(s => s.myShip > 123)
    .where(s => s.myShip < 500)
    .select(s => ({ myPrefix: s.thatPrefix, myShipId: s.myShip }))
    .toString())
    ;
