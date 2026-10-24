import type { db } from "./client";

export type DbClient = typeof db;
export type Tx = Parameters<Parameters<DbClient["transaction"]>[0]>[0];
export type Executor = DbClient | Tx;
