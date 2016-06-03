export default class Mini {
    constructor(public inner: Mini, public fields: string[]) { }
    
    static from(table: string, fields: string[]) { return new Table(table, fields); }
    
    select(fields: string[]) { return new Select(this, fields); }
    
    where(predicate: string) { return new Where(this, predicate); }
    
    join(other: Mini, predicate: string) { return new Join(this, other, predicate); }
    
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

export class Select extends Mini {
    constructor(inner: Mini, fields: string[]) { super(inner, fields); }
    
    toSqlString(depth: number, context: { tables: number }) {
        return this.wrapTable(
             this.getSelectFrom() + this.inner.toSqlString(depth + 1, context), depth, context);
    }
}

export class Where extends Mini {
    constructor(inner: Mini, public predicate: string) { super(inner, inner.fields); }
    toSqlString(depth: number, context: { tables: number }) {
        return this.wrapTable(
            this.getSelectFrom() + this.inner.toSqlString(depth + 1, context) +
            " where " + this.predicate, depth, context);
    }
}

export class Join extends Mini {
    constructor(inner: Mini, private other: Mini, private predicate: string) { super(inner, inner.fields.concat(other.fields)); }
    toSqlString(depth: number, context: { tables: number }) {
        return this.wrapTable(
            this.getSelectFrom() + this.inner.toSqlString(depth + 1, context) +
            " join " + this.other.toSqlString(depth + 1, context) + " on " + this.predicate, depth, context);
    }
}

export class Table extends Mini {
    constructor(private tableName: string, fields: string[]) { super(null, fields); }
    toSqlString(depth: number, context: { tables: number }) {
        return this.wrapTable(this.getSelectFrom() + this.tableName, depth, context);
    }
}

