const electron = require('electron');
const url = require('url');
const http = require('http');
const path = require('path');
const dialog = electron.dialog;
const ipc = electron.ipcMain;
const { app, BrowserWindow } = electron
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');
var mainWindow, helpWindow, position = [];



autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

//auto updates
autoUpdater.on('checking-for-update', () => {
    //sendStatusToWindow('Checking for update...');
    mainWindow.webContents.send('checking', 'Checking for update...');
})
autoUpdater.on('update-available', (info) => {
    //sendStatusToWindow('Update available.');
    mainWindow.webContents.send('update', 'Update available...');
})
autoUpdater.on('update-not-available', (info) => {
    // sendStatusToWindow('Update not available.');
    mainWindow.webContents.send('not-available', 'Update not available.');
});
autoUpdater.on('error', (err) => {
    //sendStatusToWindow('Error in auto-updater. ' + err);
})
autoUpdater.on('download-progress', (progressObj) => {
    let log_message = Math.round(progressObj.percent) + '%';
    //sendStatusToWindow(log_message);
    mainWindow.webContents.send('downloading', log_message);
})
autoUpdater.on('update-downloaded', (info) => {
    mainWindow.webContents.send('downloaded', "Successfully Downloaded!");
    // sendStatusToWindow('Update downloaded');
    setTimeout(() => {
        let index = dialog.showMessageBoxSync({
            type: 'info',
            message: 'A new version of app is available. Do you want to update now?',
            buttons: ['Update Now', 'Update after I close App']
        })
        index == 1 ? "" : autoUpdater.quitAndInstall();
    }, 1500);
});


app.on('ready', function() {

    //creat new window
    mainWindow = new BrowserWindow({

        minWidth: 900,
        minHeight: 1020,
        width: 900,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // load html
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file',
        slashes: true
    }));
    //mainWindow.webContents.openDevTools();
    mainWindow.autoHideMenuBar = true;

    console.log('App loaded...');

    autoUpdater.checkForUpdatesAndNotify();

    //receive load file event
    ipc.on('chooseFile-dialog', function(event) {

        var window = BrowserWindow.fromWebContents(event.sender);

        var chooseFileOptions = {
                title: 'Choose activity Folder',
                buttonLabel: 'Select',
                properties: [
                    'openDirectory',
                ]
            }
            /* dialog.showOpenDialog({}, chooseFileOptions, function(folders) {

                 if (folders)
                     event.sender.send('chooseFile-selected', folders);
             })*/
        dialog.showOpenDialog(chooseFileOptions).then(filepaths => {
            event.sender.send('chooseFile-selected', filepaths);
            console.log(filepaths)
        })
    });

    var helpWindowOption = {
        height: 300,
        width: 600,
        parent: mainWindow,
        modal: true,
        show: true,
        maximizable: false,
        minimizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    }

    //help window
    ipc.on("help-window", function(e, data) {
        helpWindow = new BrowserWindow(helpWindowOption);
        helpWindow.loadURL(
            url.format({
                pathname: path.join(__dirname, "help.html"),
                protocol: "file",
                slashes: true
            })
        );

        helpWindow.webContents.once("dom-ready", () => {
            helpWindow.webContents.send("help-window", data);
            console.log(data);
        });
    });

    //set position of child window relevent to main window
    mainWindow.on('move', function() {
        position = mainWindow.getPosition();
        Object.assign(helpWindowOption, {
            x: position[0] + 200,
            y: position[1] + 100
        })
    });

    //get data from help page
    ipc.on("help-data", function(e, data) {
        e.preventDefault();
        console.log(data);
        mainWindow.webContents.send("help-data", data);
        helpWindow.close();
    });

    //close
    ipc.on("close", function(e) {
        helpWindow.close();
    });


    mainWindow.once("ready-to-show", () => {
        autoUpdater.checkForUpdatesAndNotify();
    });
});