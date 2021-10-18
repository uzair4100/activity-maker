const { attr } = require("cheerio/lib/api/attributes");
const { next } = require("cheerio/lib/api/traversing");

function loadSB(contentXML, webInteractive) {
    return new Promise(function(resolve, reject) {

        let fileContent = fs.readFileSync(contentXML, "utf-8");
        let $ = cheerio.load(fileContent, { xmlMode: true, decodeEntities: false });
        let data = "";
        let options_random = document.getElementById("options_random");
        //check buttons
        $("action[type=setImage]").length ? document.querySelector("#clue_image").checked = true : ""; //find clue image
        $("item[btn=Audio]").length || $("item[btn=btn-audio]").length ? document.querySelector("#clue_audio").checked = true : ""; //find audio clues button
        $("item[type=mp3player]").length ? document.querySelector("#clue_audioPlayer").checked = true : ""; //find audio clues mp3 player
        $("frame").find("action[type=waitTest]").next().next().attr("type") == "playSound" ? document.querySelector("#onCorrect_audio").checked = true : ""; //find play audio on correct
        $("item[randomise=yes]").length ? options_random.checked = true : ""; //find if options are randomised
        //alert($("item[sentenceTextBox=sentenceText]").attr('gaplength'))
        document.getElementById("options_gaplength").value = $("item[type=sentenceButtons]").attr('gaplength'); //get value of gap length and set it

        //getLanguage($("item[type=sentenceButtons]").eq(0).text())
        additionalAttributes = $('frames').attr();
        console.log(additionalAttributes)
        console.log(webInteractive)
        $("frame:not(:eq(0))").each(function(i) {
            let template = new DOMParser().parseFromString(sentencebuilderQuiz, "text/html");
            // !$("item[type=sentenceButtons]").length ? reject("Invalid Activity Type") : ""; //reject if not sententce builder
            let no = i + 1;
            let optns = $(this).find("option");
            let opt = "";
            let clueText = $(this).find("action[tbox=clueTxt]").text().trim(); //text beacuse it may be in CDATA
            let sentence = "";
            //webInteractive ? sentence = $(this).find('sentence').text() : sentence = $(this).find("item[type=sentenceButtons]").attr("sentence");
            $(this).find("item[type=sentenceButtons]").attr("sentence") ? sentence = $(this).find("item[type=sentenceButtons]").attr("sentence").trim() : sentence = $(this).find('sentence').text(); // handle old and new template


            if (sentence.includes('<span')) {
                let sss = new DOMParser().parseFromString(sentence, "text/html");
                sentence = sss.querySelector('span').innerHTML;
            }
            //set options
            optns.each(function() {
                let optionTemplate = new DOMParser().parseFromString(template.querySelector(".quiz_options").innerHTML, "text/html");

                let optText = $(this).text().trim();
                if (optText.includes('<span')) {
                    let ooo = new DOMParser().parseFromString(optText, "text/html");
                    optText = ooo.querySelector('span').innerHTML;
                }
                console.log(optText)
                optionTemplate.querySelector(".option_value").setAttribute("value", optText);
                opt += optionTemplate.body.innerHTML;
            }); //end option loop
            console.log(clueText)
            template.querySelector(".quiz_options").innerHTML = opt;
            template.querySelector("#clueText").innerHTML = clueText;
            template.querySelector("#sentence").innerHTML = sentence;
            template.querySelector(".no").innerHTML = no;

            data += template.body.innerHTML;


        }); //end outer loop

        if (sentence || optns) {
            //console.log(data);
            quizContainer.innerHTML = data;
            resolve("loaded");
        } else {
            reject("Could not load activity!")
        }

    })
} //end loadSB

function updateSB(XML) {
    // alert(webInteractive)
    //change dom value
    optionValue = quizContainer.querySelectorAll("input[type=text]");
    for (let i = 0; i < optionValue.length; i++) {
        optionValue[i].setAttribute("value", optionValue[i].value);
    }
    let textarea = quizContainer.querySelectorAll("textarea");
    for (let i = 0; i < textarea.length; i++) {
        textarea[i].innerHTML = textarea[i].value;
    }
    let options_random = document.getElementById("options_random");
    let options_gaplength = document.getElementById("options_gaplength")
    let template = new DOMParser().parseFromString(XML, "application/xml");
    console.log(template)

    let actName = filePath.split("\\");
    let name = actName[6] + " " + actName[8] + "/" + actName[9];
    let quizzes = new DOMParser().parseFromString(quizContainer.innerHTML, "text/html")
    let quizzesArray = quizzes.querySelectorAll(".sentencebuilder");

    let data = "",
        content = "",
        layout = "",
        random_value,
        lineBreaker = "";
    options_random.checked ? random_value = "yes" : random_value = "no";
    //loop through quizzes
    for (let i = 0; i < quizzesArray.length; i++) {
        let quiz = quizzesArray[i],
            clueAudio = "",
            sound = "",
            clueImage = "",
            sentenceHandler = "";

        let sentence = quiz.querySelector("#sentence").innerText;
        // sentence = sentence.replace(/(&nbsp; \/>)/gm, '')
        webInteractive == true ? lineBreaker = "<br>" : lineBreaker = " &#xD;";
        //sentence = sentence.replace(/\&lt;/g, "<").replace(/\&gt;/g, ">");
        sentence.includes("\n") && !sentence.includes("<tr>") ? sentence = sentence.split("\n").join(lineBreaker) : ""; //add line breaks in multi line sentence if it's not table
        //!sentence.includes("span") && sentence.match(/[\u3400-\u9FBF]/) ? sentence = `<span style="font-family:STkaiti; font-size: 140%">${NBSP}${sentence}</span>` : "";

        let clueText = quiz.querySelector(".ql-editor").innerHTML; //fetch text from quill because editor attached with clues field
        clueText = clueText.replace('<p>', '').replace('</p>', '').replace(/<p><br[\/]?><[\/]?p>/g, '').replace(/(&nbsp;|<br>|<br \/>)/gm, '').replace(/\>\s+\</g, '><'); //remove need <p> tags
        parseInt(i + 1) < 10 ? sound = `s00${i+1}` : sound = `s0${i+1}`;
        document.getElementById("onCorrect_audio").checked == true ? (playAudio = `<action type="delay" secs="0.5"/><action type="playSound" wait="yes" file="${sound}.mp3" />`) : playAudio = "";
        document.getElementById("clue_audio").checked == true ? (clueAudio = `<item type="button" btn="${webInteractive?`btn-audio`:`Audio`}"><action type="playSound" file="${sound}.mp3" wait="no" /></item><action type="playSound" file="${sound}.mp3" wait="no" />`) : "";
        document.getElementById("clue_audioPlayer").checked == true ? clueAudio = `<item type="mp3player" sym="mp3player_1" file="${sound}.mp3"/>` : "";
        document.getElementById("clue_image").checked == true ? (clueImage = `<action type="setImage" img="image-clue" src="image${i+1}.jpg"/>`) : clueImage = "";
        if (require("fs").existsSync(path.join(filePath, `content.xml`))) {
            require("fs").existsSync(path.join(filePath, `image${i+1}.jpg`)) ? "" : clueImage = "";   //add image only if image1.jpg exists
        }

        let no = i + 2;
        let opt = "",
            clueLine = "",
            values = [];

        //loop through options
        let options = quiz.querySelectorAll(".option_value");
        console.log(options)
            //add all option values in one array
        for (let j = 0; j < options.length; j++) {

            let opt_text = options[j].getAttribute("value").trim();
            if (opt_text.length) {
                (opt_text.includes("*")) ? values = values.concat(opt_text.split("*")): values.push(opt_text);
            }
        }
        values.filter(val => typeof(val) !== undefined && val != "").map((val, v) => {
            opt += `<option sym="opt_${v}">${val.trim()}</option>`;        
        });
        clueText ? clueLine = `<action type="setHTML" tbox="clueTxt"><![CDATA[${clueText}]]></action>` : clueLine = ""; //add clueline if cluetext exists
      //  !clueText.includes("span") && clueText.match(/[\u3400-\u9FBF]/) ? clueLine = `<action type="setHTML" tbox="clueTxt"><![CDATA[<span style="font-family:STkaiti; font-size: 140%">${clueText.trim()}</span>]]></action>` : "";
        
        if (webInteractive) {
            sentenceHandler = `${clueImage}<action type="show" sym="clue-spacer"/>
                                <item type="sentenceButtons" randomise="${random_value}" sentenceTextBox="sentenceText"  markSym="mark"  gaplength="${options_gaplength.value}">
                                    <sentence><![CDATA[${NBSP}${sentence.trim()}]]></sentence>
                                    <textbox sym="sentenceText" />
                                    <clearButton sym="btnClear" />
                                    <checkButton sym="btnCheck"/>${opt}
                                </item>`
        } else {
            sentenceHandler = `<item type="sentenceButtons" randomise="${random_value}" sentenceTextBox="sentenceText" markSym="mark" sentence="${sentence}">
                                        <textbox sym="sentenceText"/><clearButton sym="btnClear"/><checkButton sym="btnCheck"/>${opt}
                                </item>`;
        }

        let frameContent = `<frame num="${no}">
                                <action type="playSound" file="prompt.mp3" />
                                <action type="show" sym="btnCheck" />
                                <action type="show" sym="btnClear" />
                               ${sentenceHandler}
                                ${clueLine}${clueAudio}
                                <action type="waitTest" />${playAudio}

                                <action type="hide" sym="btnCheck" />
                                <action type="hide" sym="btnClear" />
                                <action type="delay" secs="1.5"/>
                            </frame>${"\n\n"}`;
        console.log(frameContent)
        data += frameContent;
    } //end loop
    console.log(data)
    data = prettifyXml(data, { indent: 4 })
    template.querySelector("activity").innerHTML = name;
    layout = layoutType.options[layoutType.selectedIndex].text.trim();
    layout != "" ? template.querySelector("content").setAttribute('layout', layout) : "";
    layout != "" ? template.querySelector("content").setAttribute('template', activity.toLowerCase().replace(/\s/g, "")) : "";
    //add additional attributes
    if(additionalAttributes){
        for (const [key, value] of Object.entries(additionalAttributes)) {
            console.log(`${key}: ${value}`);
            template.querySelector("frames").setAttribute(key, value)
        }
    }
   actName[6] == "punjabi" ?template.querySelector("frames").setAttribute("separator","{}"):"";
    template.querySelector("end").insertAdjacentHTML("beforebegin", data);
    content = new XMLSerializer().serializeToString(template);;
    return content;
} //end updateSB function

///////////////////////////////////////Select Item//////////////////////////////////////////////////////////////////////////
function loadSI(contentXML) {
    return new Promise(function(resolve, reject) {

            let fileContent = fs.readFileSync(contentXML, "utf-8");
            let $ = cheerio.load(fileContent, { xmlMode: true, decodeEntities: false });
            let data = "",setText=false;
            // getLanguage($("item[type=choiceFrames]").eq(0).text())
            ////check buttons
            $("action[type=setImage]").length ? document.querySelector("#clue_image").checked = true : ""; //find clue image
            $("item[btn=Audio]").length || $("item[btn=btn-audio]").length ? document.querySelector("#clue_audio").checked = true : ""; //find audio clues button
            $("item[type=mp3player]").length ? document.querySelector("#clue_audioPlayer").checked = true : ""; //find audio clues mp3 player
            $("action[type=randomiseChoices]").length >1? document.querySelector("#options_random").checked = true : ""; //find randomise option
            $("action[type=useRandomisedChoices]").length ? document.querySelector("#options_randomOnce").checked = true : ""; //find randomiseOnce option
            //$("item[type=choiceFrames]").text().trim().length == 0 ? document.getElementById("options_image").checked = true : document.getElementById("options_text").checked = true; //find image options
            $("item[type=choiceFrames]").text().trim().includes("<img") ? document.getElementById("options_image").checked = true : document.getElementById("options_text").checked = true; //find image options

            $('frame').eq(1).find('passed').children("action[wait=yes]").attr('file') == "s001.mp3" ? document.querySelector("#onCorrect_audio").checked = true : ""; //find play audio on correct
            if($('frame').last().find("action[tbox=clueTxt]").length >1) {
                document.querySelector("#onCorrect_settext").checked = true    //find  on correct clue
                setText=true
                console.log(setText)
            } 

            additionalAttributes=$('frames').attr();
            console.log(additionalAttributes)
            
            $("frame:not(:eq(0))").each(function(i) {
                let template = new DOMParser().parseFromString(selectitemQuiz, "text/html");

                let no = i + 1;
                let clueText = "";
                setText ? clueText=$(this).find('passed').children("action[tbox=clueTxt]").text() : clueText=$(this).children("action[tbox=clueTxt]").text();
                let optns = $(this).find("item[type=choiceFrames]");
                console.log(optns)
                let opt = "";
                !clueText ? clueText = "" : "";
                if (clueText.includes('<span')) {
                    let ccc = new DOMParser().parseFromString(clueText, "text/html");
                    clueText = ccc.querySelector('span').innerHTML;
                }
                //set options
                optns.each(function() {
                    let optionTemplate = new DOMParser().parseFromString(template.querySelector(".quiz_options").innerHTML, "text/html");

                    optText = $(this).text().trim();
                    optText=="" ? optText = $(this).html().trim() : "";
                    if (optText.includes('<span')) {
                        let ooo = new DOMParser().parseFromString(optText, "text/html");
                        optText = ooo.querySelector('span').innerHTML;
                    }
                    console.log(optText)
                    optionTemplate.querySelector(".option_value").setAttribute("value", optText);
                    optionTemplate.querySelector(".option_radio").setAttribute("name", no);

                    $(this).attr("correctFrame") ? optionTemplate.querySelector(".option_radio").setAttribute("checked", true) : optionTemplate.querySelector(".option_radio").removeAttribute("checked");
                    // $(this).attr("correctFrame") ? console.log("correct") : console.log("wrong");

                    // console.log(optionTemplate.body.innerHTML)
                    opt += optionTemplate.body.innerHTML;
                }); //end option loop

                template.querySelector(".quiz_options").innerHTML = opt;
                template.querySelector("#clueText").innerHTML = clueText;

                data += template.body.innerHTML;

                if (clueText || optns) {
                    //console.log(data);
                    quizContainer.innerHTML = data;
                    resolve("loaded");
                } else {
                    reject("Could not load activity!")
                }
            }); //end outer loop


        }) //return 
}


function updateSI(XML) {
    //change dom value
    optionValue = quizContainer.querySelectorAll("input[type=text]");
    for (let i = 0; i < optionValue.length; i++) {
        optionValue[i].setAttribute("value", optionValue[i].value);
    }
    let radios = quizContainer.querySelectorAll("input[type=radio]");
    for (let i = 0; i < radios.length; i++) {
        radios[i].checked ? radios[i].setAttribute("checked", true) : radios[i].removeAttribute("checked");
    }


    let template = new DOMParser().parseFromString(XML, "application/xml");
    console.log(template)

    let actName = filePath.split("\\");
    let name = actName[6] + " " + actName[8] + "/" + actName[9];
    let quizzes = new DOMParser().parseFromString(quizContainer.innerHTML, "text/html")
    let quizzesArray = quizzes.querySelectorAll(".selectitem");

    let data = "",
        content = "",
        isOptionImage = Boolean,clue_onCorrect=Boolean;
    //loop through quizzes
    for (let i = 0; i < quizzesArray.length; i++) {
        let quiz = quizzesArray[i];
        //let clueText = quiz.querySelector("#clueText").getAttribute("value").trim();
        let clueText = quiz.querySelector(".ql-editor").innerHTML;
        clueText = clueText.replace('<p>', '').replace('</p>', '').replace(/<p><br[\/]?><[\/]?p>/g, '').replace(/<p>[\/]?<[\/]?p>/g, '').replace(/(&nbsp;|<br>|<br \/>)/gm, '').replace(/\>\s+\</g, '><'); //remove need <p> tags

        let clue = "";
        clueText.length ? clue = `<action type="setHTML" tbox="clueTxt"><![CDATA[${clueText}]]></action>` : clue = "";
        //for chinese only clue will be in span tag with font
        //!clueText.includes("span") && clueText.match(/[\u3400-\u9FBF]/) ? clue = `<action type="setHTML" tbox="clueTxt"><![CDATA[<span style="font-family:STkaiti; font-size: 140%">${clueText.trim()}</span>]]></action>` : "";
        
        let randomise = "",
            playAudio = "",
            clueAudio = "",
        sound = "";
        parseInt(i + 1) < 10 ? sound = `s00${i+1}` : sound = `s0${i+1}`;
        //for webinteractives non random option will have display choices
        document.getElementById("options_random").checked == true ? (randomise = `<action type="randomiseChoices" />`) : webInteractive?randomise = `<action type="displayChoices"/>`:"";
        document.getElementById("options_randomOnce").checked == true && webInteractive? i==0?randomise = `<action type="randomiseChoices" />`:randomise = `<action type="useRandomisedChoices"/>` : "";

        document.getElementById("onCorrect_audio").checked == true ? (playAudio = `<action type="delay" secs="0.5"/><action type="playSound" wait="yes" file="${sound}.mp3"></action>`) : playAudio = "";
        document.getElementById("clue_audio").checked == true ? (clueAudio = `<item type="button" btn="${webInteractive?`btn-audio`:`Audio`}"><action type="playSound" file="${sound}.mp3" wait="no"></action></item><action type="playSound" file="${sound}.mp3" wait="no"></action>`) : clueAudio = "";
        document.getElementById("clue_audioPlayer").checked == true ? clueAudio = `<item type="mp3player" sym="mp3player_1" file="${sound}.mp3"/>` : "";
        document.getElementById("clue_image").checked == true ? (clueImage = `<action type="setImage" img="image-clue" src="image${i+1}.jpg"/>`) : clueImage = "";
        document.getElementById("onCorrect_settext").checked == true ? clue_onCorrect = true : clue_onCorrect = false;
        if (require("fs").existsSync(path.join(filePath, `content.xml`))) {
            require("fs").existsSync(path.join(filePath, `image${i+1}.jpg`)) ? "" : clueImage = "";   //add image only if image1.jpg exists
        }
        //document.getElementById("options_image").checked == true ? isOptionImage = true : isOptionImage = false;
        //____buttonsize="allframes" _buttonsize="frame" __buttonsize="25%" optionButtonWidth="120px"
        let opt = "",
            values = [];

        //loop through options
        let options = quiz.querySelectorAll(".option");
        console.log(options)
        let correct = "";
            //add all option values in one array
            for (let j = 0; j < options.length; j++) {

                let opt_text = options[j].querySelector(".option_value").getAttribute("value").trim();
                let opt_radio = options[j].querySelector(".option_radio");
                opt_radio.hasAttribute("checked") ? correct = opt_text : "";
                console.log(correct);
                if (opt_text.length) {
                    (opt_text.includes("*")) ? values = values.concat(opt_text.split("*")): values.push(opt_text);
                    // (opt_text.includes("\n")) ? values = values.concat(opt_text.split("\n")): values.push(opt_text);
                }
            }

            values.filter(val => typeof(val) !== undefined && val != "").map((val, v) => {
                let correctFrame = "";
                val.trim() == correct.trim() ? correctFrame = ` correctFrame="1"` : "";
                //val.includes('&') ? val = `<![CDATA[${val.trim()}]]>` : ""; //for mostly punjabi font '&' makes xml file invalid
               // !val.includes("span") && val.match(/[\u3400-\u9FBF]/) ? val = `${val}` : ""; 

                val = `<![CDATA[${val.trim()}]]>`
                opt += `<item type="choiceFrames" sym="opt_${v}"${correctFrame}>${val}</item>`
            }); 
         /*else {
            //for image options xml structure is different
         //   ____buttonsize="allframes" _buttonsize="frame" __buttonsize="25%" optionButtonWidth="120px"
            for (let j = 0; j < options.length; j++) {
                let frame = ` frame="${j+1}"`,
                    correctFrame = "";
                let opt_radio = options[j].querySelector(".option_radio");
                opt_radio.hasAttribute("checked") ? correctFrame = ` correctFrame ="1"` : correctFrame = ``;
               // opt += `<item type="choiceFrames" sym="opt_${j}"${frame}${correctFrame}></item>`
                webInteractive ? opt +=`<item type="choiceFrames" sym="opt_${j}"${correctFrame}>${options[j].querySelector(".option_value").getAttribute("value").trim()}</item>`:opt += `<item type="choiceFrames" sym="opt_${j}"${frame}${correctFrame}></item>`;
            }
        }*/
        opt = opt.replace(/\>\s+\</g, '');
        
        console.log(opt)
            ///////////
        let frameContent = `<frame num="${i + 2}">
                        <item type="button" btn="btnCheck" >
                            <action type="validateChoices">
                            <passed> ${clue_onCorrect ? "\n"+clue : ""}
                                <action type="showChoicesFeedback"/>
                                <action type="playSound" file="correct.mp3" wait="no" />
                                <action type="hide" sym="btnCheck" />${playAudio}
                                <action type="delay" secs="1"/>
                                <action type="nextFrame" />
                            </passed>
                                <failed>
                                    <action type="playSound" file="wrong.mp3" wait="no" />
                                    <action type="showChoicesFeedback"/>
                                </failed>
                            </action>
                        </item>                       
                        ${opt}${randomise}
                        ${clue_onCorrect ? `<action type="setHTML" tbox="clueTxt"> </action>` : clue} ${clueImage}
                        ${webInteractive?`<action type="show" sym="clue-spacer" />`:""}                     
                        <action type="playSound" file="prompt.mp3" wait="yes" />${clueAudio}
                        <action type="waitTest"></action>
                        <action type="delay" secs="1"/>
                    </frame>${"\n\n"}`;

        data += frameContent;
    } //end loop
    data = prettifyXml(data, { indent: 4 })
    console.log(data)
    template.querySelector("activity").innerHTML = name;
    if(webInteractive){
        layout = layoutType.options[layoutType.selectedIndex].text.trim();
        layout != "" ? template.querySelector("content").setAttribute('layout', layout) : "";
        template.querySelector("content").setAttribute('template', activity.toLowerCase().replace(/\s/g, "")) ;
    }
    //if image options add additional attributes
    if(additionalAttributes){
        for (const [key, value] of Object.entries(additionalAttributes)) {
            console.log(`${key}: ${value}`);
            template.querySelector("frames").setAttribute(key, value)
        }
    }
    template.querySelector("end").insertAdjacentHTML("beforebegin", data);

    console.log(template)
    content = new XMLSerializer().serializeToString(template);;
    return content;
} //end updateSI function

//=================================================Vertical Arrange======================================================================//
//=======================================================================================================================================//
function loadVA(contentXML) {
    return new Promise(function(resolve, reject) {

        let fileContent = fs.readFileSync(contentXML, "utf-8");
        let $ = cheerio.load(fileContent, { xmlMode: true, decodeEntities: false });
        let quiz = "",
            data = "";
        let template = new DOMParser().parseFromString(verticalarrangeQuiz, "text/html");
        let quizTemplate = new DOMParser().parseFromString(template.querySelector(".option").outerHTML, "text/html");
        let options_audio = document.getElementById("options_audio");
          $("left").attr("audio") ? options_audio.checked=true:"";

        $("quiz").each(function(i) {
            let inputs = quizTemplate.querySelectorAll(".option_value");
            //get value of quiz fields
            let left = $(this).children("left").text();
            let right = $(this).children("right").text();

            inputs[0].innerHTML = left;
            inputs[1].innerHTML = right;

            quiz += quizTemplate.body.innerHTML;
        }); //end outer loop

        template.querySelector(".quiz_options").innerHTML = quiz;
        //template.querySelector(".quiz_options").insertAdjacentHTML("beforebegin", `<div class="d-flex justify-content-around"><h6>Left Column</h6><h6>Right Column</h6></div>`)
        data = template.body.innerHTML;
        console.log(data);

        if ($('left').text() || $('right').text()) {
            //console.log(data);
            quizContainer.innerHTML = data;
            resolve("loaded");
        } else {
            reject("Could not load activity!")
        }
    });
} //end loadVA

function updateVA(XML) {
    //change dom value
    optionValue = quizContainer.querySelectorAll(".option_value");
    for (let i = 0; i < optionValue.length; i++) {
        optionValue[i].innerHTML = optionValue[i].value;
    }

    let options_audio = document.getElementById("options_audio");
    let template = new DOMParser().parseFromString(XML, "application/xml");
    console.log(template);
    let actName = filePath.split("\\");
    let name = actName[6] + " " + actName[8] + "/" + actName[9];
    let quizzes = new DOMParser().parseFromString(quizContainer.innerHTML, "text/html")
    let quizzesArray = quizzes.querySelectorAll(".option");
    console.log(quizzesArray)

    let data = "",
        content = "",
        sound = "",
        _left = [],
        _right = [];

    //loop through quizzes
    for (let i = 0; i < quizzesArray.length; i++) {
        let quiz = quizzesArray[i],
            opt = "";

        //loop through options
        let options = quiz.querySelectorAll(".option_value");
        let left = options[0].innerHTML.trim();
        let right = options[1].innerHTML.trim();

        // opt = `<quiz><left>${left}</left><right>${right}</right></quiz>`;

        if (left.length) {
            (left.includes("\n")) ? _left = _left.concat(left.split("\n")): _left.push(left);
        }
        if (right.length) {
            (right.includes("\n")) ? _right = _right.concat(right.split("\n")): _right.push(right);
        }
        console.log(_left)
        console.log(_right)

    } //end loop

    for (j = 0; j < _right.length; j++) {
        let leftValue = _left[j];
        if (options_audio.checked) {
            template.querySelector('questions').setAttribute('randomise_left_column', 'no')
            leftValue = ""
            parseInt(j + 1) < 10 ? sound = ` audio="s00${j+1}.mp3"` : sound = ` audio="s0${j+1}.mp3"`;
        }
        data += `<quiz><left${sound}>${leftValue}</left><right>${_right[j].trim()}</right></quiz>`;
    }

    data = prettifyXml(data, { indent: 2 })
    template.querySelector("activity").innerHTML = name;
    template.querySelector("questions").innerHTML = data;
    content = new XMLSerializer().serializeToString(template);;
    return content;

} //end updateVA function

//=================================================Horizontal Arrange======================================================================//
//=======================================================================================================================================//
function loadHA(contentXML) {
    return new Promise(function(resolve, reject) {

        let fileContent = fs.readFileSync(contentXML, "utf-8");
        let $ = cheerio.load(fileContent, { xmlMode: true, decodeEntities: false });
        let quiz = "",
            data = "";
        let template = new DOMParser().parseFromString(horizontalarrangeQuiz, "text/html");
        let quizTemplate = new DOMParser().parseFromString(template.querySelector(".option").outerHTML, "text/html");
        let onCorrect_audio = document.getElementById("onCorrect_audio");

        $("quiz").attr("audio") != "silence.mp3" ? document.querySelector("#onCorrect_audio").checked = true : "" //check audio button if no silence file

        console.log(template);
        console.log(quizTemplate);
        $("quiz").each(function(i) {
            let inputs = $(this).text(); //get text of quiz  
            inputs = inputs.replace(/\]\[/g, '] ['); //keep space after each closing bracket to make it readable

            quizTemplate.querySelector(".option_value").innerHTML = inputs;

            quiz += quizTemplate.body.innerHTML;
        }); //end outer loop

        template.querySelector(".quiz_options").innerHTML = quiz;
        data = template.body.innerHTML;
        console.log(data);

        if ($('quiz').text()) {
            //console.log(data);
            quizContainer.innerHTML = data;
            resolve("loaded");
        } else {
            reject("Could not load activity!")
        }
    });
} //end loadHA

function updateHA(XML) {
    //change dom value
    optionValue = quizContainer.querySelectorAll(".option_value");
    for (let i = 0; i < optionValue.length; i++) {
        optionValue[i].innerHTML = optionValue[i].value;
    }

    let template = new DOMParser().parseFromString(XML, "application/xml");
    console.log(template);
    let actName = filePath.split("\\");
    let name = actName[6] + " " + actName[8] + "/" + actName[9];

    let quizzes = new DOMParser().parseFromString(quizContainer.innerHTML, "text/html");
    console.log(quizzes)
    let quizzesArray = quizzes.querySelectorAll(".option");
    console.log(quizzesArray)

    let data = "",
        content = "";
    //loop through quizzes
    for (let i = 0; i < quizzesArray.length; i++) {
        let input_value = "",
            quiz = "",
            sound = "",
            stop = "";

        if (document.getElementById("onCorrect_audio").checked) {
            parseInt(i + 1) < 10 ? sound = `s00${i+1}.mp3` : sound = `s0${i+1}.mp3`;
        } else { sound = "silence.mp3"; }

        //loop through options
        input_value = quizzesArray[i].querySelector(".option_value").innerHTML.trim();
        // let stop = input_value.charAt(input_value.length - 1);
        let lastChar = input_value.charAt(input_value.length - 1);
        fullstops.includes(lastChar) ? stop = lastChar : stop = ""; //get last char as stop if its not __
        input_value = input_value.replace(stop, "");
        input_value.includes("*") ? input_value = input_value.split("*") : input_value = input_value.split("]["); //split line at *
        input_value = input_value.filter(s => typeof(s) != undefined && s != "").map(s => s.toString().trim()).join("][");
        console.log(input_value)
        input_value = `[${input_value}]${stop}`;
        input_value = input_value.replace("[[", "[").replace("]]", "]").replace(/\]\s+\[/g, ']['); //remove double brackets and space after closing bracket
        console.log(input_value)
        quiz = `<quiz audio="${sound}">${input_value}</quiz>`;
        data += quiz;
    } //end loop
    console.log(data);

    template.querySelector("activity").innerHTML = name;
    template.querySelector("questions").innerHTML = data;
    content = new XMLSerializer().serializeToString(template);;
    return content;

} //end updateHA function

/////////////////////////////////// JS Multiple CHOICE //////////////////////////////////////////////////////////////////////////////

function loadMC(contentXML) {
    return new Promise(function(resolve, reject) {

            let fileContent = fs.readFileSync(contentXML, "utf-8");
            let $ = cheerio.load(fileContent, { xmlMode: true, decodeEntities: false });
            let data = "";
            let onCorrect_settext = document.getElementById("onCorrect_settext");
            $("item[type=setText]").length ? onCorrect_settext.checked = true : ""; // check setText button
            let options_random = document.getElementById("options_random");
            $("item[type=radioButtons]").attr("random")=="yes" ? options_random.checked = true : ""; //find if options are randomised
            //getLanguage($("option").eq(0).text())
            //console.log($.xml())

            $("frame").each(function(i) {
                let template = new DOMParser().parseFromString(multiplechoiceQuiz, "text/html");

                let no = i + 1;
                let clueText = $(this).find("item[type=textbox]").text().trim();
                //clueText.includes("span") ? clueText = $($.parseHTML(clueText)).html() : "";
                //clueText.match(/[\u3400-\u9FBF]/) ? console.log("chinese") : console.log("english")
                console.log(clueText)
                let optns = $(this).find("option");
                let opt = "";
                !clueText ? clueText = "" : "";
                //set options
                optns.each(function() {
                    let optionTemplate = new DOMParser().parseFromString(template.querySelector(".quiz_options").innerHTML, "text/html");

                    optText = $(this).text().trim();
                    //optText.includes("span") ? optText = $($.parseHTML(optText)).html() : "";
                    //console.log(optText)
                    optionTemplate.querySelector(".option_value").setAttribute("value", optText);
                    optionTemplate.querySelector(".option_radio").setAttribute("name", no);

                    $(this).attr("correct") ? optionTemplate.querySelector(".option_radio").setAttribute("checked", true) : optionTemplate.querySelector(".option_radio").removeAttribute("checked");

                    // console.log(optionTemplate.body.innerHTML)
                    opt += optionTemplate.body.innerHTML;
                }); //end option loop

                template.querySelector(".quiz_options").innerHTML = opt;
                template.querySelector("#clueText").innerHTML = clueText;

                data += template.body.innerHTML;

                if (clueText || optns.text()) {
                    //console.log(data);
                    quizContainer.innerHTML = data;
                    resolve("loaded");
                } else {
                    reject("Could not load activity!")
                }

            }); //end outer loop


        }) //return 
} //end loadMC


function updateMC(XML) {
    let options_random = document.getElementById("options_random");
    let onCorrect_settext = document.getElementById("onCorrect_settext");
    //change dom value
    optionValue = quizContainer.querySelectorAll("input[type=text]");
    for (let i = 0; i < optionValue.length; i++) {
        optionValue[i].setAttribute("value", optionValue[i].value);
    }
    let radios = quizContainer.querySelectorAll("input[type=radio]");
    for (let i = 0; i < radios.length; i++) {
        radios[i].checked ? radios[i].setAttribute("checked", true) : radios[i].removeAttribute("checked", true);
    }

    let template = new DOMParser().parseFromString(XML, "application/xml");
    console.log(template)

    let actName = filePath.split("\\");
    let name = actName[6] + " " + actName[8] + "/" + actName[9];
    let random_value="yes";
    options_random.checked ? random_value="yes" : random_value = "no";
    let quizzes = new DOMParser().parseFromString(quizContainer.innerHTML, "text/html")
    let quizzesArray = quizzes.querySelectorAll(".multiplechoice");
    
    let data = "",
        content = "";
    //loop through quizzes
    for (let i = 0; i < quizzesArray.length; i++) {
        let quiz = quizzesArray[i];
        let clueText = quiz.querySelector(".ql-editor").innerHTML;
        clueText = clueText.replace('<p>', '').replace('</p>', '').replace(/<p><br[\/]?><[\/]?p>/g, '').replace(/<p>[\/]?<[\/]?p>/g, '').replace(/(&nbsp;|<br>|<br \/>)/gm, '').replace(/\>\s+\</g, '><'); //remove need <p> tags
        //let clueText = quiz.querySelector("#clueText").getAttribute("value");
        clueText = clueText.toString().trim();
        //let cc = new DOMParser().parseFromString(clueText, "text/html").qu;
        let setText = "",
            setTextLine = "";
        let opt = "",
            stop;

        //loop through options
        let options = quiz.querySelectorAll(".option");
        console.log(options)
        let correctAnswer = "";
        //add all option values in one array
        for (let j = 0; j < options.length; j++) {
            let correctFrame = "";
            let opt_text = options[j].querySelector(".option_value").getAttribute("value").trim();
            //opt_text.includes("span") ? opt_text = `<![CDATA[${opt_text}]]>` : ""; //wrap in CDATA if includes span tag
            let opt_radio = options[j].querySelector(".option_radio");

            if (opt_radio.hasAttribute("checked", true)) {
                correctFrame = ` correct="yes"`;
                correctAnswer = opt_text;
            }
            console.log(correctAnswer);
            !opt_text.includes("span") && opt_text.match(/[\u3400-\u9FBF]/) ? opt_text = `<span style="font-family:STkaiti; font-size: 140%">${opt_text.trim()}</span>` : "";
            (opt_text.length) ? opt += `<option${correctFrame}><![CDATA[${opt_text}]]></option>`: "";

        }
        //combine clueText and correct answer to add in setText
        if (onCorrect_settext.checked) {
            let _correctAnswer, _clueText, lastChar = "";
            if (clueText.includes("span")) {

                _correctAnswer = new DOMParser().parseFromString(correctAnswer, "text/html").querySelector("span").innerHTML;
                _clueText = new DOMParser().parseFromString(clueText, "text/html").querySelector("span").innerHTML;
                // console.log(_clueText.charAt(_clueText.length - 1))
                lastChar = _clueText.charAt(_clueText.length - 1);
                fullstops.includes(lastChar) ? stop = lastChar : stop = ""; //get last char as stop if its not __
                _clueText = _clueText.replace(stop, ""); //remove stop from clue
                _correctAnswer.charAt(_correctAnswer.length - 1) == stop ? stop = "" : ""; //set stop to empty if correct answer already has stop at end
                _clueText = _clueText.replace(/_/g, '').replace((i + 1), "").replace(".", "").trim(); //remove question no and ___ from clue
                setText = _clueText + " " + _correctAnswer + stop;
            } else {

                _clueText = clueText.trim();
                _correctAnswer = correctAnswer.trim();
                lastChar = _clueText.charAt(_clueText.length - 1);
                fullstops.includes(lastChar) ? stop = lastChar : stop = ""; //get last char as stop if its not __
                _clueText = _clueText.replace(stop, ""); //remove stop from clue
                _correctAnswer.charAt(_correctAnswer.length - 1) == stop ? stop = "" : ""; //set stop to empty if correct answer already has stop at end
                _clueText = _clueText.replace(/_/g, '').replace((i + 1), "").replace(".", "").trim(); //remove question no and ___ from clue
                setText = _clueText + " " + _correctAnswer + stop;
            }
            setTextLine = `<item type="setText" id="txt2">${setText.trim()}</item>`
        } else {
            setTextLine = "";
        }

        !clueText.includes("span") && clueText.match(/[\u3400-\u9FBF]/) ? clueText = `<span style="font-family:STkaiti; font-size: 140%">${clueText.trim()}</span>` : "";
        console.log(setText);
        let frameContent = `<frame id="${i+1}">
                                <item type="textbox" id="txt2" display="yes"><![CDATA[${clueText.trim()}]]></item>
                                <item type="radioButtons" random="${random_value}">
                                    ${opt}
                                </item>
                                <item type="checkButton" id="btn0">
                                    <item type="checkRadioButtons">
                                        <correct>
                                            ${setTextLine}<item type="delay" secs="2"/>
                                            <item type="nextFrame"/>
                                        </correct>
                                        <wrong></wrong>
                                    </item>
                                </item>
                            </frame>${"\n\n"}`;

        data += frameContent;
    } //end loop
    //  !data.includes("</span>") ? data = data.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : "";
    data = prettifyXml(data, { indent: 4 });
    //console.log(data)
    template.querySelector("end").insertAdjacentHTML("beforebegin", data);
    content = new XMLSerializer().serializeToString(template);;
    return content;
} //end updateMC

/////////////////////////////////////////////////////// DRAG CATEGORY ///////////////////////////////////////////////////////////////////
function loadDC(contentXML) {
    return new Promise(function(resolve, reject) {

            let fileContent = fs.readFileSync(contentXML, "utf-8");
            let $ = cheerio.load(fileContent, { xmlMode: true, decodeEntities: false });
            let data = "";

            //    !$("item[type=target]").length ? reject("Invalid Activity Type") : ""; //reject if not drag category

            $("frame:not(:eq(0))").each(function(i) {

                let template = new DOMParser().parseFromString(dragcategoryQuiz, "text/html");

                let no = i + 1;
                let optns = $(this).find("item[type=drag]");
                let opt = "",
                    allOptions = [],
                    allTargets = [],
                    decoys = [];
                let targets = $(this).find("item[type=target]");
                targets.each(function() {
                    let targetNames = $(this).attr("names").split("|");
                    allTargets = allTargets.concat(targetNames) // push all d0,d1 etc in one array to find decoys at the end
                    console.log(targetNames)

                    let optionTemplate = new DOMParser().parseFromString(template.querySelector(".quiz_options").innerHTML, "text/html");
                    optns.each(function() {
                        if (targetNames.includes($(this).attr("name"))) {
                            allOptions.push($(this).text());
                            //  allTargets.push($(this).text());
                        }
                    }); //end option loop
                    console.log(allOptions);
                    optionTemplate.querySelector(".option_value").innerHTML = allOptions.join("\n");
                    // decoys != null ? optionTemplate.querySelector(".h6").innerHTML = "Decoys" : "";
                    opt += optionTemplate.body.innerHTML;
                    allOptions = []
                });
                console.log(allTargets);

                optns.filter(function() {
                    return !allTargets.includes($(this).attr('name'))
                }).map(function() {
                    decoys.push($(this).text())
                })
                console.log(decoys)
                if (decoys.length) {
                    let decoyTemplate = new DOMParser().parseFromString(template.querySelector(".quiz_options").innerHTML, "text/html");
                    decoyTemplate.querySelector(".option_value").innerHTML = decoys.join("\n");
                    decoyTemplate.querySelector(".h6").innerHTML = "Decoys";
                    decoyTemplate.querySelector(".h6").setAttribute("title", ""); //remove tooltip from it

                    opt += decoyTemplate.body.innerHTML;
                }


                template.querySelector(".quiz_options").innerHTML = opt;

                data += template.body.innerHTML;

                if (optns.text()) {
                    //console.log(data);
                    quizContainer.innerHTML = data;
                    resolve("loaded");
                } else {
                    reject("Could not load activity!")
                }

            }); //end outer loop


        }) //return 
}

function updateDC(XML) {
    //change dom value
    let option_value = quizContainer.querySelectorAll(".option_value");
    for (let t = 0; t < option_value.length; t++) {
        option_value[t].innerHTML = option_value[t].value;
    }

    let template = new DOMParser().parseFromString(XML, "application/xml");
    console.log(template)

    let actName = filePath.split("\\");
    let name = actName[6] + " " + actName[8] + "/" + actName[9];
    let quizzes = new DOMParser().parseFromString(quizContainer.innerHTML, "text/html")
    let quizzesArray = quizzes.querySelectorAll(".dragcategory");

    let data = "",
        content = "";
    //loop through quizzes
    for (let i = 0; i < quizzesArray.length; i++) {
        let no = i + 2;
        let quiz = quizzesArray[i],
            opt = "",
            values = [],
            targets = [];
        //let clueText = quiz.querySelector("#clueText").getAttribute("value").trim();

        //loop through options
        let options = quiz.querySelectorAll(".option");
        console.log(options)
        let dragCount = 0;
        //add all option values in one array
        for (let j = 0; j < options.length; j++) {
            let isDecoy = false;
            options[j].querySelector('.h6').innerHTML.toLocaleLowerCase().includes("decoy") ? isDecoy = true : ""; //find if it has decoy column then dont push target names
            let targetNames = []
            let opt_text = options[j].querySelector(".option_value").innerHTML;
            // options[j].querySelector(".h6").innerHTML == "Decoys" ? isDecoy = true : "";   //set decoy to true
            if (opt_text.length) {
                let column = opt_text.split("\n");
                console.log(column.length)
                values = values.concat(opt_text.split("\n"));
                console.log(values);

                values.filter(val => typeof(val) !== undefined && val != "").map((val, v) => {
                    opt += `<item type="drag" sym="d${dragCount}"  persist="yes" group="group0" visible="no" frame="1" name="d${dragCount}">${val.toString().trim()}</item>`
                    isDecoy == false ? targetNames.push(`d${dragCount}`) : ""; // push targetnames if its not decoy
                    dragCount++;
                });
                if (targetNames.length) {
                    targetNames = targetNames.join("|").toString();
                    targets.push(`<item type="target" sym="tg${targets.length}" names="${targetNames}"/>`);
                }
                targetNames = [];
            }
            values = [];
        }


        console.log(opt)
        console.log(targets)
        let frameContent = `<frame num="${no}">
                                ${opt}${"\n\n"}
                                ${targets.join("").toString()}
                                <item type="button" btn="btnCheck" visible="no">
                                    <action type="validateDragItems" mark="mark" lockCorrect="yes"/>
                                </item>
                                <action type="randomiseGroup" group="group0"/>
                                <action type="showDragGroup" group="group0"/>
                                <action type="show" sym="btnCheck"/>
                                <action type="waitTest"></action>
                                <action type="hide" sym="btnCheck"/>
                                <action type="delay" secs="2"/>
                            </frame>${"\n\n"}`;

        data += frameContent;
    } //end loop
    //data = data.replace(/\&nbsp;/g, '');
    data = prettifyXml(data, { indent: 4 })
    template.querySelector("activity").innerHTML = name;
    if(webInteractive){
        layout = layoutType.options[layoutType.selectedIndex].text.trim();
        layout != "" ? template.querySelector("content").setAttribute('layout', layout) : "";
        template.querySelector("content").setAttribute('template', activity.toLowerCase().replace(/\s/g, "")) ;
    }
    template.querySelector("end").insertAdjacentHTML("beforebegin", data);
    content = new XMLSerializer().serializeToString(template);;
    return content;
}


//=================================================Sound Recorder======================================================================//
//=======================================================================================================================================//
function loadSR(contentXML) {
    return new Promise(function(resolve, reject) {

        let fileContent = fs.readFileSync(contentXML, "utf-8");
        let $ = cheerio.load(fileContent, { xmlMode: true, decodeEntities: false });
        let quiz = "",
            data = "";
        let template = new DOMParser().parseFromString(soundrecorderQuiz, "text/html");
        let quizTemplate = new DOMParser().parseFromString(template.querySelector(".option").outerHTML, "text/html");
        let clue_audio = document.getElementById("clue_audio");
        document.getElementById("clue_text").checked = true;
        $("action[type=playSound]").length ? clue_audio.checked = true : "";

        console.log(template);
        console.log(quizTemplate);
        $("action[type=setText]").each(function(i) {
            let inputs = $(this).text(); //get text of quiz  
            quizTemplate.querySelector(".option_value").innerHTML = inputs;
            quiz += quizTemplate.body.innerHTML;
        }); //end outer loop

        template.querySelector(".quiz_options").innerHTML = quiz;
        data = template.body.innerHTML;
        console.log(data);

        if (data) {
            //console.log(data);
            quizContainer.innerHTML = data;
            resolve("loaded");
        } else {
            reject("Could not load activity!")
        }
        // resolve()
    });
} //end loadSR

function updateSR(XML) {
    //change dom value
    optionValue = quizContainer.querySelectorAll(".option_value");
    for (let i = 0; i < optionValue.length; i++) {
        optionValue[i].innerHTML = optionValue[i].value;
    }

    let template = new DOMParser().parseFromString(XML, "application/xml");
    console.log(template);
    let actName = filePath.split("\\");
    let name = actName[6] + " " + actName[8] + "/" + actName[9];
    let quizzes = new DOMParser().parseFromString(quizContainer.innerHTML, "text/html");
    console.log(quizzes)
    let quizzesArray = quizzes.querySelectorAll(".option");
    console.log(quizzesArray)
    let clue_audio = document.getElementById("clue_audio");

    let data = "",
        content = "",
        items = "",
        actions = "",
        sound = "",
        audioLine = "";
    //loop through quizzes
    for (let i = 0; i < quizzesArray.length; i++) {
        parseInt(i + 1) < 10 ? sound = `s00${i+1}.mp3` : sound = `s0${i+1}.mp3`;

        let input_value = "",
            quiz = "";

        //loop through options
        input_value = quizzesArray[i].querySelector(".option_value").innerHTML.trim();
        console.log(input_value)

        items += `<item type="soundRecorder" sym="recorder${i}" previewPlayBtn="audioBtn${i}" clueText="cluetxt${i}" maxSecs="10" num="${i+1}" ></item>`;
        actions += `<action type="setText" tbox="cluetxt${i}">${input_value}</action>`;
        clue_audio.checked ? audioLine += `<item type="button" btn="Audio${i}"><action type="playSound" file="${sound}" wait="no"></action></item>` : ""; //if clues have audio also

    } //end loop

    data = items + "\n\n" + audioLine + "\n\n" + actions + "\n\n";

    console.log(data);

    template.querySelector("activity").innerHTML = name;
    template.querySelector("action[type=waitFrameController]").insertAdjacentHTML('beforebegin', data);
    content = new XMLSerializer().serializeToString(template);;
    return content;

} //end updateSR function


/////////////////////////////////////////////////////// TEXT INPUT ///////////////////////////////////////////////////////////////////
function loadTI(contentXML) {
    return new Promise(function(resolve, reject) {

        let fileContent = fs.readFileSync(contentXML, "utf-8");
        let $ = cheerio.load(fileContent, { xmlMode: true, decodeEntities: false });
        let data = "";
        let clue_image = document.getElementById('clue_image');
        $("frame").children().last().prev().attr("type")=="playSound" ? document.querySelector("#onCorrect_audio").checked = true : ""; //find play audio on correct
        $("action[type=setImage]").length ? document.querySelector("#clue_image").checked = true : ""; //find audio clues mp3 player
        $("item[btn=Audio]").length || $("item[btn=btn-audio]").length ? document.querySelector("#clue_audio").checked = true : ""; //find audio clues button
        $("item[type=mp3player]").length ? document.querySelector("#clue_audioPlayer").checked = true : ""; //find audio clues mp3 player
        $("action[type=setImage]").length ? clue_image.checked = true : ""; //find image clues
        //getLanguage($("item[type=sentenceButtons]").eq(0).text())
       

        $("frame:not(:eq(0))").each(function(i) {
            let template = new DOMParser().parseFromString(textinputQuiz, "text/html");
            let no = i + 1;

            let clueText = $(this).find("action[tbox=clueTxt]").text().trim().replace('<![CDATA[','').replace(']]>',''); //text beacuse it may be in CDATA
            let sentence = "";
            $(this).find('sentence').text() ? sentence = $(this).find('sentence').text() : sentence = $(this).find("item[type=sentenceTextInput]").attr("sentence").trim(); // handle old and new template

            console.log(clueText)
            template.querySelector("#clueText").innerHTML = clueText;
            template.querySelector("#sentence").innerHTML = sentence;
            template.querySelector(".no").innerHTML = no;

            data += template.body.innerHTML;

        }); //end outer loop

        if (sentence || clueText) {
            //console.log(data);
            quizContainer.innerHTML = data;
            resolve("loaded");
        } else {
            reject("Could not load activity!")
        }

    })
} //end loadTI

function updateTI(XML) {
    //change dom value
    let textarea = quizContainer.querySelectorAll("textarea");
    for (let i = 0; i < textarea.length; i++) {
        textarea[i].innerHTML = textarea[i].value;
    }
    let template = new DOMParser().parseFromString(XML, "application/xml");
    console.log(template)

    let actName = filePath.split("\\"),lineBreaker="";
    let name = actName[6] + " " + actName[8] + "/" + actName[9];
    let quizzes = new DOMParser().parseFromString(quizContainer.innerHTML, "text/html")
    let quizzesArray = quizzes.querySelectorAll(".textinput");

    let data = "",
        content = "";
    //loop through quizzes
    for (let i = 0; i < quizzesArray.length; i++) {
        let quiz = quizzesArray[i],
            clueAudio = "",
            clueImage = "",
            sound = "";

        let sentence = quiz.querySelector("#sentence").innerHTML;
        webInteractive == true ? lineBreaker = "<br>" : lineBreaker = " &#xD;";
        sentence.includes("\n") ? sentence = sentence.split("\n").join(lineBreaker) : ""; //add line breaks in multi line sentence

        let clueText = quiz.querySelector(".ql-editor").innerHTML; //fetch text from quill because editor attached with clues field
        clueText = clueText.replace('<p>', '').replace('</p>', '').replace(/<p><br[\/]?><[\/]?p>/g, '').replace(/(&nbsp;|<br>|<br \/>)/gm, '').replace(/\>\s+\</g, '><'); //remove need <p> tags
        parseInt(i + 1) < 10 ? sound = `s00${i+1}` : sound = `s0${i+1}`;
        document.getElementById("onCorrect_audio").checked == true ? (playAudio = `<action type="delay" secs="0.5"/><action type="playSound" wait="yes" file="${sound}.mp3"></action><action type="delay" secs="0.5"/>`) : playAudio = "";
        document.getElementById("clue_audio").checked == true ? (clueAudio = `<item type="button" btn="${webInteractive?`btn-audio`:`Audio`}"><action type="playSound" file="${sound}.mp3" wait="no"></action></item><action type="playSound" file="${sound}.mp3" wait="no"></action>`) : "";
        document.getElementById("clue_audioPlayer").checked == true ? clueAudio = `<item type="mp3player" sym="mp3player_1" file="${sound}.mp3"/>` : "";
        document.getElementById("clue_image").checked == true ? (clueImage = `<action type="setImage" img="image-clue" src="image${i+1}.jpg"/>`) : clueImage = "";
        if (require("fs").existsSync(path.join(filePath, `content.xml`))) {
            require("fs").existsSync(path.join(filePath, `image${i+1}.jpg`)) ? "" : clueImage = "";
        }

        let no = i + 2;
        clueLine = "";

        clueText ? clueLine = `<action type="setHTML" tbox="clueTxt"><![CDATA[${clueText}]]></action>` : clueLine = ""; //add clueline if cluetext exists

        let frameContent = `
                            <frame num="${no}">
                                <action type="playSound" file="prompt.mp3"/>
                                <action type="show" sym="btnCheck"/>${clueLine}
                                ${clueAudio}  
                                ${clueImage}  
                                <action type="show" sym="clue-spacer"/>                         
                                <item type="sentenceTextInput" sentenceTextBox="sentenceText" _gaplength="3">
                                    <sentence><![CDATA[ ${sentence} ]]></sentence>
                                </item>
                                
                                <action type="waitTest"/>${playAudio}
                            </frame>
                        `;
        console.log(frameContent)
        data += frameContent;
    } //end loop
    console.log(data)
    data = prettifyXml(data, { indent: 4 })
    template.querySelector("activity").innerHTML = name;
    layout = layoutType.options[layoutType.selectedIndex].text.trim();
    accents = accentsType.options[accentsType.selectedIndex].text.trim();
    layout != "" ? template.querySelector("content").setAttribute('layout', layout) : "";
    layout != "" ? template.querySelector("content").setAttribute('template', activity.toLowerCase().replace(/\s/g, "")) : "";
    accents != "" ? template.querySelector("content").setAttribute('accents', accents.toLowerCase().replace(/\s/g, "")) : "";

    template.querySelector("frames").insertAdjacentHTML("beforeend", data);
    content = new XMLSerializer().serializeToString(template);;
    return content;
} //end updateTI function