"use strict";
var miniscule_1 = require("../miniscule");
var department = (function () {
    function department() {
        this.department_id = 0;
        this.name = null;
    }
    return department;
}());
var user = (function () {
    function user() {
        this.name = null;
        this.email = null;
    }
    return user;
}());
console.log(miniscule_1.default.from(department).toString());
// select department_id, name from department
console.log(miniscule_1.default
    .from(department)
    .select(function (d) { return ({ name: d.name }); })
    .toString());
// select name as name from 
//  (select department_id, name from department) t0
console.log(miniscule_1.default
    .from(department)
    .where(function (d) { return d.name == "IT"; })
    .toString());
// select department_id, name from 
//  (select department_id, name from department) t0
//   where (name = IT)
console.log(miniscule_1.default
    .from(department)
    .join(miniscule_1.default.from(user), function (department) { return department.department_id; }, function (user) { return user.department_id; }, function (department, user) { return ({
    user: user.user_id,
    name: user.name,
    email: user.email,
    departmentId: department.department_id,
    departmentName: department.name
}); })
    .toString());
// select t1.user_id as user, t1.name as name, t1.email as email, t0.department_id as departmentId, t0.name as departmentName from 
//  department t0
//   join 
//  user t1
//   on t0.department_id = t1.department_id
