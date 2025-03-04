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
import {Utils, URI} from 'vscode-uri';
import {RunState, MALLOY_EXTENSION_STATE} from '../state';
import {WebviewMessageManager} from '../webview_message_manager';
import {getWebviewHtml} from '../webviews';
import turtleIcon from '../../media/turtle.svg';

export function createOrReuseWebviewPanel(
  viewType,
  title,
  panelId,
  cancel,
  document
): RunState {
  const previous = MALLOY_EXTENSION_STATE.getRunState(panelId);

  let current: RunState;
  if (previous) {
    current = {
      cancel,
      panelId,
      panel: previous.panel,
      messages: previous.messages,
      document: previous.document,
    };
    MALLOY_EXTENSION_STATE.setRunState(panelId, current);
    previous.cancel();
    if (!previous.panel.visible) {
      previous.panel.reveal(vscode.ViewColumn.Beside, true);
    }
  } else {
    const panel = vscode.window.createWebviewPanel(
      viewType,
      title,
      {viewColumn: vscode.ViewColumn.Beside, preserveFocus: true},
      {enableScripts: true, retainContextWhenHidden: true}
    );

    current = {
      panel,
      messages: new WebviewMessageManager(panel),
      panelId,
      cancel,
      document,
    };
    current.panel.iconPath = Utils.joinPath(
      MALLOY_EXTENSION_STATE.getExtensionUri(),
      'dist',
      turtleIcon
    );
    MALLOY_EXTENSION_STATE.setRunState(panelId, current);
  }

  return current;
}

export function loadWebview(current: RunState, onDiskPath: URI): void {
  const entrySrc = current.panel.webview.asWebviewUri(onDiskPath);

  current.panel.webview.html = getWebviewHtml(
    entrySrc.toString(),
    current.panel.webview
  );

  current.panel.onDidDispose(() => {
    current.cancel();
  });

  MALLOY_EXTENSION_STATE.setActiveWebviewPanelId(current.panelId);
}

export function showSchemaTreeViewWhenFocused(
  panel: vscode.WebviewPanel,
  panelId: string
): void {
  panel.onDidChangeViewState(event => {
    if (event.webviewPanel.active) {
      MALLOY_EXTENSION_STATE.setActiveWebviewPanelId(panelId);
      vscode.commands.executeCommand('malloy.refreshSchema');
    }
  });

  panel.onDidChangeViewState(
    (e: vscode.WebviewPanelOnDidChangeViewStateEvent) => {
      vscode.commands.executeCommand(
        'setContext',
        'malloy.webviewPanelFocused',
        e.webviewPanel.active
      );
    }
  );
}
