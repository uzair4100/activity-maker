const electron = require("electron");
const { shell } = electron;
const ipcRenderer = electron.ipcRenderer;
const path = require("path");
const http = require("http");
const fs = require("fs");
const cheerio = require("cheerio");
const Sortable = require("sortablejs");
var prettifyXml = require('prettify-xml');
const { active } = require("sortablejs");
const copy = require('recursive-copy');
const { serialize } = require("v8");

//variables
var filePath, optionValue, help, helpContent, activity, quiz = "",
    audioFiles = [];
var source = path.join(require("os").homedir(), "id01/content.xml");
//xml templates
var selectItem = path.join(__dirname, "template/selectitem.xml");
var verticalArrange = path.join(__dirname, "template/verticalarrange.xml");
var horizontalArrange = path.join(__dirname, "template/horizontalarrange.xml");
var sentenceBuilder = path.join(__dirname, "template/sentencebuilder.xml");
var multipleChoice = path.join(__dirname, "template/multiplechoice.xml");
var dragCategory = path.join(__dirname, "template/dragcategory.xml");
//html templates
var selectitemQuiz = document.querySelector(".selectitem").outerHTML;
var verticalarrangeQuiz = document.querySelector(".verticalarrange").outerHTML;
var horizontalarrangeQuiz = document.querySelector(".horizontalarrange").outerHTML;
var sentencebuilderQuiz = document.querySelector(".sentencebuilder").outerHTML;
var multiplechoiceQuiz = document.querySelector(".multiplechoice").outerHTML;
var dragcategoryQuiz = document.querySelector(".dragcategory").outerHTML;

var quizContainer = document.getElementById("quiz_container");
const status = document.getElementById("status");
const activityType = document.getElementById("activityType");
const templateFolder = path.join(__dirname, "template");
const fullstops = [".", "。", "|", "?"];
status.style.display = "none"
var appVersion = electron.remote.app.getVersion();
const dialog = electron.remote.dialog;

console.log(appVersion)
    /*if (appVersion != "1.0.1") {
        ipcRenderer.send("updateApp");
        ipcRenderer.on('updateApp-response', function(e, resp) {
            console.log(resp)
            if (resp == 1) {
                shell.openExternal(path.join(__dirname, 'dist/Activity_Maker Setup 1.0.1.exe'));
            }
        })

    }*/

//sortable
/*Sortable.create(quizContainer, {
    // filter: ".sentence",
    onEnd: () => arrange(".quiz"),
});*/

var structure = document.querySelector("#structure");
structure.style.display = "none";

//load activity event handler
document.querySelector("#load").addEventListener("click", function() {
    filePath = document.querySelector("#filePath").value;
    attrRemover()
    quizContainer.innerHTML = "", audioFiles = [];
    document.getElementById("addQuiz").removeAttribute("disabled", true);
    document.getElementById("duplicate").removeAttribute("disabled", true);

    let fileExist = fs.existsSync(path.join(filePath, "content.xml"));

    fileExist ? activity = activityFinder(filePath) : activity = activityType.options[activityType.selectedIndex].text.trim();
    console.log(activity)
    let contentFile = path.join(filePath, "content.xml");

    //find template
    switch (activity) {
        case "Select Item":
            audioFiles = ["correct.mp3", "prompt.mp3", "select.mp3", "wrong.mp3"];
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
            fetcher(fileExist, loadMC(contentFile), filePath, multiplechoiceQuiz);
            break;

        case "Drag Category":
            // document.getElementById("duplicate").setAttribute("disabled", true);
            audioFiles = ["drop.mp3"];
            fetcher(fileExist, loadDC(contentFile), filePath, dragcategoryQuiz);
            break;
        default:
            quizContainer.innerHTML = "Invalid Activity Type!";
    }

});

/////////////////////find source path/////////////////////////////////////////
document.getElementById("chooseFile").addEventListener("click", function() {
    ipcRenderer.send("chooseFile-dialog"); //send choose file event

    //receive choosefile event
    ipcRenderer.on("chooseFile-selected", function(event, folders) {
        document.getElementById("filePath").value = folders[0];
        filePath = document.getElementById("filePath").value;
    });
}); //end source path



/////////////////////////////////////////get selection for sentence builder /////////////////////////////////////////
document.addEventListener("mouseup", function(e) {
    let el = e.target;
    let text = el.value;
    let start = el.selectionStart;
    let end = el.selectionEnd;

    if (el.classList.contains("sentence")) {
        let word = (window.getSelection() || document.getSelection()).toString();
        if (word.trim().length) {
            text = text.substring(0, start) + "[" + word + "]" + text.substring(end, text.length); //make new sentence
            el.setAttribute("value", text);
            el.value = el.getAttribute("value");

            //set option
            let opt = `<div class="input-group mt-1 option">
                        <input type="text" class="form-control option_value" value="${word}"/>
                        <button class="del">X</button>
                    </div>`;
            el.closest(".sentencebuilder").querySelector(".quiz_options").insertAdjacentHTML("beforeend", opt);
        }
    }
});

////////////////////////////////////////////////////add or delete quizzes and options//////////////////////////////////////////////////
document.addEventListener("click", function(e) {

    let button = e.target;
    console.log(button);
    if (button.classList.contains("del_quiz")) {
        //button.closest(".selectitem").remove();
        quizContainer.childElementCount > 1 ? button.parentElement.parentElement.remove() : "";
        arrange(".quiz");
    }

    if (button.classList.contains("del")) {
        arrange(".quiz");
        if (activity == "Sentence Builder") {
            if (button.closest(".quiz_options").childElementCount > 1) {
                let sentence = button.parentElement.parentElement.parentElement.firstElementChild.lastElementChild;
                let text = sentence.getAttribute("value");
                let ans = button.previousElementSibling.getAttribute("value");
                //   let startIndex = text.indexOf(`[${ans}]`);
                //  let endIndex = startIndex + ans.length - 1;
                // console.log(endIndex)
                let _text = text.replace(`[${ans}]`, ans)
                    //  let _text = text.substring(0, startIndex - 1) + ans + text.substring(endIndex + 1, text.length);
                console.log(_text)
                sentence.setAttribute("value", _text);
                sentence.value = sentence.getAttribute("value");
                button.closest(".option").remove()
            }

        } else {
            button.closest(".quiz_options").childElementCount > 1 ? button.closest(".option").remove() : "";
        }
    }

    if (button.classList.contains("addOption")) {
        let opt = button.previousElementSibling.lastElementChild.outerHTML;
        opt = new DOMParser().parseFromString(opt, "text/html");
        console.log(opt.body.innerHTML)
        opt.querySelector("input[type=radio]") ? opt.querySelector("input[type=radio]").removeAttribute("checked", true) : "";

        let newOpt = opt.querySelectorAll(".option_value"); //get all input/text fileds
        for (let i = 0; i < newOpt.length; i++) {
            newOpt[i].setAttribute("value", ""); //empty input fields
            newOpt[i].innerHTML = ""; //empty text area
        }
        button.previousElementSibling.insertAdjacentHTML("beforeend", opt.body.innerHTML);
        button.previousElementSibling.lastElementChild.querySelector(".option_value").focus();

    }

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
        }
        quizContainer.insertAdjacentHTML("beforeend", quiz);
        arrange(".quiz");
    }

    if (button.id == "duplicate") {
        //change dom values
        optionValue = quizContainer.querySelectorAll(".option_value");
        for (let i = 0; i < optionValue.length; i++) {
            optionValue[i].setAttribute("value", optionValue[i].value);
            optionValue[i].innerHTML = optionValue[i].value //for textarea
        }

        let quiz = quizContainer.lastElementChild.outerHTML;
        quiz = new DOMParser().parseFromString(quiz, "text/html");
        let nam = quiz.querySelector(".no").innerHTML;
        // let clu = quiz.querySelector("#clueText").getAttribute("value");
        quiz.querySelector(".no").innerHTML = parseInt(nam) + 1;
        quiz.querySelector("#clueText").setAttribute("value", "");

        let radios = quiz.querySelectorAll(".option_radio");
        for (let r = 0; r < radios.length; r++) {
            radios[r].setAttribute("name", parseInt(nam) + 1);
        }
        console.log(quiz.body.innerHTML)
        quizContainer.insertAdjacentHTML("beforeend", quiz.body.innerHTML);
    }

    if (button.id == "help") {
        ipcRenderer.send("help-window", helpContent); //send event to main window to open modal window

        //receive form data
        ipcRenderer.on("help-data", function(e, data) {
            help = prettifyXml(data);
            console.log(help)
        });
    }
});

/////////////////////////////////submit//////////////////////////////////////////////////////////

document.querySelector("#submit").addEventListener("click", function() {
    let actName = filePath.split("\\");
    let name = "Update " + actName[6] + "/" + actName[7] + "/" + actName[8] + "/" + actName[9];
    if (confirm(name + " ?")) {
        arrange(".quiz");
        let xmlTemplate, content;
        //find template
        switch (activity) {
            case "Select Item":
                xmlTemplate = fs.readFileSync(selectItem, "utf-8");
                content = updateSI(xmlTemplate);
                content = prettifyXml(content, { indent: 4 })
                console.log(content)
                break;

            case "Sentence Builder":
                xmlTemplate = fs.readFileSync(sentenceBuilder, "utf-8");
                content = updateSB(xmlTemplate);
                content = prettifyXml(content, { indent: 4 })
                console.log(content)
                break;

            case "Vertical Arrange":
                xmlTemplate = fs.readFileSync(verticalArrange, "utf-8");
                console.log(xmlTemplate)

                content = updateVA(xmlTemplate);
                content = prettifyXml(content, { indent: 4 })
                console.log(content)
                break;
            case "Horizontal Arrange":
                xmlTemplate = fs.readFileSync(horizontalArrange, "utf-8");
                console.log(xmlTemplate)

                content = updateHA(xmlTemplate);
                content = prettifyXml(content, { indent: 4 })
                console.log(content)
                break;
            case "Multiple Choice":
                xmlTemplate = fs.readFileSync(multipleChoice, "utf-8");
                console.log(xmlTemplate)

                content = updateMC(xmlTemplate);
                content = prettifyXml(content, { indent: 4 })
                content = content.replace(/\>\s+\<!/g, '><!').replace(/\]>\s+\</g, ']><'); //regex to keep CDATA in same line
                console.log(content)
                break;
            case "Drag Category":
                xmlTemplate = fs.readFileSync(dragCategory, "utf-8");
                console.log(xmlTemplate)

                content = updateDC(xmlTemplate);
                content = prettifyXml(content, { indent: 4 })
                    //  content = content.replace(/>\s+</g, "><"); //regex to keep target element in same line
                console.log(content)
                break;
            default:
                quizContainer.innerHTML = "Invalid Template";
        }
        //craete activity folder if not exist and write files
        !fs.existsSync(filePath) ? fs.mkdirSync(filePath) : "";
        fs.writeFile(path.join(filePath, "content.xml"), content, function(err) {
            if (!err) {
                copyFiles();
                (help != undefined && help != "") ? fs.writeFileSync(path.join(filePath, "help.html"), help): "";
                displayMessage(`updated ${name}`, 3000);
            } else {
                console.log(err)
            }
        });
    }
}); //end submit




//===========================================================================================================================================================//
//==================================== functions ============================================================================================================//

function activityFinder(filePath) {
    // return new Promise(function(resolve, reject) {
    let Type = "";
    let contentXML = fs.readFileSync(path.join(filePath, "content.xml"), "utf-8")
        // let xml = new DOMParser().parseFromString(contentXML, "application/xml");
    let $ = cheerio.load(contentXML, { xmlMode: true, decodeEntities: false });
    console.log($.xml())

    let fileExist = fs.existsSync(path.join(filePath, "content.xml"));

    // if (fileExist) {
    if ($("item[type=target]").length) {
        Type = "Drag Category";
    }
    if ($("action[type=validateChoices]").length) {
        Type = "Select Item";
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
    console.log(Type)
    let opt = document.querySelectorAll("option");
    console.log(opt);

    for (let i = 0; i < opt.length; i++) {
        opt[i].innerHTML == Type ? opt[i].selected = true : "";
    }

    return Type;

}

function fetcher(exist, callFunction, filePath, template) {

    if (exist) {
        callFunction.then(function(resp) {
            arrange(".quiz");
            console.log(resp)
            helpContent = helper(filePath); //get content from help file if exists

        }).catch(function(err) {
            quizContainer.innerHTML = `<div class="alert alert-danger" role="alert">${err}</div>`;
        })
    } else {
        quizContainer.innerHTML = template;
        helpContent = helper(filePath); //get content from help file if exists
    }
}

function helper(filePath) {
    let fileExist = fs.existsSync(path.join(filePath, "help.html"));
    if (fileExist) {
        let content = fs.readFileSync(path.join(filePath, "help.html"), 'utf-8');
        console.log(content)
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

function copyFiles() {
    let files = fs.readdirSync(templateFolder).filter(file => path.extname(file) == ".mp3");
    console.log(files)
    files.forEach(file => {
        let src = path.join(templateFolder, file);
        let dest = path.join(filePath, file);
        //   console.log(src + ",," + dest)
        if (audioFiles.includes(file)) {
            copy(src, dest)
                .then(function(results) {
                    console.info('Copied ' + results.length + ' files');
                })
        }

    });
}

function attrRemover() {
    let structure = document.getElementById("structure");
    let checkboxes = structure.querySelectorAll("input[type=checkbox]");
    for (let i = 0; i < checkboxes.length; i++) {
        //checkboxes[i].removeAttribute("checked");
        checkboxes[i].checked = false;
    }
}

function displayMessage(msg, duration) {
    status.style.display = "";
    status.innerHTML = msg;
    setTimeout(function() {
        status.style.display = "none";
    }, duration);
}

//clear app
document.querySelector("#clear").addEventListener("click", function() {
    location.reload();
});