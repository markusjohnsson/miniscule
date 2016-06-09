
import esprima = require('esprima');

export interface Type<T> {
    new (): T;
}

export default class Mini<T> {
    constructor(public inner: Mini<any>, public fieldType: Type<T> | T, public fieldsMapping: { from: string; to: string; }[] = null) { }

    static from<T>(table: Type<T>) { return new Table<T>(table); }

    select<TResult>(selector: (t: T) => TResult) { return new Select<T, TResult>(this, selector); }

    where(predicate: string) { return new Where<T>(this, predicate); }

    join<T2, TKey, TResult>(
        other: Mini<T2>,
        innerKeySelector: (t: T) => TKey,
        otherKeySelector: (t: T2) => TKey,
        selector: (t: T, t2: T2) => TResult) {
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

    protected wrapTable(str: string, depth: number, context: IEmitContext) {
        if (depth == 0)
            return str;
        else {
            for (var indent = ""; indent.length < depth; indent += " ");
            return "\n" + indent + "(" + str + ") " + Mini.getTableId(this, context) + "\n" + indent;
        }
    }

    public getResultTypeInstance(): T {
        if (typeof this.fieldType === "function")
            return new (<Type<T>>this.fieldType)();
        else
            return <T>this.fieldType;
    }

    protected getFields() {
        if (this.fieldsMapping)
            return this.fieldsMapping;
        let fields = [];
        let resultInstance = this.getResultTypeInstance();
        for (let prop in resultInstance)
            fields.push({ from: prop });
        return fields;
    }

    protected getSelectFrom() {
        let fields = this.getFields();
        return `select ${fields.map(m => m.to ? `${m.from} as ${m.to}` : m.from).join(",")} from `;
    }

    toString() {
        return this.toSqlString(0, { tables: [] });
    }
}


interface IEmitContext { tables: Mini<any>[] }

function assert(assertion: boolean, message: string) {
    if (! assertion)
        throw new Error(message);
}

function cast<T extends ESTree.Expression>(expression: ESTree.Expression, expressionTypeName: string): T {
    assert(expression.type == expressionTypeName, `Unexpected expression type ${expression.type}, expected ${expressionTypeName}`) 
    
    return <T>expression;
}

export class Select<T, TResult> extends Mini<TResult> {

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

    private static getFieldsMapping<T, TResult>(inner: Mini<T>, selector: (t: T) => TResult): { from: string; to: string }[] {
        
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

    constructor(inner: Mini<T>, selector: (t: T) => TResult) {
        super(inner, Select.getType(inner, selector), Select.getFieldsMapping(inner, selector));
    }

    toSqlString(depth: number, context: IEmitContext) {
        return this.wrapTable(
            this.getSelectFrom() + this.inner.toSqlString(depth + 1, context), depth, context);
    }
}

export class Where<T> extends Mini<T> {
    constructor(inner: Mini<T>, public predicate: string) { super(inner, inner.fieldType); }

    toSqlString(depth: number, context: IEmitContext) {
        return this.wrapTable(
            this.getSelectFrom() + this.inner.toSqlString(depth + 1, context) +
            " where " + this.predicate, depth, context);
    }
}

export class Join<T1, T2, TKey, TResult> extends Mini<TResult> {

    private static getType<T1, T2, TResult>(inner: Mini<T1>, outer: Mini<T2>, selector: (t1: T1, t2: T2) => TResult): Type<TResult> | TResult {
        let i = inner.getResultTypeInstance();
        let o = outer.getResultTypeInstance();
        let r = selector(i, o);
        if (r.constructor == Object)
            return r;
        return <Type<TResult>>r.constructor;
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
        return this.wrapTable(
            this.getSelectFrom() + this.inner.toSqlString(depth + 1, context) +
            " join " + this.outer.toSqlString(depth + 1, context) + " on " + innerId + "." + inner + " = " + outerId + "." + other, depth, context);
    }
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


export class Table<T> extends Mini<T> {
    constructor(private tableType: Type<T>) { super(null, tableType); }
    toSqlString(depth: number, context: IEmitContext) {
        let tableName = (<any>this.tableType).name;
        return this.wrapTable(this.getSelectFrom() + tableName, depth, context);
    }
}

