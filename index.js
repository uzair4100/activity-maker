const electron = require("electron");
const { shell } = electron;
const ipcRenderer = electron.ipcRenderer;
const path = require("path");
const http = require("http");
const fs = require("fs");
const cheerio = require("cheerio");
var prettifyXml = require('prettify-xml');
const copy = require('recursive-copy');

//        "electron": "^12.0.2",


//variables
var filePath, optionValue, help = "",
    helpContent = "",
    activity, textSelected, quiz = "",
    audioFiles = [];
var source = path.join(require("os").homedir(), "id01/content.xml");
//xml templates
var selectItem = "\\\\vsl-file01\\coursesdev$\\template\\Select Item\\selectitem.xml";
var verticalArrange = "\\\\vsl-file01\\coursesdev$\\template\\Vertical Arrange\\verticalarrange.xml";
var horizontalArrange = "\\\\vsl-file01\\coursesdev$\\template\\Horizontal Arrange\\horizontalarrange.xml";
var sentenceBuilder = "\\\\vsl-file01\\coursesdev$\\template\\Sentence Builder\\sentencebuilder.xml";
var multipleChoice = "\\\\vsl-file01\\coursesdev$\\template\\Multiple Choice\\multiplechoice.xml";
var dragCategory = "\\\\vsl-file01\\coursesdev$\\template\\Drag Category\\dragcategory.xml";
var textinput = "\\\\vsl-file01\\coursesdev$\\template\\Text Input\\textinput.xml";
//html templates
var selectitemQuiz = document.querySelector(".selectitem").outerHTML;
var verticalarrangeQuiz = document.querySelector(".verticalarrange").outerHTML;
var horizontalarrangeQuiz = document.querySelector(".horizontalarrange").outerHTML;
var sentencebuilderQuiz = document.querySelector(".sentencebuilder").outerHTML;
var multiplechoiceQuiz = document.querySelector(".multiplechoice").outerHTML;
var dragcategoryQuiz = document.querySelector(".dragcategory").outerHTML;
var textinputQuiz = document.querySelector(".textinput").outerHTML;

var quizContainer = document.getElementById("quiz_container");
const status = document.getElementById("status");
const activityType = document.getElementById("activityType");
const templateFolder = "\\\\vsl-file01\\coursesdev$\\template";
const fullstops = [".", "。", "|", "?", "!"];
const wrap = document.getElementById("wrap");
const languages = document.getElementById("languages");
status.style.display = "none"
const dialog = electron.dialog;


var structure = document.querySelector("#structure");
var modal = document.querySelector("#modal");
structure.style.display = "none";
modal.style.display = "none";


//catch updater event
ipcRenderer.on('checking', function(event, text) {
    console.log(text)
})
ipcRenderer.on('not-available', function(event, text) {
    console.log(text)
})
ipcRenderer.on('update', function(event, text) {
    modal.style.display = "";
    displayUpdateStatus(modal, text, 90000);
})
ipcRenderer.on('downloading', function(event, percent) {
    displayUpdateStatus(modal, "Downloading Update", 90000);
    let bar = `<div id="bar" class="progress-bar progress-bar-striped text-white text-bold" role="progressbar" style="width:${percent}" aria-valuemin="0" aria-valuemax="100">${percent}</div>`;
    document.querySelector(".progress").innerHTML = bar;
})
ipcRenderer.on('downloaded', function(event, text) {
    displayUpdateStatus(modal, text, 1000);
    // modal.style.display="none";
})

//load activity event handler
document.querySelector("#load").addEventListener("click", function() {

    help = "";
    filePath = document.querySelector("#filePath").value;
    attrRemover()
    quizContainer.innerHTML = "", audioFiles = [];

    let fileExist = fs.existsSync(path.join(filePath, "content.xml"));

    fileExist ? activity = activityFinder(filePath) : activity = activityType.options[activityType.selectedIndex].text.trim();
    console.log(activity)
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

        case "Text Input":
            //document.getElementById("duplicate").setAttribute("disabled", true);
            audioFiles = ["correct.mp3", "prompt.mp3"];
            fetcher(fileExist, loadTI(contentFile), filePath, textinputQuiz);
            break;
        default:
            quizContainer.innerHTML = "Invalid Activity Type!";
    }
    var makeOptionWrapper = document.querySelectorAll('.makeOptionWrapper');
    makeOptionWrapper.forEach(maker => maker.style.display = "none")
});

/////////////////////find source path/////////////////////////////////////////
document.getElementById("chooseFile").addEventListener("click", function() {
    ipcRenderer.send("chooseFile-dialog"); //send choose file event

    //receive choosefile event
    ipcRenderer.on("chooseFile-selected", function(err, folder) {
        console.log(folder.filePaths[0])
        document.getElementById("filePath").value = folder.filePaths[0];
        filePath = document.getElementById("filePath").value;
        console.log(filePath)
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
        console.log(text)
        let start = el.selectionStart;
        let end = el.selectionEnd;
        console.log(start)
        console.log(end)
        if (el.classList.contains("sentence")) {
            let word = (text.substring(start, end)).toString();
            if (word.trim().length) {

                text = text.substring(0, start) + "[" + word + "]" + text.substring(end, text.length); //make new sentence
                console.log(text)
                el.innerHTML = text;
                el.value = el.innerHTML;
                //set option
                let opt = `<div class="input-group mt-1 option">
                            <input type="text" class="form-control option_value" value="${word}"/>
                            <button class="del">X</button>
                        </div>`;
                let optns = []
                let ops = el.closest(".sentencebuilder").querySelectorAll(".option_value");
                ops.forEach(op => optns.push(op.value));
                !optns.includes(word) ? el.closest(".sentencebuilder").querySelector(".quiz_options").insertAdjacentHTML("beforeend", opt) : ""; //append option only if it's not there
            }
        }
    }

    if (button.id == "show_bulk") {
        if (button.parentElement.nextElementSibling.firstElementChild.hasAttribute('style')) {
            button.parentElement.nextElementSibling.firstElementChild.removeAttribute('style')
        } else {
            button.parentElement.nextElementSibling.firstElementChild.setAttribute('style', 'display:none')
        }
    }

    if (button.id == "bulk") {
        let bulkText = button.previousElementSibling.value;
        let name = button.closest(".quiz").querySelector(".no").innerHTML;
        let values = bulkText.split("\n");
        let opt = "";
        values.filter(val => typeof(val) !== undefined && val != "").map((val, v) => {
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
        button.previousElementSibling.value = "";
        button.previousElementSibling.focus();
    }

    if (button.classList.contains("del_quiz")) {
        let act = button.parentElement.parentElement;
        quizContainer.childElementCount > 1 ? removeFadeOut(act, 500) : "";
    }

    if (button.classList.contains("del")) {
        if (activity == "Sentence Builder") {
            if (button.closest(".quiz_options").childElementCount > 1) {

                let sentence = button.parentElement.parentElement.parentElement.children[2].children[0].children[1]; //traverse from delete button(X) upto sentence
                let text = sentence.innerHTML;
                let ans = button.previousElementSibling.getAttribute("value");
                console.log(ans)
                let _text = text.replace(`[${ans}]`, ans)
                sentence.innerHTML = _text;
                sentence.value = sentence.innerHTML;
                removeFadeOut(button.closest(".option"), 300);
            }
        } else {
            button.closest(".quiz_options").childElementCount > 1 ? removeFadeOut(button.closest(".option"), 300) : "";
        }
    }
    ///////add option////////
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
        button.previousElementSibling.lastElementChild.classList.add('fadeIn');
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
        quizContainer.insertAdjacentHTML("beforeend", quiz);
        quizContainer.lastElementChild.classList.add('fadeIn');
        arrange(".quiz");
    }
    /////////duplicate////////////
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
        quizContainer.lastElementChild.classList.add('fadeIn');
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
    let name = actName[6] + "/" + actName[7] + "/" + actName[8] + "/" + actName[9];
    if (confirm("Update " + name + " ?")) {
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
                content = prettifyXml(content, { indent: 4 });
                content = content.replace(/\>\s+\<!/g, '><!').replace(/\]>\s+\</g, ']><').replace(/\&lt;/g, '<').replace(/\&gt;/g, '>'); //regex to keep CDATA in same line
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

            case "Text Input":
                xmlTemplate = fs.readFileSync(textinput, "utf-8");
                console.log(xmlTemplate)

                content = updateTI(xmlTemplate);
                content = prettifyXml(content, { indent: 4 })
                console.log(content)
                break;
            default:
                quizContainer.innerHTML = "Invalid Template";
        }
        //craete activity folder if not exist and write files
        !fs.existsSync(filePath) ? fs.mkdirSync(filePath) : "";
        fs.writeFile(path.join(filePath, "content.xml"), content, function(err) {
            if (!err) {
                displayMessage(status, `updated ${name}`, 3000);
                copyFiles(activity)
                help.length ? fs.writeFileSync(path.join(filePath, "help.html"), help) : "";

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
    if ($("action[type=setHTML]").length) {
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

function copyFiles(act) {

    let folder = path.join(templateFolder, act)
    let hasFla = fs.readdirSync(filePath).filter(file => path.extname(file) == ".fla");
    console.log(hasFla)
    let files = fs.readdirSync(folder).filter(file => path.extname(file) != ".xml");
    files.forEach(function(file) {
        let src = path.join(folder, file);
        let dest = path.join(filePath, file);
        if (path.extname(src) == ".fla") {
            if (hasFla.length < 1) {
                copy(src, dest)
                    .then(function(results) {
                        console.log('Copied ' + results.length + ' files');
                    })
            }
        } else {
            copy(src, dest)
                .then(function(results) {
                    console.log('Copied ' + results.length + ' files');
                })
        }

    })
}

function attrRemover() {
    let checkboxes = document.getElementById("structure").querySelectorAll("input[type=checkbox]");
    checkboxes.forEach(checkbox => checkbox.checked = false);
    let btns = document.querySelectorAll("#addQuiz,#duplicate,#help");
    btns.forEach(btn => btn.removeAttribute("disabled", true));
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
    element.style.height = (element.scrollHeight) + "px";
}


function displayMessage(status, msg, duration) {
    status.style.display = "";
    status.innerHTML = msg;
    setTimeout(function() {
        status.style.display = "none";
    }, duration);
}

function displayUpdateStatus(modal, msg, duration) {
    document.querySelector(".card-text").innerHTML = msg;
    setTimeout(function() {
        modal.style.display = "none";
    }, duration);
}
//clear app
document.querySelector("#clear").addEventListener("click", function() {
    location.reload();
});