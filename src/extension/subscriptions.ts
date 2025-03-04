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

import * as vscode from 'vscode';
import {
  runTurtleFromSchemaCommand,
  SchemaProvider,
} from './tree_views/schema_view';
import {
  copyFieldPathCommand,
  runNamedQuery,
  runNamedSQLBlock,
  runQueryCommand,
  runQueryFileCommand,
  runUnnamedSQLBlock,
  showLicensesCommand,
} from './commands';
import {malloyLog} from './logger';
import {trackModelLoad, trackModelSave} from './telemetry';
import {HelpViewProvider} from './webviews/help_view';
import {ConnectionManager} from '../common/connection_manager';
import {URLReader} from '@malloydata/malloy';
import {v4 as uuid} from 'uuid';

import {MALLOY_EXTENSION_STATE} from './state';
import {activateNotebookSerializer} from './notebook/malloy_serializer';
import {activateNotebookController} from './notebook/malloy_controller';
import {
  FetchBinaryFileEvent,
  FetchCellDataEvent,
  FetchFileEvent,
  FileHandler,
} from '../common/types';
import {showSQLCommand} from './commands/show_sql';
import {showSQLFileCommand} from './commands/show_sql_file';
import {showSQLNamedQueryCommand} from './commands/show_sql_named_query';
import {runMalloySQLFile} from './commands/run_msql_file';
import {showSQLMalloySQLFile} from './commands/show_sql_msql_file';
import {
  GenericConnection,
  WorkerFetchMessage,
} from '../common/worker_message_types';
import {runMalloySQLStatement} from './commands/run_msql_statement';
import {BaseLanguageClient} from 'vscode-languageclient';
import {WorkerConnection} from './worker_connection';

function getNewClientId(): string {
  return uuid();
}

export const setupSubscriptions = (
  context: vscode.ExtensionContext,
  urlReader: URLReader,
  connectionManager: ConnectionManager,
  worker: WorkerConnection,
  client: BaseLanguageClient
) => {
  MALLOY_EXTENSION_STATE.setExtensionUri(context.extensionUri);

  // Run Query (whole file)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'malloy.runQueryFile',
      (queryIndex?: number) => runQueryFileCommand(worker, queryIndex)
    )
  );

  // Run query
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'malloy.runQuery',
      (query: string, name?: string) => runQueryCommand(worker, query, name)
    )
  );

  // Run named query
  context.subscriptions.push(
    vscode.commands.registerCommand('malloy.runNamedQuery', (name: string) =>
      runNamedQuery(worker, name)
    )
  );

  // Show SQL (whole file)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'malloy.showSQLFile',
      (queryIndex?: number) => showSQLFileCommand(worker, queryIndex)
    )
  );

  // Show SQL
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'malloy.showSQL',
      (query: string, name?: string) => showSQLCommand(worker, query, name)
    )
  );

  // Show named query SQL
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'malloy.showSQLNamedQuery',
      (name: string) => showSQLNamedQueryCommand(worker, name)
    )
  );

  // Run named SQL block
  context.subscriptions.push(
    vscode.commands.registerCommand('malloy.runNamedSQLBlock', (name: string) =>
      runNamedSQLBlock(worker, name)
    )
  );

  // Run unnamed SQL block
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'malloy.runUnnamedSQLBlock',
      (index: number) => runUnnamedSQLBlock(worker, index)
    )
  );

  // Run Malloy SQL File
  context.subscriptions.push(
    vscode.commands.registerCommand('malloy.runMalloySQLFile', () =>
      runMalloySQLFile(worker)
    )
  );

  // Run Malloy SQL Statement
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'malloy.runMalloySQLStatement',
      (statementIndex: number) => runMalloySQLStatement(worker, statementIndex)
    )
  );

  // Show SQL Malloy SQL File
  context.subscriptions.push(
    vscode.commands.registerCommand('malloy.showSQLMalloySQLFile', () =>
      showSQLMalloySQLFile(worker)
    )
  );

  // Copy Field Path
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'malloy.copyFieldPath',
      copyFieldPathCommand
    )
  );

  const schemaTree = new SchemaProvider(
    context,
    connectionManager,
    urlReader,
    client
  );

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('malloySchema', schemaTree)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('malloy.refreshSchema', () =>
      schemaTree.refresh()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'malloy.runTurtleFromSchema',
      runTurtleFromSchemaCommand
    )
  );

  // Show Licenses
  context.subscriptions.push(
    vscode.commands.registerCommand('malloy.showLicenses', showLicensesCommand)
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() =>
      vscode.commands.executeCommand('malloy.refreshSchema')
    )
  );

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(async e => {
      if (e.languageId === 'malloy') {
        trackModelLoad();
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async e => {
      vscode.commands.executeCommand('malloy.refreshSchema');
      if (e.languageId === 'malloy') {
        trackModelSave();
      }
    })
  );

  // Malloy HelpView provider.
  const provider = new HelpViewProvider(context.extensionUri);

  // Malloy help view.
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('malloyHelp', provider)
  );

  activateNotebookSerializer(context);
  activateNotebookController(context, connectionManager, urlReader);

  let clientId: string | undefined =
    context.globalState.get('malloy_client_id');
  if (clientId === undefined) {
    clientId = getNewClientId();
    context.globalState.update('malloy_client_id', clientId);
  }
  MALLOY_EXTENSION_STATE.setClientId(clientId);
};

export const setupFileMessaging = (
  context: vscode.ExtensionContext,
  client: GenericConnection,
  fileHandler: FileHandler
) => {
  context.subscriptions.push(
    client.onRequest('malloy/fetchFile', async (event: FetchFileEvent) => {
      malloyLog.appendLine(`fetchFile returning ${event.uri}`);
      return await fileHandler.fetchFile(event.uri);
    })
  );

  context.subscriptions.push(
    client.onRequest(
      'malloy/fetchBinaryFile',
      async (event: FetchBinaryFileEvent) => {
        malloyLog.appendLine(`fetchBinaryFile returning ${event.uri}`);
        return await fileHandler.fetchBinaryFile(event.uri);
      }
    )
  );
  context.subscriptions.push(
    client.onRequest(
      'malloy/fetchCellData',
      async (event: FetchCellDataEvent) => {
        malloyLog.appendLine(`fetchCellData returning ${event.uri}`);
        return await fileHandler.fetchCellData(event.uri);
      }
    )
  );

  context.subscriptions.push(
    client.onRequest('malloy/fetch', async (message: WorkerFetchMessage) => {
      malloyLog.appendLine(`reading file ${message.uri}`);
      return await fileHandler.fetchFile(message.uri);
    })
  );
};
