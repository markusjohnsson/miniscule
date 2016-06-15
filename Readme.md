miniscule
=========

Strongly typed, fluent style SQL query builder for TypeScript

Example:

```typescript
miniscule
=========

Strongly typed, fluent style SQL query builder for TypeScript

Example:

```
import Mini from "../miniscule"; 

class department {
    department_id: number = 0; 
    name: string;
}

class user {
    user_id: number;
    department_id: number;
    email: string = null;
}

console.log(Mini
    .from(department)
    .join(
        Mini.from(user),
        department => department.department_id,
        user => user.department_id,
        (department, user) => ({ 
            departmentId: department.department_id, 
            email: user.email,
            departmentName : department.name
        }))
    .toString())
    ;

```

```