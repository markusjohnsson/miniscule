var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Mini = (function () {
    function Mini(inner, fields) {
        this.inner = inner;
        this.fields = fields;
    }
    Mini.from = function (table, fields) { return new Table(table, fields); };
    Mini.prototype.select = function (fields) { return new Select(this, fields); };
    Mini.prototype.where = function (predicate) { return new Where(this, predicate); };
    Mini.prototype.join = function (other, predicate) { return new Join(this, other, predicate); };
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
    Mini.prototype.getSelectFrom = function () {
        return "select " + this.fields.join(",") + " from ";
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
    function Select(inner, fields) {
        _super.call(this, inner, fields);
    }
    Select.prototype.toSqlString = function (depth, context) {
        return this.wrapTable(this.getSelectFrom() + this.inner.toSqlString(depth + 1, context), depth, context);
    };
    return Select;
})(Mini);
exports.Select = Select;
var Where = (function (_super) {
    __extends(Where, _super);
    function Where(inner, predicate) {
        _super.call(this, inner, inner.fields);
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
    function Join(inner, other, predicate) {
        _super.call(this, inner, inner.fields.concat(other.fields));
        this.other = other;
        this.predicate = predicate;
    }
    Join.prototype.toSqlString = function (depth, context) {
        return this.wrapTable(this.getSelectFrom() + this.inner.toSqlString(depth + 1, context) +
            " join " + this.other.toSqlString(depth + 1, context) + " on " + this.predicate, depth, context);
    };
    return Join;
})(Mini);
exports.Join = Join;
var Table = (function (_super) {
    __extends(Table, _super);
    function Table(tableName, fields) {
        _super.call(this, null, fields);
        this.tableName = tableName;
    }
    Table.prototype.toSqlString = function (depth, context) {
        return this.wrapTable(this.getSelectFrom() + this.tableName, depth, context);
    };
    return Table;
})(Mini);
exports.Table = Table;
