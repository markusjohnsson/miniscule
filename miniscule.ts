
export interface Type<T> {
    new () : T;
}

export default class Mini<T> {
    constructor(public inner: Mini<any>, public fieldType: Type<T> | T) { }
    
    static from<T>(table: Type<T>) { return new Table<T>(table); }
    
    select<TResult>(selector: (t:T) => TResult) { return new Select<T, TResult>(this, selector); }
    
    where(predicate: string) { return new Where<T>(this, predicate); }
    
    join<T2, TKey, TResult>(
        other: Mini<T2>, 
        innerKeySelector: (t: T) => TKey,
        otherKeySelector: (t: T2) => TKey, 
        selector: (t: T, t2: T2) => TResult) 
    { 
        return new Join<T, T2, TKey, TResult>(this, other, innerKeySelector, otherKeySelector, selector); 
    }
    
    toSqlString(depth: number, context: { tables: number }) {
        return "not implemented"
    }
    
    protected getTableId(context: { tables: number }) {
        return "t" + (context.tables++);
    }
    
    protected wrapTable(str: string, depth: number, context: { tables: number }) {
        if (depth == 0)
            return str;
        else {
            for (var indent = ""; indent.length < depth; indent += " ");
            return "\n" + indent + "(" + str + ") " + this.getTableId(context) + "\n" + indent;
        }
    }
    
    public getResultTypeInstance() : T {
        if (typeof this.fieldType === "function")
            return new (<Type<T>>this.fieldType)();
        else 
            return <T>this.fieldType;
    }
    
    protected getSelectFrom() {
        let fields = [];
        let resultInstance = this.getResultTypeInstance();
        for (let prop in resultInstance)
            fields.push(prop);
        return "select " + fields.join(",") + " from ";
    }
    
    toString() {
        return this.toSqlString(0, { tables: 0 });
    }
}

export class Select<T, TResult> extends Mini<TResult> {
    
    private static getType<T, TResult>(inner: Mini<T>, selector: (t:T) => TResult): Type<TResult> | TResult  {
        let m = inner.getResultTypeInstance();
        let r = selector(m);
        if (r.constructor == Object)
            return r;
        return <Type<TResult>>r.constructor;
    }
    
    constructor(inner: Mini<T>, selector: (t:T) => TResult) { super(inner, Select.getType(inner, selector)); }
    
    toSqlString(depth: number, context: { tables: number }) {
        return this.wrapTable(
             this.getSelectFrom() + this.inner.toSqlString(depth + 1, context), depth, context);
    }
}

export class Where<T> extends Mini<T> {
    constructor(inner: Mini<T>, public predicate: string) { super(inner, inner.fieldType); }
    toSqlString(depth: number, context: { tables: number }) {
        return this.wrapTable(
            this.getSelectFrom() + this.inner.toSqlString(depth + 1, context) +
            " where " + this.predicate, depth, context);
    }
}

export class Join<T1, T2, TKey, TResult> extends Mini<TResult> {
    
    private static getType<T1, T2, TResult>(inner: Mini<T1>, outer: Mini<T2>, selector: (t1:T1, t2: T2) => TResult): Type<TResult> | TResult {
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
    
    toSqlString(depth: number, context: { tables: number }) {
        let inner = reflect.getProperty(this.innerKeySelector);
        let other = reflect.getProperty(this.otherKeySelector);
        return this.wrapTable(
            this.getSelectFrom() + this.inner.toSqlString(depth + 1, context) +
            " join " + this.outer.toSqlString(depth + 1, context) + " on " + inner + " = " + other, depth, context);
    }
}

module reflect {
    let propRegex = /return [a-zA-Z0-9_]+.([a-zA-Z0-9_]*);/;
    export let getProperty = (f: Function) => {
        let str = f.toString();
        let m = str.match(propRegex);
        console.log(str)
        if (m.length != 2)
            throw new Error("Unable to parse single property");
        return m[1];
    }
}


export class Table<T> extends Mini<T> {
    constructor(private tableType: Type<T>) { super(null, tableType); }
    toSqlString(depth: number, context: { tables: number }) {
        let tableName = (<any>this.tableType).name; 
        return this.wrapTable(this.getSelectFrom() + tableName, depth, context);
    }
}

