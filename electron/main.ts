/**
 * Electron main process — zostaje. desktop app.
 *
 * Architecture follows the Obsidian pattern:
 *  1. Start the Next.js server in production mode (or connect to dev server).
 *  2. Open a BrowserWindow pointing at the local server.
 *  3. The app is fully local — no external network required.
 *
 * Build: electron-builder packages the compiled Next.js output + this file
 * into a native app for macOS, Windows, and Linux.
 */

import { app, BrowserWindow, shell, ipcMain } from "electron";
import { spawn, type ChildProcess } from "child_process";
import * as path from "path";
import * as http from "http";
import * as fs from "fs";

const IS_DEV = process.env.NODE_ENV === "development";
const PORT = IS_DEV ? 3000 : 3456;
const NEXT_URL = `http://localhost:${PORT}/dashboard`;

let mainWindow: BrowserWindow | null = null;
let nextProcess: ChildProcess | null = null;

// Vault file path
const getVaultFilePath = () => path.join(app.getPath("userData"), "vault.zostaje");

// IPC: get vault file path
ipcMain.handle("vault:get-path", () => getVaultFilePath());

// IPC: check if vault file exists
ipcMain.handle("vault:exists", () => fs.existsSync(getVaultFilePath()));

// IPC: save vault to file
ipcMain.handle("vault:save", (_event: Electron.IpcMainInvokeEvent, data: string) => {
  try {
    fs.writeFileSync(getVaultFilePath(), data, "utf-8");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

// IPC: load vault from file
ipcMain.handle("vault:load", () => {
  try {
    if (!fs.existsSync(getVaultFilePath())) return { ok: false, error: "Plik nie istnieje" };
    const data = fs.readFileSync(getVaultFilePath(), "utf-8");
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

// IPC: get userData directory path (for display in UI)
ipcMain.handle("vault:get-data-dir", () => app.getPath("userData"));

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "zostaje.",
    titleBarStyle: "hiddenInset", // macOS native feel
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
    backgroundColor: "#0a0a0a",
    show: false,
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.loadURL(NEXT_URL);
}

/**
 * In production mode, start the Next.js server as a child process.
 * In dev mode, assume `npm run dev` is already running.
 */
function startNextServer(): Promise<void> {
  if (IS_DEV) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const nextBin = path.join(__dirname, "..", "node_modules", ".bin", "next");
    nextProcess = spawn(nextBin, ["start", "-p", String(PORT)], {
      cwd: path.join(__dirname, ".."),
      env: { ...process.env, PORT: String(PORT) },
      stdio: "pipe",
    });

    nextProcess.on("error", reject);

    // Wait for the server to become available
    const check = () => {
      const req = http.get(`http://localhost:${PORT}/api/auth/me`, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolve();
        else setTimeout(check, 200);
      });
      req.on("error", () => setTimeout(check, 200));
    };
    setTimeout(check, 500);
  });
}

app.whenReady().then(async () => {
  await startNextServer();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (nextProcess) {
    nextProcess.kill("SIGTERM");
    nextProcess = null;
  }
});
