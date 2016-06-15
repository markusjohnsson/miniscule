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
