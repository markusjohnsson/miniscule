var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var esprima = require('esprima');
var Mini = (function () {
    function Mini(inner, fieldType, fieldsMapping) {
        if (fieldsMapping === void 0) { fieldsMapping = null; }
        this.inner = inner;
        this.fieldType = fieldType;
        this.fieldsMapping = fieldsMapping;
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
    Mini.getTableId = function (table, context) {
        var idx = context.tables.indexOf(table);
        if (idx == -1) {
            idx = context.tables.length;
            context.tables.push(table);
        }
        return "t" + idx;
    };
    Mini.prototype.wrapTable = function (str, depth, context, noParens) {
        if (noParens === void 0) { noParens = false; }
        if (depth == 0)
            return str;
        else {
            for (var indent = ""; indent.length < depth; indent += " ")
                ;
            return "\n" + indent + (noParens ? "" : "(") + str + (noParens ? " " : ") ") + Mini.getTableId(this, context) + "\n" + indent;
        }
    };
    Mini.prototype.getResultTypeInstance = function () {
        if (typeof this.fieldType === "function")
            return new this.fieldType();
        else
            return this.fieldType;
    };
    Mini.prototype.getFields = function () {
        if (this.fieldsMapping)
            return this.fieldsMapping;
        var fields = [];
        var resultInstance = this.getResultTypeInstance();
        for (var prop in resultInstance)
            fields.push({ from: prop });
        return fields;
    };
    Mini.prototype.getSelectFrom = function () {
        var fields = this.getFields();
        return "select " + fields.map(function (m) { return m.to ? m.from + " as " + m.to : m.from; }).join(",") + " from ";
    };
    Mini.prototype.toString = function () {
        return this.toSqlString(0, { tables: [] });
    };
    return Mini;
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Mini;
var Select = (function (_super) {
    __extends(Select, _super);
    function Select(inner, selector) {
        _super.call(this, inner, Select.getType(inner, selector), Select.getFieldsMapping(inner, selector));
    }
    Select.getType = function (inner, selector) {
        var m = inner.getResultTypeInstance();
        var r = selector(m);
        switch (typeof r) {
            case 'object':
                if (r.constructor == Object)
                    return r;
                else
                    return r.constructor;
            case 'number':
            case 'string':
            case 'boolean':
                throw new Error(".select(): values must be wrapped in objects, e.g. `row => ({ value: row.value })`");
        }
        throw new Error(".select(): cannot get type from selector");
    };
    Select.getFieldsMapping = function (inner, selector) {
        var ast = reflect.getAst(selector);
        var arg = reflect.getArgs(selector)[0];
        var getPath = function (e) {
            var obj = cast(e.object, 'Identifier');
            var prop = cast(e.property, 'Identifier');
            assert(obj.name == arg, "Unknown root " + obj.name);
            return prop.name;
        };
        var obj = cast(ast, 'ObjectExpression');
        return obj.properties.map(function (p) { return ({
            from: getPath(cast(p.value, 'MemberExpression')),
            to: cast(p.key, 'Identifier').name
        }); });
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
        var ast = reflect.getAst(this.predicate);
        var arg = reflect.getArgs(this.predicate)[0];
        var mapOperator = function (op) {
            switch (op) {
                case '===': return '=';
                case '==': return '=';
                case '!=': return '<>';
                case '<': return '<';
                case '>': return '>';
                case '&&': return 'and';
                case '||': return 'or';
            }
            throw new Error("operator not supported: " + op);
        };
        var format = function (exp) {
            switch (exp.type) {
                case 'Identifier':
                    return exp.name;
                case 'MemberExpression':
                    var obj = cast(exp.object, 'Identifier');
                    assert(obj.name == arg, "Unknown root " + obj.name);
                    return format(exp.property);
                case 'BinaryExpression':
                    var be = exp;
                    return "(" + format(be.left) + " " + mapOperator(be.operator) + " " + format(be.right) + ")";
                case 'Literal':
                    var literal = exp;
                    return literal.value;
                default:
                    throw new Error("expression not supported: " + exp.type);
            }
        };
        return this.wrapTable(this.getSelectFrom() + this.inner.toSqlString(depth + 1, context) +
            " where " + format(ast), depth, context);
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
        var innerId = Mini.getTableId(this.inner, context);
        var outerId = Mini.getTableId(this.outer, context);
        var innerSql = (this.inner instanceof Table) ?
            this.inner.toSqlName(depth + 1, context) :
            this.inner.toSqlString(depth + 1, context);
        var outerSql = (this.outer instanceof Table) ?
            this.outer.toSqlName(depth + 1, context) :
            this.outer.toSqlString(depth + 1, context);
        return this.wrapTable(this.getSelectFrom() + innerSql +
            " join " + outerSql +
            " on " + innerId + "." + inner + " = " + outerId + "." + other, depth, context);
    };
    return Join;
})(Mini);
exports.Join = Join;
var Table = (function (_super) {
    __extends(Table, _super);
    function Table(tableType) {
        _super.call(this, null, tableType);
        this.tableType = tableType;
    }
    Table.prototype.toSqlName = function (depth, context) {
        var tableName = this.tableType.name;
        return this.wrapTable(tableName, depth, context, true);
    };
    Table.prototype.toSqlString = function (depth, context) {
        var tableName = this.tableType.name;
        return this.wrapTable(this.getSelectFrom() + tableName, depth, context);
    };
    return Table;
})(Mini);
exports.Table = Table;
function assert(assertion, message) {
    if (!assertion)
        throw new Error(message);
}
function cast(expression, expressionTypeName) {
    assert(expression.type == expressionTypeName, "Unexpected expression type " + expression.type + ", expected " + expressionTypeName);
    return expression;
}
var reflect;
(function (reflect) {
    var propRegex = /return [a-zA-Z0-9_]+.([a-zA-Z0-9_]*);/;
    reflect.getProperty = function (f) {
        var str = f.toString();
        var m = str.match(propRegex);
        if (m.length != 2)
            throw new Error("Unable to parse single property");
        return m[1];
    };
    reflect.getAst = function (func) {
        var es = esprima.parse("(" + func.toString() + ")");
        var ftn = es.body[0].expression;
        var body;
        if (ftn.body.type == "BlockStatement") {
            var block = ftn.body;
            if (block.body.length != 1 || block.body[0].type != "ReturnStatement")
                throw "Function must only contain a single return statement.";
            body = block.body[0].argument;
        }
        else {
            body = ftn.body;
        }
        return body;
    };
    reflect.getArgs = function (func) {
        var es = esprima.parse("(" + func.toString() + ")");
        var ftn = es.body[0].expression;
        return ftn.params.map(function (p) { return p.name; });
    };
})(reflect || (reflect = {}));
