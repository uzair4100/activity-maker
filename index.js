//var modal = document.getElementById("modal");
//modal.style.display = "none";
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
var additionalAttributes = [];
const _audios = ["correct.mp3", "prompt.mp3", "select.mp3", "wrong.mp3", "drop.mp3", "tap.mp3", "silence.mp3", "content.swf"];
// set Quill to use <b> and <i>, not <strong> and <em> 
var bold = Quill.import('formats/bold');
bold.tagName = 'b'; // Quill uses <strong> by default
Quill.register(bold, true);
const NBSP = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
const interactives = [{ "language": "french", "year": "year10" }, { "language": "german", "year": "year10" }, { "language": "spanish", "year": "year10" }, { "language": "indonesian", "year": "year10" }, { "language": "italian", "year": "year10" }, { "language": "japanese", "year": "year10" }, { "language": "chinese", "year": "year12" }];
var italic = Quill.import('formats/italic');
italic.tagName = 'i'; // Quill uses <em> by default
Quill.register(italic, true);





//variables
var filePath,
    optionValue,
    help = "",
    helpContent = "",
    activity,
    layout = "",
    accents = "",
    webInteractive = true,
    quiz = "",
    actName = "",

    quillClue = [];
quillSentence = [];
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
const accentsType = document.getElementById("accents");
const templateFolder = "\\\\vsl-file01\\coursesdev$\\template";
const fullstops = [".", "。", "|", "?", "!", ",", "，"];
const wrap = document.getElementById("wrap");
const languages = document.getElementById("languages");
status.style.display = "none";
const dialog = electron.dialog;

var structure = document.querySelector("#structure");


structure.style.display = "none";

checkUpdates();
//load activity event handler
document.querySelector("#load").addEventListener("click", function() {
    quizContainer.innerHTML = "",
        help = "";
    filePath = document.querySelector("#filePath").value;
    attrRemover();
    actName = filePath.split("\\");
    webInteractive = interactives.filter(course => actName[5] == "2022" && course.language == actName[6] && course.year == actName[7]).length > 0;
    console.log(webInteractive)
        // actName[6] != "punjabi" ? document.getElementById('font').style.visibility = 'hidden' : document.getElementById('font').style.visibility = 'visible'; //font is for punjabi only

    let fileExist = fs.existsSync(path.join(filePath, "content.xml"));

    fileExist ? (activity = activityFinder(filePath)) : (activity = activityType.options[activityType.selectedIndex].text.trim());
    console.log(activity);
    let contentFile = path.join(filePath, "content.xml");
    // copyFiles(activity)
    //find template
    switch (activity) {
        case "Select Item":
            fetcher(fileExist, loadSI(contentFile, webInteractive), filePath, selectitemQuiz);
            break;

        case "Vertical Arrange":
            document.getElementById("addQuiz").setAttribute("disabled", true);
            document.getElementById("duplicate").setAttribute("disabled", true);
            fetcher(fileExist, loadVA(contentFile, webInteractive), filePath, verticalarrangeQuiz);
            break;

        case "Horizontal Arrange":
            document.getElementById("addQuiz").setAttribute("disabled", true);
            document.getElementById("duplicate").setAttribute("disabled", true);
            fetcher(fileExist, loadHA(contentFile, webInteractive), filePath, horizontalarrangeQuiz);
            break;

        case "Sentence Builder":
            fetcher(fileExist, loadSB(contentFile, webInteractive), filePath, sentencebuilderQuiz);
            break;

        case "Multiple Choice":
            document.getElementById("help").setAttribute("disabled", true);
            fetcher(fileExist, loadMC(contentFile, webInteractive), filePath, multiplechoiceQuiz);
            break;

        case "Drag Category":
            document.getElementById("duplicate").setAttribute("disabled", true);
            fetcher(fileExist, loadDC(contentFile, webInteractive), filePath, dragcategoryQuiz);
            break;

        case "Sound Recorder":
            document.getElementById("addQuiz").setAttribute("disabled", true);
            document.getElementById("duplicate").setAttribute("disabled", true);
            fetcher(fileExist, loadSR(contentFile, webInteractive), filePath, soundrecorderQuiz);
            break;

        case "Text Input":
            fetcher(fileExist, loadTI(contentFile, webInteractive), filePath, textinputQuiz);
            break;
        default:
            quizContainer.innerHTML = "Invalid Activity Type!";
    }
    var makeOptionWrapper = document.querySelectorAll(".makeOptionWrapper");
    makeOptionWrapper.forEach((maker) => (maker.style.display = "none"));
});

/////////////////////find source path/////////////////////////////////////////
document.getElementById("chooseFile").addEventListener("click", function(e) {
    e.preventDefault();
    e.stopPropagation()
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
                let bracketOpen = "[",
                    bracketClose = "]";
                if (actName[6] == "punjabi") {
                    bracketOpen = "{", bracketClose = "}"; //punjabi has "{}" brackets
                }
                text = text.substring(0, start) + bracketOpen + word + bracketClose + text.substring(end, text.length); //make new sentence
                text = text.replace(/\&lt;/g, "<").replace(/\&gt;/g, ">");
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

    if (button.id == "table") {
        let el = e.target.parentElement.parentElement.previousElementSibling;
        let text = el.value;
        // alert(text);
        if (el.classList.contains("sentence") && !text.includes("<tr>")) {
            let tr = ""
            let line = text.includes("<br>") ? text.split("<br>") : text.split("\n");
            console.log(line)
            for (let i = 0; i < line.length; i++) {
                if (line[i] != "") {
                    let row = line[i].split(":");
                    let left = row[0].trim()
                    let right = row[1].trim()
                    tr += `<tr><td>${left}&nbsp;: </td><td>${right}</td></tr>`
                }
            }
            let table = `<table class="acttable">${tr}</table>`
                // table = prettifyXml(table)
            table = table.replace(/\&lt;/g, "<").replace(/\&gt;/g, ">")

            // alert(table)
            //el.innerHTML = table;
            el.value = table;
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


    if (button.parentElement.parentElement.id == "op") {
        // let bulkText = button.parentElement.previousElementSibling.value; //traverse from button upto textarea
        let bulkText = button.parentElement.parentElement.parentElement.previousElementSibling.value; //traverse from button upto textarea
        console.log(bulkText)
        let acts = quizContainer.querySelectorAll(".quiz");
        let name = button.closest(".quiz").querySelector(".no").innerHTML;
        let values = "";
        bulkText.includes("\n") ? values = bulkText.split("\n") : "";
        values = values.filter((val) => typeof val !== undefined && val != ""); //trim array elements

        let opt = "";
        values.map((val, v) => {
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
            //add option in quiz depending on button clicked
            if (button.classList.contains("separate")) {
                if (quizContainer.childElementCount == values.length) {
                    (acts[v]) ? acts[v].querySelector(".quiz_options").insertAdjacentHTML("beforeend", opt): "";

                }
            } else {
                button.closest(".quiz").querySelector(".quiz_options").insertAdjacentHTML("beforeend", opt);
            }
        });
        button.parentElement.parentElement.parentElement.previousElementSibling.value
            //document.getElementById('show_bulk').click();
        button.closest('.makeOptionWrapper').style.display = "none";
    }

    if (button.id == "bulk_clue") {
        let bulkText = button.parentElement.previousElementSibling.value; //traverse from button upto textarea
        let acts = quizContainer.querySelectorAll(".quiz");
        let values = bulkText.split("\n");
        values = values.filter((val) => typeof val !== undefined && val != ""); //trim array elements

        if (quizContainer.childElementCount == values.length) {
            values.map((val, v) => {
                if (acts[v]) {
                    acts[v].querySelector(".ql-editor").innerHTML = val; //it will be added inside ql-editor container
                    acts[v].querySelector(".ql-editor").value = val;
                }
            });
            button.parentElement.previousElementSibling.value = "";
            //document.getElementById('show_bulk').click();
            button.closest('.makeOptionWrapper').style.display = "none";
        } else {
            alert("There must be " + values.length + " quizes");
        }
    }

    if (button.id == "bulk_sentence") {
        let bulkText = button.parentElement.previousElementSibling.value; //traverse from button upto textarea
        let acts = quizContainer.querySelectorAll(".quiz");
        let values = bulkText.split("\n");
        values = values.filter((val) => typeof val !== undefined && val != ""); //trim array elements
        if (quizContainer.childElementCount == values.length) {
            values.map((val, v) => {
                if (acts[v]) {
                    acts[v].querySelector("#sentence").innerHTML = val;
                    acts[v].querySelector("#sentence").value = val;
                }
            });
            button.parentElement.previousElementSibling.value = "";
            // document.getElementById('show_bulk').click();
            button.closest('.makeOptionWrapper').style.display = "none";
        } else {
            alert("There must be " + values.length + " quizes");
        }
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
                let _text = "";
                actName[6] == "punjabi" ? _text = text.replace(`{${ans}}`, ans) : _text = text.replace(`[${ans}]`, ans); //punjabi has "{}" brackets, not "[]"
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
        opt.querySelector("input[type=radio]") ? opt.querySelector("input[type=radio]").removeAttribute("checked", true) : "";

        let newOpt = opt.querySelectorAll(".option_value"); //get all input/text fileds
        for (let i = 0; i < newOpt.length; i++) {
            newOpt[i].setAttribute("value", ""); //empty input fields
            newOpt[i].innerHTML = ""; //empty text area
        }
        button.previousElementSibling.insertAdjacentHTML("beforeend", opt.body.innerHTML);
        button.previousElementSibling.lastElementChild.classList.add("fadeIn");
        button.previousElementSibling.lastElementChild.querySelector(".option_value").focus();
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
        setTimeout(() => {
            initQuill(false);
            quizContainer.scrollTop = quizContainer.scrollHeight;
        }, 200);

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
        setTimeout(() => {
            initQuill(false);
            quizContainer.scrollTop = quizContainer.scrollHeight;
        }, 200);
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
    _text = text.replace(/<p>\s+<[\/]?p>/g, '').replace(/<p><br[\/]?><[\/]?p>/g, '').replace(/(&nbsp;|<br>|<br \/>)/gm, '').replace('<p>', '').replace('</p>', '').replace(/\&lt;/g, "<").replace(/\&gt;/g, ">");
    console.log(font)

    _text = _text.split("")

    switch (font) {
        case "Ascii":
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

    return converted.join("").replace("੍", "")
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
    accents = accentsType.options[accentsType.selectedIndex].text.trim();
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
                    .replace(/\>\s+\<img/g, '><img')
                    .replace(/\>\s+\<!/g, "><!")
                    .replace(/\]>\s+\</g, "]><")
                    .replace(/\&lt;/g, "<")
                    .replace(/\&gt;/g, ">"); //regex to keep CDATA in same line
                //.replace(/\>\s+\</g, '><')
                console.log(content);
                break;

            case "Sentence Builder":
                xmlTemplate = fs.readFileSync(sentenceBuilder, "utf-8");
                content = updateSB(xmlTemplate);
                content = prettifyXml(content, { indent: 4 });
                content = content = content.replace(/\&lt;/g, "<").replace(/\&gt;/g, ">").replace(/\>\s+\<!/g, "><!").replace(/\]>\s+\</g, "]><").replace(/\>\s+\<span/g, "><span").replace(/span>\s+</g, "span><") //regex to keep CDATA in same line
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
                content = content.replace(/\&lt;/g, "<").replace(/\&gt;/g, ">").replace(/\>\s+\<!/g, "><!").replace(/\]>\s+\</g, "]><") //regex to keep CDATA in same line
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
                displayMessage(status, `error!!`, 3000);
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
                            }).catch(e => {
                                existingFile.forEach((file) => fs.unlinkSync(outputdir + "/" + file));
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
    let Type = "",
        layout = "",
        accents = "";
    // webInteractive = false;
    let contentXML = fs.readFileSync(path.join(filePath, "content.xml"), "utf-8");
    // let xml = new DOMParser().parseFromString(contentXML, "application/xml");
    let $ = cheerio.load(contentXML, { xmlMode: true, decodeEntities: false });
    console.log($.xml());

    let fileExist = fs.existsSync(path.join(filePath, "content.xml"));

    $('content').attr('layout') ? layout = $('content').attr('layout').trim() : ""; //find layout for 2022 interactives
    $('content').attr('accents') ? accents = $('content').attr('accents').trim() : ""; //find accents for 2022 interactives

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
    let opt = document.querySelectorAll("option"); //get all dropdown options
    console.log(opt);

    for (let i = 0; i < opt.length; i++) {
        opt[i].innerHTML == Type ? (opt[i].selected = true) : "";
        opt[i].innerHTML.toLocaleLowerCase() == layout.toLocaleLowerCase() ? (opt[i].selected = true) : "";
        opt[i].innerHTML.toLocaleLowerCase() == accents.toLocaleLowerCase() ? (opt[i].selected = true) : "";
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
    let _toolbar = [
        ['bold', 'italic', 'underline'],
        ['link'],
        [{
            'color': ['#800000', '#6d26e0']
        }],
        ['clean']
    ]
    if (status) {
        let clues = quizContainer.querySelectorAll('.clue');
        for (let i = 0; i < clues.length; i++) {
            quillClue[i] = new Quill(clues[i], {
                modules: {
                    toolbar: _toolbar
                },
                theme: 'bubble'
            });
        }
    } else {
        let last_quiz = quizContainer.lastElementChild;
        new Quill(last_quiz.querySelector('.clue'), {
            modules: {
                toolbar: _toolbar
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
    let onCorrect_audio = document.getElementById("onCorrect_audio");
    let clue_audio = document.getElementById("clue_audio");
    let clue_audioPlayer = document.getElementById("clue_audioPlayer");

    let folder = path.join(templateFolder, act);
    let hasFla = fs.readdirSync(filePath).filter((file) => path.extname(file) == ".fla");
    console.log(hasFla);
    let files = fs.readdirSync(folder).filter((file) => path.extname(file) != ".xml"); //we don't have to copy xml file

    files.forEach(function(file) {
        let src = path.join(folder, file);
        let dest = path.join(filePath, file);
        if (path.extname(src) == ".fla") {
            if (hasFla.length < 1) {
                if (!webInteractive) {
                    copy(src, dest).then(function(results) {
                        console.log("Copied " + results.length + " files");
                    });
                }
            }
        } else {
            if (!webInteractive) { //we don't need audio files for web interatives
                copy(src, dest).then(function(results) {
                    console.log("Copied " + results.length + " files");
                }).catch(e => console.log(`${path.basename(dest)} already exists`))
            }
        }
    });

    if (onCorrect_audio.checked || clue_audio.checked || clue_audioPlayer.checked) {
        let soundLength = "";
        switch (activity) {
            case "Select Item":
            case "Sentence Builder":
            case "Multiple Choice":
            case "Drag Category":
            case "Text Input":
                soundLength = quizContainer.childElementCount;
                break;
            default:
                soundLength = quizContainer.querySelector('.quiz_options').childElementCount

        }
        for (let i = 1; i <= soundLength; i++) {
            let sound = "";
            parseInt(i) < 10 ? sound = `s00${i}.mp3` : sound = `s0${i}.mp3`;

            let _src = `\\\\vsl-file01\\coursesdev$\\template\\test_sounds\\${sound}`;
            let _dest = path.join(filePath, sound);
            copy(_src, _dest)
                .then((r) => console.log(`${path.basename(_dest)} copied`))
                .catch(e => console.log(`${path.basename(_dest)} already exists`))
        }
    }
}

function attrRemover() {
    let checkboxes = document.getElementById("structure").querySelectorAll("input[type=checkbox]");
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

/*/////////////////////////
var recursive = require("recursive-readdir");

recursive("\\\\vsl-file01\\coursesdev$\\courses\\2022\\french\\year10", function(err, files) {
    // `files` is an array of file paths

    let filtered = files.filter(file => _audios.includes(path.basename(file)) || path.extname(file) == ".fla")
    console.log(filtered.length)
    console.log(filtered)
    for (let i = 0; i < filtered.length; i++) {
        const element = filtered[i];
        //unlinkSync(element)
      //  console.log(`DELETED: ${element}`)

    }
});
//////////////////////////*/