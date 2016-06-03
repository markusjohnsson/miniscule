
export interface Type<T> {
    new () : T;
}

export default class Mini<T> {
    constructor(public inner: Mini<any>, public fields: string[]) { }
    
    static from<T>(table: string, fields: string[]) { return new Table<T>(table, fields); }
    
    select(fields: string[]) { return new Select(this, fields); }
    
    where(predicate: string) { return new Where(this, predicate); }
    
    join<T2>(other: Mini<T2>, predicate: string) { return new Join(this, other, predicate); }
    
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
    
    protected getSelectFrom() {
        return "select " + this.fields.join(",") + " from ";
    }
    
    toString() {
        return this.toSqlString(0, { tables: 0 });
    }
}

export class Select<T, TResult> extends Mini<TResult> {
    constructor(inner: Mini<T>, fields: string[]) { super(inner, fields); }
    
    toSqlString(depth: number, context: { tables: number }) {
        return this.wrapTable(
             this.getSelectFrom() + this.inner.toSqlString(depth + 1, context), depth, context);
    }
}

export class Where<T> extends Mini<T> {
    constructor(inner: Mini<T>, public predicate: string) { super(inner, inner.fields); }
    toSqlString(depth: number, context: { tables: number }) {
        return this.wrapTable(
            this.getSelectFrom() + this.inner.toSqlString(depth + 1, context) +
            " where " + this.predicate, depth, context);
    }
}

export class Join<T1, T2> extends Mini<T1 & T2> {
    constructor(inner: Mini<T1>, private other: Mini<T2>, private predicate: string) { super(inner, inner.fields.concat(other.fields)); }
    toSqlString(depth: number, context: { tables: number }) {
        return this.wrapTable(
            this.getSelectFrom() + this.inner.toSqlString(depth + 1, context) +
            " join " + this.other.toSqlString(depth + 1, context) + " on " + this.predicate, depth, context);
    }
}

export class Table<T> extends Mini<T> {
    constructor(private tableName: string, fields: string[]) { super(null, fields); }
    toSqlString(depth: number, context: { tables: number }) {
        return this.wrapTable(this.getSelectFrom() + this.tableName, depth, context);
    }
}

