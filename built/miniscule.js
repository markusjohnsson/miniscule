var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Mini = (function () {
    function Mini(inner, fieldType) {
        this.inner = inner;
        this.fieldType = fieldType;
    }
    Mini.from = function (table) { return new Table(table); };
    Mini.prototype.select = function (selector) { return new Select(this, selector); };
    Mini.prototype.where = function (predicate) { return new Where(this, predicate); };
    Mini.prototype.join = function (other, innerKeySelector, otherKeySelector, selector) {
        return new Join(this, other, innerKeySelector, otherKeySelector, selector);
    };
    Mini.prototype.toSqlString = function (depth, context) {
        return "not implemented";
    };
    Mini.prototype.getTableId = function (context) {
        return "t" + (context.tables++);
    };
    Mini.prototype.wrapTable = function (str, depth, context) {
        if (depth == 0)
            return str;
        else {
            for (var indent = ""; indent.length < depth; indent += " ")
                ;
            return "\n" + indent + "(" + str + ") " + this.getTableId(context) + "\n" + indent;
        }
    };
    Mini.prototype.getResultTypeInstance = function () {
        if (typeof this.fieldType === "function")
            return new this.fieldType();
        else
            return this.fieldType;
    };
    Mini.prototype.getSelectFrom = function () {
        var fields = [];
        var resultInstance = this.getResultTypeInstance();
        for (var prop in resultInstance)
            fields.push(prop);
        return "select " + fields.join(",") + " from ";
    };
    Mini.prototype.toString = function () {
        return this.toSqlString(0, { tables: 0 });
    };
    return Mini;
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Mini;
var Select = (function (_super) {
    __extends(Select, _super);
    function Select(inner, selector) {
        _super.call(this, inner, Select.getType(inner, selector));
    }
    Select.getType = function (inner, selector) {
        var m = inner.getResultTypeInstance();
        var r = selector(m);
        if (r.constructor == Object)
            return r;
        return r.constructor;
    };
    Select.prototype.toSqlString = function (depth, context) {
        return this.wrapTable(this.getSelectFrom() + this.inner.toSqlString(depth + 1, context), depth, context);
    };
    return Select;
})(Mini);
exports.Select = Select;
var Where = (function (_super) {
    __extends(Where, _super);
    function Where(inner, predicate) {
        _super.call(this, inner, inner.fieldType);
        this.predicate = predicate;
    }
    Where.prototype.toSqlString = function (depth, context) {
        return this.wrapTable(this.getSelectFrom() + this.inner.toSqlString(depth + 1, context) +
            " where " + this.predicate, depth, context);
    };
    return Where;
})(Mini);
exports.Where = Where;
var Join = (function (_super) {
    __extends(Join, _super);
    function Join(inner, outer, innerKeySelector, otherKeySelector, selector) {
        _super.call(this, inner, Join.getType(inner, outer, selector));
        this.outer = outer;
        this.innerKeySelector = innerKeySelector;
        this.otherKeySelector = otherKeySelector;
        this.selector = selector;
    }
    Join.getType = function (inner, outer, selector) {
        var i = inner.getResultTypeInstance();
        var o = outer.getResultTypeInstance();
        var r = selector(i, o);
        if (r.constructor == Object)
            return r;
        return r.constructor;
    };
    Join.prototype.toSqlString = function (depth, context) {
        var inner = reflect.getProperty(this.innerKeySelector);
        var other = reflect.getProperty(this.otherKeySelector);
        return this.wrapTable(this.getSelectFrom() + this.inner.toSqlString(depth + 1, context) +
            " join " + this.outer.toSqlString(depth + 1, context) + " on " + inner + " = " + other, depth, context);
    };
    return Join;
})(Mini);
exports.Join = Join;
var reflect;
(function (reflect) {
    var propRegex = /return [a-zA-Z0-9_]+.([a-zA-Z0-9_]*);/;
    reflect.getProperty = function (f) {
        var str = f.toString();
        var m = str.match(propRegex);
        console.log(str);
        if (m.length != 2)
            throw new Error("Unable to parse single property");
        return m[1];
    };
})(reflect || (reflect = {}));
var Table = (function (_super) {
    __extends(Table, _super);
    function Table(tableType) {
        _super.call(this, null, tableType);
        this.tableType = tableType;
    }
    Table.prototype.toSqlString = function (depth, context) {
        var tableName = this.tableType.name;
        return this.wrapTable(this.getSelectFrom() + tableName, depth, context);
    };
    return Table;
})(Mini);
exports.Table = Table;
