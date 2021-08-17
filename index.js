const electron = require("electron");
const { shell } = electron;
const ipcRenderer = electron.ipcRenderer;
const path = require("path");
const http = require("http");
const https = require("https");
const fs = require("fs");
const cheerio = require("cheerio");
var prettifyXml = require("prettify-xml");
const copy = require("recursive-copy");
const os = require("os");
const axios = require('axios').default;
const { toAscii, toUnicode, toEnglish, isGurmukhi } = require('gurmukhi-utils');

const unicodeGurmukhi = '  ਦਮਨ ਨੇ ਇਸ਼ਨਾਨ ਕੀਤਾ।';
console.log(toAscii(unicodeGurmukhi))
var ss = '  dmn [ny] ieSnwn kIqw[';
let uni = toUnicode(ss)
console.log(uni);
ss = toAscii(uni)
console.log(ss);
uni = toUnicode(ss)
console.log(uni);
ss = toAscii(uni)
console.log(ss);
// set Quill to use <b> and <i>, not <strong> and <em> 
var bold = Quill.import('formats/bold');
bold.tagName = 'b'; // Quill uses <strong> by default
Quill.register(bold, true);

var italic = Quill.import('formats/italic');
italic.tagName = 'i'; // Quill uses <em> by default
Quill.register(italic, true);

//variables
var filePath,
    optionValue,
    help = "",
    helpContent = "",
    activity,
    layout,
    textSelected,
    quiz = "",
    audioFiles = [],
    quill = [];
var source = path.join(require("os").homedir(), "id01/content.xml");

//xml templates
var selectItem = "\\\\vsl-file01\\coursesdev$\\template\\Select Item\\selectitem.xml";
var verticalArrange = "\\\\vsl-file01\\coursesdev$\\template\\Vertical Arrange\\verticalarrange.xml";
var horizontalArrange = "\\\\vsl-file01\\coursesdev$\\template\\Horizontal Arrange\\horizontalarrange.xml";
var sentenceBuilder = "\\\\vsl-file01\\coursesdev$\\template\\Sentence Builder\\sentencebuilder.xml";
var multipleChoice = "\\\\vsl-file01\\coursesdev$\\template\\Multiple Choice\\multiplechoice.xml";
var dragCategory = "\\\\vsl-file01\\coursesdev$\\template\\Drag Category\\dragcategory.xml";
var soundrecorder = "\\\\vsl-file01\\coursesdev$\\template\\Sound Recorder\\soundrecorder.xml";
var textinput = "\\\\vsl-file01\\coursesdev$\\template\\Text Input\\textinput.xml";

//html templates
var selectitemQuiz = document.querySelector(".selectitem").outerHTML;
var verticalarrangeQuiz = document.querySelector(".verticalarrange").outerHTML;
var horizontalarrangeQuiz = document.querySelector(".horizontalarrange").outerHTML;
var sentencebuilderQuiz = document.querySelector(".sentencebuilder").outerHTML;
var multiplechoiceQuiz = document.querySelector(".multiplechoice").outerHTML;
var dragcategoryQuiz = document.querySelector(".dragcategory").outerHTML;
var soundrecorderQuiz = document.querySelector(".soundrecorder").outerHTML;
var textinputQuiz = document.querySelector(".textinput").outerHTML;

var quizContainer = document.getElementById("quiz_container");
const status = document.getElementById("status");
const activityType = document.getElementById("activityType");
const layoutType = document.getElementById("layout");
const templateFolder = "\\\\vsl-file01\\coursesdev$\\template";
const fullstops = [".", "。", "|", "?", "!", ",", "，"];
const wrap = document.getElementById("wrap");
const languages = document.getElementById("languages");
status.style.display = "none";
const dialog = electron.dialog;

var structure = document.querySelector("#structure");
var modal = document.querySelector("#modal");
structure.style.display = "none";
modal.style.display = "none";

checkUpdates();
//load activity event handler
document.querySelector("#load").addEventListener("click", function() {

    help = "";
    filePath = document.querySelector("#filePath").value;
    attrRemover();
    (quizContainer.innerHTML = ""), (audioFiles = []);

    let fileExist = fs.existsSync(path.join(filePath, "content.xml"));

    fileExist ? (activity = activityFinder(filePath)) : (activity = activityType.options[activityType.selectedIndex].text.trim());
    console.log(activity);
    let contentFile = path.join(filePath, "content.xml");
    // copyFiles(activity)
    //find template
    switch (activity) {
        case "Select Item":
            //   audioFiles = ["correct.mp3", "prompt.mp3", "select.mp3", "wrong.mp3"];
            fetcher(fileExist, loadSI(contentFile), filePath, selectitemQuiz);
            break;

        case "Vertical Arrange":
            document.getElementById("addQuiz").setAttribute("disabled", true);
            document.getElementById("duplicate").setAttribute("disabled", true);
            fetcher(fileExist, loadVA(contentFile), filePath, verticalarrangeQuiz);
            break;

        case "Horizontal Arrange":
            audioFiles = ["silence.mp3"];
            document.getElementById("addQuiz").setAttribute("disabled", true);
            document.getElementById("duplicate").setAttribute("disabled", true);
            fetcher(fileExist, loadHA(contentFile), filePath, horizontalarrangeQuiz);
            break;

        case "Sentence Builder":
            audioFiles = ["drop.mp3", "prompt.mp3", "tap.mp3", "wrong.mp3"];
            fetcher(fileExist, loadSB(contentFile), filePath, sentencebuilderQuiz);
            break;

        case "Multiple Choice":
            document.getElementById("help").setAttribute("disabled", true);
            fetcher(fileExist, loadMC(contentFile), filePath, multiplechoiceQuiz);
            break;

        case "Drag Category":
            document.getElementById("duplicate").setAttribute("disabled", true);
            audioFiles = ["drop.mp3"];
            fetcher(fileExist, loadDC(contentFile), filePath, dragcategoryQuiz);
            break;

        case "Sound Recorder":
            document.getElementById("addQuiz").setAttribute("disabled", true);
            document.getElementById("duplicate").setAttribute("disabled", true);
            fetcher(fileExist, loadSR(contentFile), filePath, soundrecorderQuiz);
            break;

        case "Text Input":
            //document.getElementById("duplicate").setAttribute("disabled", true);
            audioFiles = ["correct.mp3", "prompt.mp3"];
            fetcher(fileExist, loadTI(contentFile), filePath, textinputQuiz);
            break;
        default:
            quizContainer.innerHTML = "Invalid Activity Type!";
    }
    var makeOptionWrapper = document.querySelectorAll(".makeOptionWrapper");
    makeOptionWrapper.forEach((maker) => (maker.style.display = "none"));
});

/////////////////////find source path/////////////////////////////////////////
document.getElementById("chooseFile").addEventListener("click", function() {
    ipcRenderer.send("chooseFile-dialog"); //send choose file event

    //receive choosefile event
    ipcRenderer.on("chooseFile-selected", function(err, folder) {
        console.log(folder.filePaths[0]);
        document.getElementById("filePath").value = folder.filePaths[0];
        filePath = document.getElementById("filePath").value;
        localStorage.setItem("path", filePath);
        console.log(filePath);
    });
}); //end source path

/////////////////////////////////////////get selection for sentence builder /////////////////////////////////////////

////////////////////////////////////////////////////add or delete quizzes and options//////////////////////////////////////////////////
document.addEventListener("click", function(e) {
    let button = e.target;
    console.log(button);

    if (button.id == "wrap") {
        let el = e.target.parentElement.previousElementSibling;
        let text = el.value;
        console.log(text);
        let start = el.selectionStart;
        let end = el.selectionEnd;
        console.log(start);
        console.log(end);
        if (el.classList.contains("sentence")) {
            let word = text.substring(start, end).toString();
            if (word.trim().length) {
                text = text.substring(0, start) + "[" + word + "]" + text.substring(end, text.length); //make new sentence
                console.log(text);
                el.innerHTML = text;
                el.value = el.innerHTML;
                //set option
                if (activity == "Sentence Builder") {
                    let opt = `<div class="input-group mt-1 option">
                                    <input type="text" class="form-control option_value" value="${word}"/>
                                    <button class="del">X</button>
                                </div>`;
                    let optns = [];
                    let ops = el.closest(".sentencebuilder").querySelectorAll(".option_value");
                    ops.forEach((op) => optns.push(op.value));
                    !optns.includes(word) ? el.closest(".sentencebuilder").querySelector(".quiz_options").insertAdjacentHTML("beforeend", opt) : ""; //append option only if it's not there
                }
            }
        }
    }

    if (button.id == "show_bulk") {
        if (button.parentElement.nextElementSibling.firstElementChild.hasAttribute("style")) {
            button.parentElement.nextElementSibling.firstElementChild.removeAttribute("style");
            button.innerHTML = "Hide Panel";
        } else {
            button.parentElement.nextElementSibling.firstElementChild.setAttribute("style", "display:none");
            button.innerHTML = "Show Panel";
        }
    }


    if (button.id == "bulk_option") {
        let bulkText = button.parentElement.previousElementSibling.value; //traverse from button upto textarea
        console.log(bulkText)
        let name = button.closest(".quiz").querySelector(".no").innerHTML;
        let values = bulkText.split("\n");
        let opt = "";
        values
            .filter((val) => typeof val !== undefined && val != "")
            .map((val, v) => {
                if (activity == "Sentence Builder") {
                    opt = `<div class="input-group mt-1 option">
                        <input type="text" class="form-control option_value"  value="${val}"/>
                        <button class="del">X</button>
                    </div>`;
                } else {
                    opt = `<div class="input-group mt-1 option">
                                    <div class="input-group-prepend">
                                        <div class="input-group-text">
                                            <input type="radio" name="${name}" class="option_radio" />
                                        </div>
                                    </div>
                                    <input type="text" class="form-control option_value" value="${val}"/>
                                    <button class="del">X</button>
                                </div>`;
                }

                button.closest(".quiz").querySelector(".quiz_options").insertAdjacentHTML("beforeend", opt);
            });
        button.parentElement.previousElementSibling.value = "";
        document.getElementById('show_bulk').click();
    }

    if (button.id == "bulk_clue") {
        let bulkText = button.parentElement.previousElementSibling.value; //traverse from button upto textarea
        let acts = quizContainer.querySelectorAll(".quiz");
        let values = bulkText.split("\n");
        values.filter((val) => typeof val !== undefined && val != "").map((val, v) => {
            if (acts[v]) {
                acts[v].querySelector(".ql-editor").innerHTML = val; //it will be added inside ql-editor container
                acts[v].querySelector(".ql-editor").value = val;
            }
        });
        button.parentElement.previousElementSibling.value = "";
        document.getElementById('show_bulk').click();
    }

    if (button.id == "bulk_sentence") {
        let bulkText = button.parentElement.previousElementSibling.value; //traverse from button upto textarea
        let acts = quizContainer.querySelectorAll(".quiz");
        let values = bulkText.split("\n");
        values.filter((val) => typeof val !== undefined && val != "").map((val, v) => {
            if (acts[v]) {
                acts[v].querySelector("#sentence").innerHTML = val;
                acts[v].querySelector("#sentence").value = val;
            }
        });
        button.parentElement.previousElementSibling.value = "";
        document.getElementById('show_bulk').click();
    }

    if (button.classList.contains("del_quiz")) {
        let act = button.parentElement.parentElement;
        quizContainer.childElementCount > 1 ? removeFadeOut(act, 500) : "";
    }

    if (button.classList.contains("del")) {
        if (activity == "Sentence Builder") {
            if (button.closest(".quiz_options").childElementCount > 1) {
                let sentence = button.parentElement.parentElement.parentElement.children[2].children[0].children[1]; //traverse from delete button(X) upto sentence
                let text = sentence.value;
                let ans = button.previousElementSibling.getAttribute("value");
                console.log(ans);
                let _text = text.replace(`[${ans}]`, ans);
                sentence.value = _text;
                sentence.innerHTML = sentence.value;
                removeFadeOut(button.closest(".option"), 300);
            }
        } else {
            button.closest(".quiz_options").childElementCount > 1 ?
                removeFadeOut(button.closest(".option"), 300) :
                "";
        }
    }
    ///////add option////////
    if (button.classList.contains("addOption")) {
        let opt = button.previousElementSibling.firstElementChild.outerHTML;
        opt = new DOMParser().parseFromString(opt, "text/html");
        console.log(opt.body.innerHTML);
        opt.querySelector("input[type=radio]") ?
            opt.querySelector("input[type=radio]").removeAttribute("checked", true) :
            "";

        let newOpt = opt.querySelectorAll(".option_value"); //get all input/text fileds
        for (let i = 0; i < newOpt.length; i++) {
            newOpt[i].setAttribute("value", ""); //empty input fields
            newOpt[i].innerHTML = ""; //empty text area
        }
        button.previousElementSibling.insertAdjacentHTML(
            "beforeend",
            opt.body.innerHTML
        );
        button.previousElementSibling.lastElementChild.classList.add("fadeIn");
        button.previousElementSibling.lastElementChild
            .querySelector(".option_value")
            .focus();
    }
    /////////add quiz////////////
    if (button.id == "addQuiz") {
        switch (activity) {
            case "Select Item":
                quiz = selectitemQuiz;
                break;
            case "Sentence Builder":
                quiz = sentencebuilderQuiz;
                break;
            case "Multiple Choice":
                quiz = multiplechoiceQuiz;
                break;
            case "Drag Category":
                quiz = dragcategoryQuiz;
                break;
            case "Text Input":
                quiz = textinputQuiz;
                break;
        }
        let _quiz = new DOMParser().parseFromString(quiz, 'text/html');
        let no = _quiz.querySelectorAll('.no').innerHTML
        _quiz.querySelector('.makeOptionWrapper') ? _quiz.querySelector('.makeOptionWrapper').setAttribute("style", "display:none;") : "";
        quizContainer.insertAdjacentHTML("beforeend", _quiz.body.innerHTML);
        quizContainer.lastElementChild.classList.add("fadeIn");
        arrange(".quiz");
        setTimeout(() => { initQuill(false) }, 200);

    }
    /////////duplicate////////////
    if (button.id == "duplicate") {
        //change dom values
        optionValue = quizContainer.querySelectorAll(".option_value");
        for (let i = 0; i < optionValue.length; i++) {
            optionValue[i].setAttribute("value", optionValue[i].value);
            optionValue[i].innerHTML = optionValue[i].value; //for textarea
        }

        let quiz = quizContainer.lastElementChild.outerHTML;
        quiz = new DOMParser().parseFromString(quiz, "text/html");
        let nam = quiz.querySelector(".no").innerHTML;
        // let clu = quiz.querySelector("#clueText").getAttribute("value");
        quiz.querySelector(".no").innerHTML = parseInt(nam) + 1;
        quiz.querySelector("#clueText").innerHTML = "";

        let radios = quiz.querySelectorAll(".option_radio");
        for (let r = 0; r < radios.length; r++) {
            radios[r].setAttribute("name", parseInt(nam) + 1);
        }
        console.log(quiz.body.innerHTML);
        quizContainer.insertAdjacentHTML("beforeend", quiz.body.innerHTML);
        quizContainer.lastElementChild.classList.add("fadeIn");

        arrange(".quiz");
        setTimeout(() => { initQuill(false) }, 200);
    }

    if (button.id == "help") {
        ipcRenderer.send("help-window", helpContent); //send event to main window to open modal window

        //receive form data
        ipcRenderer.on("help-data", function(e, data) {
            help = prettifyXml(data);
            console.log(help);
        });
    }

    if (button.name == "font") {
        let fontName = button.value; //get user selected font
        let options = quizContainer.querySelectorAll('.option_value');
        let clue = quizContainer.querySelectorAll('.clue');
        let sentence = quizContainer.querySelectorAll('.sentence');
        let allField = [];
        allField.push(options, clue, sentence);

        console.log(allField)

        for (let i = 0; i < allField.length; i++) {
            let element = allField[i];
            for (let j = 0; j < element.length; j++) {
                let clueText = '';

                if (element[j].nodeName == 'INPUT' || element[j].nodeName == 'TEXTAREA') {
                    element[j].value = filtered(element[j].value, fontName)

                } else {
                    element[j].querySelector(".ql-editor").innerText = filtered(element[j].querySelector(".ql-editor").innerHTML, fontName)
                }
            }
        }
    }

});

function filtered(text, font) {
    let special = ["[", "]"];

    let response = '',
        _text, converted = [];
    _text = text = text.replace(/<p>\s+<[\/]?p>/g, '').replace(/<p><br[\/]?><[\/]?p>/g, '').replace(/(&nbsp;|<br>|<br \/>)/gm, '').replace('<p>', '').replace('</p>', '').replace(/\&lt;/g, "<").replace(/\&gt;/g, ">");
    console.log(font)

    _text = _text.split("")

    switch (font) {
        case "Ascii":
            // isGurmukhi(_text) ? response = toAscii(_text) : response = _text;
            _text.map(ln => {
                ln = ln.replace('।', '[').replace('॥', ']')

                if (isGurmukhi(ln)) {
                    converted.push(toAscii(ln))
                        //!special.includes(ln) ? converted.push(toAscii(ln)) : converted.push(ln);
                } else {
                    converted.push(ln);
                }
            });
            break;
        case "Unicode":
            // !isGurmukhi(_text) ? response = toUnicode(_text) : response = _text;
            _text.map(ln => {
                ln = ln.replace('[', '।').replace(']', '॥')

                if (!isGurmukhi(ln)) {
                    converted.push(toUnicode(ln))
                        //!special.includes(ln) ? converted.push(toUnicode(ln)) : converted.push(ln);

                } else {

                    converted.push(ln);
                }
            });
            break;
    }

    return converted.join("")
}

function charConverter(line) {
    line = line.replace(/<p>\s+<[\/]?p>/g, '').replace(/<p><br[\/]?><[\/]?p>/g, '').replace(/(&nbsp;|<br>|<br \/>)/gm, '').replace('<p>', '')
        .replace('</p>', '').replace(/\&lt;/g, "<")
        .replace(/\&gt;/g, ">");
    let special = ["[", "]"]
    line = line.split("")

    let converted = [];
    line.map(ln => {
        //isGurmukhi(ln) || !special.includes(ln) ? converted.push(toAscii(ln)) : converted.push(ln);
        if (isGurmukhi(ln)) {
            converted.push(toAscii(ln))
        } else {
            converted.push(ln);
            //  special.includes(ln) ?
        }
    })
    return converted.join("")
}
/////////////////////////////////submit//////////////////////////////////////////////////////////

document.querySelector("#submit").addEventListener("click", function() {
    let actName = filePath.split("\\");
    let name = actName[6] + "/" + actName[7] + "/" + actName[8] + "/" + actName[9];
    layout = layoutType.options[layoutType.selectedIndex].text.trim();
    console.log(layout);
    if (confirm("Update " + name + " ?" + layout)) {
        arrange(".quiz");
        let xmlTemplate, content;
        //find template
        switch (activity) {
            case "Select Item":
                xmlTemplate = fs.readFileSync(selectItem, "utf-8");
                content = updateSI(xmlTemplate);
                content = prettifyXml(content, { indent: 4 });
                content = content
                    .replace(/\>\s+\<!/g, "><!")
                    .replace(/\]>\s+\</g, "]><")
                    .replace(/\&lt;/g, "<")
                    .replace(/\&gt;/g, ">"); //regex to keep CDATA in same line
                console.log(content);
                break;

            case "Sentence Builder":
                xmlTemplate = fs.readFileSync(sentenceBuilder, "utf-8");
                content = updateSB(xmlTemplate);
                content = prettifyXml(content, { indent: 4 });
                content = content
                    .replace(/\>\s+\<!/g, "><!")
                    .replace(/\]>\s+\</g, "]><")
                    .replace(/\&lt;/g, "<")
                    .replace(/\&gt;/g, ">"); //regex to keep CDATA in same line
                console.log(content);
                break;

            case "Vertical Arrange":
                xmlTemplate = fs.readFileSync(verticalArrange, "utf-8");
                console.log(xmlTemplate);

                content = updateVA(xmlTemplate);
                content = prettifyXml(content, { indent: 4 });
                console.log(content);
                break;
            case "Horizontal Arrange":
                xmlTemplate = fs.readFileSync(horizontalArrange, "utf-8");
                console.log(xmlTemplate);

                content = updateHA(xmlTemplate);
                content = prettifyXml(content, { indent: 4 });
                console.log(content);
                break;
            case "Multiple Choice":
                xmlTemplate = fs.readFileSync(multipleChoice, "utf-8");
                console.log(xmlTemplate);

                content = updateMC(xmlTemplate);
                content = prettifyXml(content, { indent: 4 });
                content = content
                    .replace(/\>\s+\<!/g, "><!")
                    .replace(/\]>\s+\</g, "]><"); //regex to keep CDATA in same line
                console.log(content);
                break;
            case "Drag Category":
                xmlTemplate = fs.readFileSync(dragCategory, "utf-8");
                console.log(xmlTemplate);

                content = updateDC(xmlTemplate);
                content = prettifyXml(content, { indent: 4 });
                //  content = content.replace(/>\s+</g, "><"); //regex to keep target element in same line
                console.log(content);
                break;

            case "Sound Recorder":
                xmlTemplate = fs.readFileSync(soundrecorder, "utf-8");
                console.log(xmlTemplate);

                content = updateSR(xmlTemplate);
                content = prettifyXml(content, { indent: 4 });
                console.log(content);
                break;

            case "Text Input":
                xmlTemplate = fs.readFileSync(textinput, "utf-8");
                console.log(xmlTemplate);

                content = updateTI(xmlTemplate);
                content = prettifyXml(content, { indent: 4 });
                console.log(content);
                break;
            default:
                quizContainer.innerHTML = "Invalid Template";
        }
        //craete activity folder if not exist and write files
        !fs.existsSync(filePath) ? fs.mkdirSync(filePath) : "";
        fs.writeFile(path.join(filePath, "content.xml"), content, function(err) {
            if (!err) {
                displayMessage(status, `updated ${name}`, 3000);
                copyFiles(activity);
                help.length ? fs.writeFileSync(path.join(filePath, "help.html"), help) : "";
            } else {
                console.log(err);
            }
        });
    }
}); //end submit

//===========================================================================================================================================================//
//==================================== functions ============================================================================================================//
function checkUpdates() {
    document.querySelector("#filePath").value = localStorage.getItem("path") //get path from local storgae

    let user = "uzair4100";
    let repo = "activity-maker";
    let outputdir = path.join(os.homedir(), "AppData/Local/activity-maker-updater/pending");
    console.log(outputdir);
    let leaveZipped = false;

    ipcRenderer.on("version", function(e, appVersion) {
        console.log(appVersion);
        let currentVersion = appVersion;
        axios.get(`https://api.github.com/repos/${user}/${repo}/releases/latest`)
            .then((resp) => {
                let data = resp.data
                console.log(data)
                let appName = data.assets[0].name;
                let latestVersion = data.tag_name;
                console.log('latestVersion is ' + latestVersion);
                if (appVersion != "") {
                    if (currentVersion != latestVersion) {
                        console.log("update found")
                        modal.style.display = "";
                        document.querySelector(".card-body").innerHTML = "update found";
                        if (fs.existsSync(outputdir + "/" + appName)) {
                            ipcRenderer.send("downloaded")
                        } else {
                            modal.style.display = "";
                            !fs.existsSync(outputdir) ? fs.mkdirSync(outputdir) : "";
                            let existingFile = fs.readdirSync(outputdir).filter((file) => path.extname(file) == ".exe"); //check for existing exe file and delete them first
                            existingFile.forEach((file) => fs.unlinkSync(outputdir + "/" + file));
                            //console.log(data)
                            let url_exe = data.assets[0].browser_download_url;
                            console.log(url_exe)
                                // shell.openExternal(url_exe)
                            let dest = path.join(outputdir, appName);
                            var file = fs.createWriteStream(dest);

                            axios({
                                url: url_exe,
                                method: 'GET',
                                responseType: 'arraybuffer', // important
                                onDownloadProgress: (progressEvent) => {
                                    let percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                                    //console.log(percentCompleted);
                                    document.querySelector(".card-body").innerHTML = "Downloading Updates...";
                                    document.querySelector('#bar').innerHTML = `<div class="progress">
                                    <div class="progress-bar progress-bar-striped" role="progressbar" style="width:${percentCompleted}%" aria-valuenow="${percentCompleted}">${percentCompleted}%</div></div>`
                                }
                            }).then(response => {
                                const buffer = Buffer.from(response.data, 'base64');
                                file.write(buffer, 'base64');
                                displayUpdateStatus(modal, "Successfully Downloaded", 1500);

                                file.on('finish', () => {
                                    console.log('wrote all data to file');
                                    ipcRenderer.send("downloaded"); //send event to main process to ask for update
                                });

                                // close the stream
                                file.end();
                            })

                        }

                        //show messagebox and begin installation if user response is yes (0)
                        ipcRenderer.on("user-response", function(e, index) {
                            if (index == 0) {
                                //displayUpdateStatus(modal, "Starting Installation", 3000);
                                shell.openExternal(outputdir + "/" + appName)
                                ipcRenderer.send("close-app")
                            } else {
                                modal.style.display = "none";
                            }
                        });
                    } else {
                        console.log("up to date")
                    }
                }
            });
    });
}

function activityFinder(filePath) {
    // return new Promise(function(resolve, reject) {
    let Type = "";
    let contentXML = fs.readFileSync(path.join(filePath, "content.xml"), "utf-8");
    // let xml = new DOMParser().parseFromString(contentXML, "application/xml");
    let $ = cheerio.load(contentXML, { xmlMode: true, decodeEntities: false });
    console.log($.xml());

    let fileExist = fs.existsSync(path.join(filePath, "content.xml"));

    // if (fileExist) {
    if ($("item[type=target]").length) {
        Type = "Drag Category";
    }
    if ($("action[type=validateChoices]").length) {
        Type = "Select Item";
    }
    if ($("item[type=sentenceTextInput]").length) {
        Type = "Text Input";
    }
    if ($("item[type=sentenceButtons]").length) {
        Type = "Sentence Builder";
    }
    if ($("questions").attr("randomise_left_column")) {
        Type = "Vertical Arrange";
    }
    if ($("questions").attr("textwidthfiddle")) {
        Type = "Horizontal Arrange";
    }
    if ($("item[type=clickableButton]").length) {
        Type = "Multiple Choice";
    }
    if ($("item[type=soundRecorder]").length) {
        Type = "Sound Recorder";
    }
    console.log(Type);
    let opt = document.querySelectorAll("option");
    console.log(opt);
    type = "sentenceTextInput"
    for (let i = 0; i < opt.length; i++) {
        opt[i].innerHTML == Type ? (opt[i].selected = true) : "";
    }

    return Type;
}

function fetcher(exist, callFunction, filePath, template) {
    if (exist) {
        callFunction
            .then(function(resp) {
                arrange(".quiz");
                console.log(resp);
                helpContent = helper(filePath); //get content from help file if exists
                initQuill(true)
                    // document.getElementById('font_ascii').click()
            })
            .catch(function(err) {
                quizContainer.innerHTML = err;

                // quizContainer.innerHTML = `<div class="alert alert-danger" role="alert">Could not load  activity &#128547;</div>`;
            });
    } else {
        quizContainer.innerHTML = template;
        helpContent = helper(filePath); //get content from help file if exists
        initQuill(true)
    }
}


function initQuill(status) {
    //status is true on intail load, false when add/duplicate quiz
    if (status) {
        let clues = quizContainer.querySelectorAll('.clue')
        for (let index = 0; index < clues.length; index++) {
            quill[index] = new Quill(clues[index], {
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline'],
                        ['link'],
                        [{
                            'color': ['#800000', '#6d26e0']
                        }]
                    ]
                },
                theme: 'bubble'
            });
        }
    } else {
        let last_quiz = quizContainer.lastElementChild;
        new Quill(last_quiz.querySelector('.clue'), {
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    ['link'],
                    [{
                        'color': ['#800000', '#6d26e0']
                    }]
                ]
            },
            theme: 'bubble'
        });
    }
}

function helper(filePath) {
    let fileExist = fs.existsSync(path.join(filePath, "help.html"));
    if (fileExist) {
        let content = fs.readFileSync(path.join(filePath, "help.html"), "utf-8");
        console.log(content);
        return content;
    }
}

function arrange(classname) {
    let quizzes = quizContainer.querySelectorAll(classname);
    for (let i = 0; i < quizzes.length; i++) {
        quizzes[i].querySelector(".no").innerHTML = i + 1;
        let radios = quizzes[i].querySelectorAll("input[type=radio]");
        for (let r = 0; r < radios.length; r++) {
            radios[r].setAttribute("name", i + 1);

            if (radios[r].checked) {
                radios[r].setAttribute("checked", true);
            } else {
                radios[r].removeAttribute("checked", true);
            }
        }
    }
    optionValue = quizContainer.querySelectorAll("input[type=text]");
    for (let i = 0; i < optionValue.length; i++) {
        optionValue[i].setAttribute("value", optionValue[i].value);
    }
}

function copyFiles(act) {
    let folder = path.join(templateFolder, act);
    let hasFla = fs.readdirSync(filePath).filter((file) => path.extname(file) == ".fla");
    console.log(hasFla);
    let files = fs.readdirSync(folder).filter((file) => path.extname(file) != ".xml"); //we don't have to copy xml file

    files.forEach(function(file) {
        let src = path.join(folder, file);
        let dest = path.join(filePath, file);
        if (path.extname(src) == ".fla") {
            if (hasFla.length < 1) {
                copy(src, dest).then(function(results) {
                    console.log("Copied " + results.length + " files");
                });
            }
        } else {
            copy(src, dest).then(function(results) {
                console.log("Copied " + results.length + " files");
            });
        }
    });
}

function attrRemover() {
    let checkboxes = document
        .getElementById("structure")
        .querySelectorAll("input[type=checkbox]");
    checkboxes.forEach((checkbox) => (checkbox.checked = false));
    let btns = document.querySelectorAll("#addQuiz,#duplicate,#help");
    btns.forEach((btn) => btn.removeAttribute("disabled", true));
}

function removeFadeOut(el, speed) {
    var seconds = speed / 1000;
    el.style.transition = "opacity " + seconds + "s ease";

    el.style.opacity = 0;
    setTimeout(function() {
        el.remove();
        arrange(".quiz");
    }, speed);
}

function auto_grow(element) {
    element.style.height = "auto";
    element.style.height = element.scrollHeight + "px";
}

function displayMessage(status, msg, duration) {
    status.style.display = "";
    status.innerHTML = msg;
    setTimeout(function() {
        status.style.display = "none";
    }, duration);
}

function displayUpdateStatus(modal, msg, duration) {
    modal.style.display = "";
    document.querySelector(".card-body").innerHTML = msg;
    setTimeout(function() {
        modal.style.display = "none";
    }, duration);
}

//clear app
document.querySelector("#clear").addEventListener("click", function() {
    location.reload();
});




function getLanguage(source) {

    detectlanguage.detectCode(source).then(function(result) {
        let langCode = JSON.stringify(result)
        langCode = langCode.substr(1, langCode.length - 2)

        axios.get(path.join(__dirname, 'languages.json')).then(lang => {
            let languagesList = lang.data
            let langName = languagesList.filter(lan => lan.code == langCode).map(lan => lan.name)
            langName = langName.toString().toLowerCase()
            alert(langName)
        })
    });

}