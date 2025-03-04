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
import * as os from 'os';

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';
import {editConnectionsCommand} from './commands/edit_connections';
import {ConnectionsProvider} from '../tree_views/connections_view';
import {connectionManager} from './connection_manager';
import {setupFileMessaging, setupSubscriptions} from '../subscriptions';
import {fileHandler} from '../utils';
import {MALLOY_EXTENSION_STATE} from '../state';
import {WorkerConnectionNode} from './worker_connection_node';
import {FileHandler, MalloyConfig} from '../../common/types';

let client: LanguageClient;
let worker: WorkerConnectionNode | null = null;

const cloudshellEnv = () => {
  const cloudShellProject = vscode.workspace
    .getConfiguration('cloudcode')
    .get('cloudshell.project');
  if (cloudShellProject && typeof cloudShellProject === 'string') {
    process.env['DEVSHELL_PROJECT_ID'] = cloudShellProject;
    process.env['GOOGLE_CLOUD_PROJECT'] = cloudShellProject;
    process.env['GOOGLE_CLOUD_QUOTA_PROJECT'] = cloudShellProject;
  }
};

export function activate(context: vscode.ExtensionContext): void {
  cloudshellEnv();
  setupLanguageServer(context);
  setupWorker(context, fileHandler);
  setupSubscriptions(context, fileHandler, connectionManager, worker, client);
  const connectionsTree = new ConnectionsProvider(context, connectionManager);

  MALLOY_EXTENSION_STATE.setHomeUri(vscode.Uri.file(os.homedir()));

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('malloyConnections', connectionsTree)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'malloy.editConnections',
      editConnectionsCommand
    )
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async e => {
      if (e.affectsConfiguration('malloy')) {
        await connectionManager.onConfigurationUpdated();
        connectionsTree.refresh();
      }
      if (e.affectsConfiguration('cloudshell')) {
        cloudshellEnv();
      }
    })
  );
}

export async function deactivate(): Promise<void> | undefined {
  if (client) {
    await client.stop();
  }
}

async function setupLanguageServer(
  context: vscode.ExtensionContext
): Promise<void> {
  const serverModule = context.asAbsolutePath('dist/server_node.js');
  const debugOptions = {
    execArgv: [
      '--nolazy',
      '--inspect=6009',
      '--preserve-symlinks',
      '--enable-source-maps',
    ],
  };

  const serverOptions: ServerOptions = {
    run: {module: serverModule, transport: TransportKind.ipc},
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{language: 'malloy'}, {language: 'malloy-sql'}],
    synchronize: {
      configurationSection: 'malloy',
      fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc'),
    },
    connectionOptions: {
      // If the server crashes X times in Y mins(e.g., 3 min), it won't get
      // restarted again(https://github.com/microsoft/vscode-languageserver-node/blob/1320922f95ef182df2cf76b7c96b1a2d3ba14c2a/client/src/common/client.ts#L438).
      // We can be overly confident and set it to a large number. For now, set the max restart count to Number.MAX_SAFE_INTEGER.
      maxRestartCount: Number.MAX_SAFE_INTEGER,
    },
  };

  client = new LanguageClient(
    'malloy',
    'Malloy Language Server',
    serverOptions,
    clientOptions
  );

  await client.start();

  setupFileMessaging(context, client, fileHandler);
}

function sendWorkerConfig() {
  worker.sendRequest('malloy/config', {
    config: vscode.workspace.getConfiguration(
      'malloy'
    ) as unknown as MalloyConfig,
  });
}

function setupWorker(
  context: vscode.ExtensionContext,
  fileHandler: FileHandler
): void {
  worker = new WorkerConnectionNode(context, fileHandler);
  sendWorkerConfig();
}
