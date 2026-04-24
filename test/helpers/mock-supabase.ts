export interface MockSupabaseError {
  code?: string;
  message: string;
}

export interface MockSupabaseResult<T = unknown> {
  data: T;
  error: MockSupabaseError | null;
}

type QueryOperation = "select" | "insert" | "update" | "upsert";
type ResolveMode = "await" | "single" | "maybeSingle";

export interface MockQueryContext {
  table: string;
  operation: QueryOperation;
  payload?: unknown;
  selectColumns?: string;
  filters: Array<
    | { type: "eq"; column: string; value: unknown }
    | { type: "in"; column: string; values: unknown[] }
    | { type: "gte"; column: string; value: unknown }
    | { type: "not"; column: string; operator: string; value: unknown }
  >;
  upsertOptions?: { onConflict?: string };
  resolveMode: ResolveMode;
}

type QueryResolver =
  | MockSupabaseResult<unknown>
  | ((context: MockQueryContext) => MockSupabaseResult<unknown> | Promise<MockSupabaseResult<unknown>>);

type TablePlan = Partial<Record<QueryOperation, QueryResolver>>;

export interface MockSupabaseOptions {
  tables?: Record<string, TablePlan>;
  rpc?: Record<
    string,
    MockSupabaseResult<unknown> | ((args: Record<string, unknown>) => MockSupabaseResult<unknown> | Promise<MockSupabaseResult<unknown>>)
  >;
}

export interface LoggedRpcCall {
  kind: "rpc";
  name: string;
  args: Record<string, unknown>;
}

export type LoggedSupabaseOperation = MockQueryContext | LoggedRpcCall;

class QueryBuilder<T = unknown> implements PromiseLike<MockSupabaseResult<T>> {
  private operation: QueryOperation = "select";
  private payload?: unknown;
  private selectColumns?: string;
  private readonly filters: MockQueryContext["filters"] = [];
  private upsertOptions?: { onConflict?: string };

  constructor(
    private readonly table: string,
    private readonly options: MockSupabaseOptions,
    private readonly operations: LoggedSupabaseOperation[]
  ) {}

  select(columns: string) {
    this.selectColumns = columns;
    return this;
  }

  insert(payload: unknown) {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: unknown) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  upsert(payload: unknown, options?: { onConflict?: string }) {
    this.operation = "upsert";
    this.payload = payload;
    this.upsertOptions = options;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ type: "eq", column, value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ type: "in", column, values });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ type: "gte", column, value });
    return this;
  }

  not(column: string, operator: string, value: unknown) {
    this.filters.push({ type: "not", column, operator, value });
    return this;
  }

  or(_filter: string) {
    return this;
  }

  order(_column: string, _options?: { ascending?: boolean }) {
    return this;
  }

  limit(_count: number) {
    return this;
  }

  maybeSingle() {
    return this.resolve("maybeSingle");
  }

  single() {
    return this.resolve("single");
  }

  then<TResult1 = MockSupabaseResult<T>, TResult2 = never>(
    onfulfilled?: ((value: MockSupabaseResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.resolve("await").then(onfulfilled ?? undefined, onrejected ?? undefined);
  }

  private async resolve(mode: ResolveMode): Promise<MockSupabaseResult<T>> {
    const context: MockQueryContext = {
      table: this.table,
      operation: this.operation,
      payload: this.payload,
      selectColumns: this.selectColumns,
      filters: [...this.filters],
      upsertOptions: this.upsertOptions,
      resolveMode: mode,
    };

    this.operations.push(context);

    const resolver = this.options.tables?.[this.table]?.[this.operation];
    const resolved = resolver
      ? await (typeof resolver === "function" ? resolver(context) : resolver)
      : { data: null, error: null };

    if ((mode === "single" || mode === "maybeSingle") && Array.isArray(resolved.data)) {
      return {
        ...resolved,
        data: (resolved.data[0] ?? null) as T,
      };
    }

    return resolved as MockSupabaseResult<T>;
  }
}

export function createMockSupabase(options: MockSupabaseOptions = {}) {
  const operations: LoggedSupabaseOperation[] = [];

  return {
    operations,
    from<T = unknown>(table: string) {
      return new QueryBuilder<T>(table, options, operations);
    },
    async rpc<T = unknown>(name: string, args: Record<string, unknown> = {}) {
      operations.push({ kind: "rpc", name, args });

      const resolver = options.rpc?.[name];
      const resolved = resolver
        ? await (typeof resolver === "function" ? resolver(args) : resolver)
        : { data: null, error: null };

      return resolved as MockSupabaseResult<T>;
    },
  };
}
