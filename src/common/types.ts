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

import {URLReader} from '@malloydata/malloy';
import {ConnectionConfig} from './connection_manager_types';

export interface MalloyConfig {
  /** Maximum number of top-level rows to fetch when running queries. */
  rowLimit: number;
  /** Path to directory to save downloaded results */
  downloadsPath: string;
  /** Connections for Malloy to use to access data when compiling and querying. */
  connections: ConnectionConfig[];
}

export interface FetchFileEvent {
  uri: string;
}

export interface FetchBinaryFileEvent {
  uri: string;
}

export interface FetchCellDataEvent {
  uri: string;
}

export interface CellData {
  uri: string;
  text: string;
}

export interface BuildModelRequest {
  uri: string;
  version: number;
}

export interface FileHandler extends URLReader {
  /**
   * Requests a file from the worker's controller. Although the
   * file path is a file system path, reading the file off
   * disk doesn't take into account unsaved changes that only
   * VS Code is aware of.
   *
   * @param uri URI to resolve
   * @returns File contents
   */
  fetchFile(uri: string): Promise<string>;
  /**
   * Requests a binary file from the worker's controller.
   *
   * @param uri URI to resolve
   * @returns File contents
   */

  fetchBinaryFile(uri: string): Promise<Uint8Array>;

  /**
   * Requests a set of cell data from the worker's controller.
   *
   * @param uri URI to resolve
   * @returns File contents
   */
  fetchCellData(uri: string): Promise<CellData[]>;
}
