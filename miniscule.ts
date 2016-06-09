
import esprima = require('esprima');

export interface Type<T> {
    new (): T;
}

interface IEmitContext { tables: Mini<any>[] }

export default class Mini<T> {
    constructor(public inner: Mini<any>, public fieldType: Type<T> | T) { }

    static from<T>(table: Type<T>): Mini<T> { return new Table<T>(table); }

    select<TResult>(selector: (t: T) => TResult): Mini<TResult> { return new Select<T, TResult>(this, selector); }

    where(predicate: (t: T) => boolean): Mini<T> { return new Where<T>(this, predicate); }

    join<T2, TKey, TResult>(
        other: Mini<T2>,
        innerKeySelector: (t: T) => TKey,
        otherKeySelector: (t: T2) => TKey,
        selector: (t: T, t2: T2) => TResult): Mini<TResult> {
        return new Join<T, T2, TKey, TResult>(this, other, innerKeySelector, otherKeySelector, selector);
    }

    toSqlString(depth: number, context: IEmitContext) {
        return "not implemented"
    }

    protected static getTableId(table: Mini<any>, context: IEmitContext) {
        let idx = context.tables.indexOf(table);
        if (idx == -1) {
            idx = context.tables.length;
            context.tables.push(table);
        }
        return "t" + idx;
    }

    protected wrapTable(str: string, depth: number, context: IEmitContext, noParens: boolean = false) {
        if (depth == 0)
            return str;
        else {
            for (var indent = ""; indent.length < depth; indent += " ");
            return "\n" + indent + (noParens?"":"(") + str + (noParens?" ":") ") + Mini.getTableId(this, context) + "\n" + indent;
        }
    }

    public getResultTypeInstance(): T {
        if (typeof this.fieldType === "function")
            return new (<Type<T>>this.fieldType)();
        else
            return <T>this.fieldType;
    }

    protected getFields(context: IEmitContext) {
        let fields = [];
        let resultInstance = this.getResultTypeInstance();
        for (let prop in resultInstance)
            fields.push({ from: prop });
        return fields;
    }

    protected getSelectFrom(context: IEmitContext) {
        let fields = this.getFields(context);
        return `select ${fields.map(m => m.to ? `${m.from} as ${m.to}` : m.from).join(", ")} from `;
    }

    toString() {
        return this.toSqlString(0, { tables: [] });
    }
}

class Select<T, TResult> extends Mini<TResult> {

    private static getType<T, TResult>(inner: Mini<T>, selector: (t: T) => TResult): Type<TResult> | TResult {
        let m = inner.getResultTypeInstance();
        let r = selector(m);
        switch (typeof r) {
            case 'object':
                if (r.constructor == Object)
                    return r;
                else
                    return <Type<TResult>>r.constructor;
            case 'number':
            case 'string':
            case 'boolean':
                throw new Error(".select(): values must be wrapped in objects, e.g. `row => ({ value: row.value })`");
            // let propname = reflect.getProperty(selector);
            // let result = {};
            // result[propname] = propname;
            // return <TResult>result;
        }
        throw new Error(".select(): cannot get type from selector");
    }

    protected getFields(context: IEmitContext): { from: string; to: string }[] {
        
        let selector = this.selector;
        let ast = reflect.getAst(selector);
        let arg = reflect.getArgs(selector)[0];
        
        let getPath = (e: ESTree.MemberExpression) => {
            let obj = cast<ESTree.Identifier>(e.object, 'Identifier');
            let prop = cast<ESTree.Identifier>(e.property, 'Identifier');
            assert(obj.name == arg, "Unknown root " + obj.name);
            return prop.name;
        }
        
        let obj = cast<ESTree.ObjectExpression>(ast, 'ObjectExpression');
        return obj.properties.map(
            p => ({ 
                from: getPath(cast<ESTree.MemberExpression>(p.value, 'MemberExpression')),
                to: cast<ESTree.Identifier>(p.key, 'Identifier').name 
            }) );
    }

    constructor(inner: Mini<T>, private selector: (t: T) => TResult) {
        super(inner, Select.getType(inner, selector));
    }

    toSqlString(depth: number, context: IEmitContext) {
        return this.wrapTable(
            this.getSelectFrom(context) + this.inner.toSqlString(depth + 1, context), depth, context);
    }
}

class Where<T> extends Mini<T> {
    constructor(inner: Mini<T>, public predicate: (t: T) => boolean) { super(inner, inner.fieldType); }

    toSqlString(depth: number, context: IEmitContext) {
        
        let ast = reflect.getAst(this.predicate);
        let arg = reflect.getArgs(this.predicate)[0];
        
        let mapOperator = (op: string) => {
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
        }
        
        let format = (exp: ESTree.Expression) => {
            switch (exp.type) {
                case 'Identifier':
                    return (<ESTree.Identifier>exp).name;
                case 'MemberExpression':
                    let obj = cast<ESTree.Identifier>((<ESTree.MemberExpression>exp).object, 'Identifier');
                    assert(obj.name == arg, "Unknown root " + obj.name);
                    return format((<ESTree.MemberExpression>exp).property);
                case 'BinaryExpression':
                    let be = <ESTree.BinaryExpression>exp;
                    return `(${format(be.left)} ${mapOperator(be.operator)} ${format(be.right)})`;
                case 'Literal':
                    let literal = <ESTree.Literal>exp;
                    return literal.value;
                default:
                    throw new Error("expression not supported: " + exp.type);
            }
        }
        
        return this.wrapTable(
            this.getSelectFrom(context) + this.inner.toSqlString(depth + 1, context) +
            " where " + format(ast), depth, context);
    }
}

class Join<T1, T2, TKey, TResult> extends Mini<TResult> {

    private static getType<T1, T2, TResult>(inner: Mini<T1>, outer: Mini<T2>, selector: (t1: T1, t2: T2) => TResult): Type<TResult> | TResult {
        let i = inner.getResultTypeInstance();
        let o = outer.getResultTypeInstance();
        let r = selector(i, o);
        if (r.constructor == Object)
            return r;
        return <Type<TResult>>r.constructor;
    }

    protected getFields(context: IEmitContext): { from: string; to: string }[] {
        
        let selector = this.selector;
        let ast = reflect.getAst(selector);
        let args = reflect.getArgs(selector);
        
        let getPath = (e: ESTree.MemberExpression) => {
            let obj = cast<ESTree.Identifier>(e.object, 'Identifier');
            let prop = cast<ESTree.Identifier>(e.property, 'Identifier');
            assert(obj.name == args[0] || obj.name == args[1], "Unknown root " + obj.name);
            let host = (obj.name == args[0]) ? Mini.getTableId(this.inner, context) : Mini.getTableId(this.outer, context);
            return host + "." + prop.name;
        }
        
        let obj = cast<ESTree.ObjectExpression>(ast, 'ObjectExpression');
        return obj.properties.map(
            p => ({ 
                from: getPath(cast<ESTree.MemberExpression>(p.value, 'MemberExpression')),
                to: cast<ESTree.Identifier>(p.key, 'Identifier').name 
            }) );
    }

    constructor(
        inner: Mini<T1>,
        private outer: Mini<T2>,
        private innerKeySelector: (t: T1) => TKey,
        private otherKeySelector: (t: T2) => TKey,
        private selector: (t1: T1, t2: T2) => TResult) {
        super(inner, Join.getType(inner, outer, selector));
    }

    toSqlString(depth: number, context: IEmitContext) {
        let inner = reflect.getProperty(this.innerKeySelector);
        let other = reflect.getProperty(this.otherKeySelector);
        let innerId = Mini.getTableId(this.inner, context);
        let outerId = Mini.getTableId(this.outer, context);
        
        let innerSql =  (this.inner instanceof Table)  ? 
            (<Table<any>>this.inner).toSqlName(depth + 1, context) :
            this.inner.toSqlString(depth + 1, context);
        
        let outerSql =  (this.outer instanceof Table)  ? 
            (<Table<any>>this.outer).toSqlName(depth + 1, context) :
            this.outer.toSqlString(depth + 1, context);
        
        return this.wrapTable(
            this.getSelectFrom(context) + innerSql +
            " join " + outerSql + 
            " on " + innerId + "." + inner + " = " + outerId + "." + other, 
            depth, context);
    }
}


class Table<T> extends Mini<T> {
    constructor(public tableType: Type<T>) { super(null, tableType); }
    
    toSqlName(depth: number, context: IEmitContext){
        let tableName = (<any>this.tableType).name;
        return this.wrapTable(tableName, depth, context, true);
    }
    
    toSqlString(depth: number, context: IEmitContext) {
        let tableName = (<any>this.tableType).name;
        return this.wrapTable(this.getSelectFrom(context) + tableName, depth, context);
    }
}

function assert(assertion: boolean, message: string) {
    if (! assertion)
        throw new Error(message);
}

function cast<T extends ESTree.Expression>(expression: ESTree.Expression, expressionTypeName: string): T {
    assert(expression.type == expressionTypeName, `Unexpected expression type ${expression.type}, expected ${expressionTypeName}`) 
    
    return <T>expression;
}

module reflect {
    let propRegex = /return [a-zA-Z0-9_]+.([a-zA-Z0-9_]*);/;

    export let getProperty = (f: Function) => {
        let str = f.toString();
        let m = str.match(propRegex);
        if (m.length != 2)
            throw new Error("Unable to parse single property");
        return m[1];
    }

    export let getAst = (func: Function): ESTree.Expression => {

        var es = esprima.parse("(" + func.toString() + ")");

        var ftn = (<ESTree.FunctionExpression>(<ESTree.ExpressionStatement>es.body[0]).expression);
        var body: ESTree.Expression;

        if (ftn.body.type == "BlockStatement") {
            var block = (<ESTree.BlockStatement>ftn.body);
            if (block.body.length != 1 || block.body[0].type != "ReturnStatement")
                throw "Function must only contain a single return statement.";
            body = (<ESTree.ReturnStatement>block.body[0]).argument;
        }
        else {
            body = ftn.body;
        }

        return body;
    }

    export let getArgs = (func: Function) : string[] => {
        
        var es = esprima.parse("(" + func.toString() + ")");

        var ftn = (<ESTree.FunctionExpression>(<ESTree.ExpressionStatement>es.body[0]).expression);
        
        return ftn.params.map((p: ESTree.Identifier) => p.name);
    }
    
}
