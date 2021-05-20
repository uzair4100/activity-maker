const electron = require('electron');
const url = require('url');
const path = require('path');
const dialog = electron.dialog;
const ipc = electron.ipcMain;
const { app, BrowserWindow, shell } = electron;
var mainWindow, helpWindow, position = [];



app.on('ready', function() {

    //receive update app event
    /* ipc.on("updateApp", function(event) {
         console.log("executed")
             //  var window = BrowserWindow.fromWebContents(event.sender);

         var messageOptions = {
             type: 'question',
             title: 'Update Available',
             detail: 'New version of App is available',
             buttons: ['No, thanks', 'Yes, please'],
             noLink: true,
             cancelId: 0,
             defaultId: 1,
         };
         dialog.showMessageBox(messageOptions, (result) => {
             console.log(result.response)
             event.sender.send('updateApp-response', result);
         });

     });*/

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
    mainWindow.webContents.openDevTools();

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