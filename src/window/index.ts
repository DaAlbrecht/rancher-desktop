'use strict';

import { BrowserWindow, app, shell } from 'electron';

/**
 * A mapping of window key (which is our own construct) to a window ID (which is
 * assigned by electron).
 */
const windowMapping: Record<string, number> = {};

/**
 * Open a given window; if it is already open, focus it.
 * @param name The window identifier; this controls window re-use.
 * @param url The URL to load into the window.
 * @param prefs Options to control the new window.
 */
function createWindow(name: string, url: string, prefs: Electron.WebPreferences) {
  let window = (name in windowMapping) ? BrowserWindow.fromId(windowMapping[name]) : null;

  if (window) {
    if (!window.isFocused()) {
      if (window.isMinimized()) {
        window.restore();
      }
      window.show();
    }

    return;
  }

  const isInternalURL = (url: string) => {
    if (url.startsWith('app://')) {
      return true;
    }
    if (/^dev/i.test(process.env.NODE_ENV || '') && url.startsWith('http://localhost:8888/')) {
      return true;
    }

    return false;
  };

  window = new BrowserWindow({
    width: 940, height: 600, webPreferences: prefs
  });
  window.webContents.on('will-navigate', (event, input) => {
    if (isInternalURL(input)) {
      return;
    }
    shell.openExternal(input);
    event.preventDefault();
  });
  window.webContents.setWindowOpenHandler((details) => {
    if (isInternalURL(details.url)) {
      window?.webContents.loadURL(details.url);
    } else {
      shell.openExternal(details.url);
    }

    return { action: 'deny' };
  });
  window.loadURL(url);
  windowMapping[name] = window.id;
}

/**
 * Open the preferences window; if it is already open, focus it.
 */
export function openPreferences() {
  let url = 'app://./index.html';

  if (/^(?:dev|test)/i.test(process.env.NODE_ENV || '')) {
    url = 'http://localhost:8888/';
  }
  createWindow('preferences', url, {
    nodeIntegration:    true,
    contextIsolation:   false,
    enableRemoteModule: process.env?.NODE_ENV === 'test'
  });
  app.dock?.show();
}

/**
 * Send a message to all windows in the renderer process.
 * @param channel The channel to send on.
 * @param  args Any arguments to pass.
 */
export function send(channel: string, ...args: any[]) {
  for (const windowId of Object.values(windowMapping)) {
    const window = BrowserWindow.fromId(windowId);

    window?.webContents?.send(channel, ...args);
  }
}