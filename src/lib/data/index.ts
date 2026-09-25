import { localDataSource } from "./local-source";
import type { DataSource } from "./source";

/** The active data source. Swap this line when the database / back office exists. */
export const dataSource: DataSource = localDataSource;
