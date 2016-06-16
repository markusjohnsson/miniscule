
import Mini from "../miniscule"; 

class department {
    department_id: number = 0; 
    name: string = null;
}

class user {
    user_id: number;
    department_id: number;
    name: string = null;
    email: string = null;
}

console.log(Mini.from(department).toString());
// select department_id, name from department


console.log(Mini
    .from(department)
    .select(d => ({ name: d.name }))
    .toString());
// select name as name from 
//  (select department_id, name from department) t0

console.log(Mini
    .from(department)
    .where(d => d.name == "IT")
    .toString());
// select department_id, name from 
//  (select department_id, name from department) t0
//   where (name = IT)

console.log(Mini
    .from(department)
    .join(
        Mini.from(user),
        department => department.department_id,
        user => user.department_id,
        (department, user) => ({
            user: user.user_id, 
            name: user.name, 
            email: user.email,
            departmentId: department.department_id,
            departmentName : department.name
        }))
    .toString())
    ;
// select t1.user_id as user, t1.name as name, t1.email as email, t0.department_id as departmentId, t0.name as departmentName from 
//  department t0
//   join 
//  user t1
//   on t0.department_id = t1.department_id
