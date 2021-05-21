const electron = require('electron');
const url = require('url');
const path = require('path');
const dialog = electron.dialog;
const ipc = electron.ipcMain;
const { app, BrowserWindow } = electron;
var mainWindow, helpWindow, position = [];



app.on('ready', function() {


    //creat new window
    mainWindow = new BrowserWindow({
        minWidth: 900,
        minHeight: 1010,
        width: 900,
        webPreferences: {
            nodeIntegration: true
        }
    });

    mainWindow.autoHideMenuBar = false;
    // load html
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file',
        slashes: true
    }));
    //mainWindow.webContents.openDevTools();

    //receive load file event
    ipc.on('chooseFile-dialog', function(event) {

        var window = BrowserWindow.fromWebContents(event.sender);

        var chooseFileOptions = {
            title: 'Choose activity Folder',
            buttonLabel: 'Select',
            properties: [
                'openDirectory',
            ]
        };
        dialog.showOpenDialog(window, chooseFileOptions, function(folders) {

            if (folders)
                event.sender.send('chooseFile-selected', folders);

        });

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
            nodeIntegration: true
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
});