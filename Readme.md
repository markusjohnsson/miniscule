miniscule
=========

Strongly typed, fluent style SQL query builder for TypeScript

Example:

```typescript

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

```