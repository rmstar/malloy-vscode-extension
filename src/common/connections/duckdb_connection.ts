/*
 * Copyright 2023 Google LLC
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files
 * (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
/* eslint-disable no-console */

import {DuckDBConnection} from '@malloydata/db-duckdb';
import {
  ConfigOptions,
  DuckDBConnectionConfig,
} from '../connection_manager_types';
import {isDuckDBAvailable} from '../../common/duckdb_availability';

export const createDuckDbConnection = async (
  connectionConfig: DuckDBConnectionConfig,
  {workingDirectory, rowLimit}: ConfigOptions
) => {
  if (!isDuckDBAvailable) {
    throw new Error('DuckDB is not available.');
  }
  try {
    const connection = new DuckDBConnection(
      connectionConfig.name,
      ':memory:',
      connectionConfig.workingDirectory || workingDirectory,
      () => ({rowLimit})
    );
    return connection;
  } catch (error) {
    console.error('Could not create DuckDB connection:', error);
    throw error;
  }
};
