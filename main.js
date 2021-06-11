const electron = require('electron');
const url = require('url');
const http = require('http');
const path = require('path');
const dialog = electron.dialog;
const ipc = electron.ipcMain;
const { app, BrowserWindow } = electron
var mainWindow, helpWindow, position = [];
const isDev = require('electron-is-dev');


app.on('ready', function() {
    //creat new window
    mainWindow = new BrowserWindow({
        width: 900,
        minWidth: 900,
        minHeight: 1020,
        height: 1020,
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
    mainWindow.webContents.openDevTools();
    mainWindow.autoHideMenuBar = true;

    console.log('App loaded...');

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


    mainWindow.webContents.once("dom-ready", () => {
        let appVersion = ``;
        console.log(appVersion)
        if (!isDev) {
            appVersion = `v${app.getVersion()}`;
        }

        mainWindow.webContents.send('version', appVersion);

    });

    ipc.on('downloaded', (info) => {
        mainWindow.webContents.send('download-success', "Successfully Downloaded!");
        let index = dialog.showMessageBoxSync({
            title: 'Update Available',
            type: 'info',
            message: 'A new version of app is available. Do you want to update now?',
            buttons: ['Yes', 'No']
        })
        mainWindow.webContents.send('user-response', index);
    });
});