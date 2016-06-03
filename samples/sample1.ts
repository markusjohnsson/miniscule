
import Mini from "../miniscule"; 

class shipadress {
    ship_id: number = 0;
    address_id: number = 0;
}

class address {
    address_id: number = 0;
    prefix: string = "";
}

console.log(Mini.from(shipadress).toString());
console.log(Mini.from(address).toString());
console.log(Mini.from(address).where("ship_id < 500").toString());


console.log(Mini
    .from(shipadress)
    .join(
        Mini.from(address), 
        s => s.address_id,
        s => s.address_id, 
        (s, a) => ({ ship_id: s.ship_id, prefix: a.prefix }))
    .where("ship_id > 123")
    .where("ship_id < 500")
    .select(s => s.prefix)
    .toString())
    ;
