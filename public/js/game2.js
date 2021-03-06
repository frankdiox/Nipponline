var socket = io.connect(),
	sessionAck = false,
	manifest,
	queue,
	totalLoaded,
	images,
	animations,
	words,
	currentTarget = null, currentPos = 0,
	fireballs,
	difficulty = "easy",
	stage, wordsContainer, fireballsContainer,
	hpContainer, hpBar, hpRemaining = 1.0, hpPerFail, hpPerWord,
	energyContainer, energyBar, energyRemaining = 0.0, energyPerWord,
	canvasBaseWidth = 1152, canvasBaseHeight = 812,
	counter, wordRate = 60, wordSpeed = 1, fireballSpeed = 16,
	streakCount, streakCountText, bestStreakCount, bestStreakCountText, wordCount, wordCountText, bestWordCount, bestWordCountText,
	pause = false, kanjiOn = false,
	wordSet, wordSet2, refreshCounter = 0, refreshRequest = false;

socket.on('acknowledge', function(ack){
  sessionAck = ack;
});

function game2() {

	socket.emit('getwords', 0, function (data) {
		wordSet = data;
	});

	window.onresize = resize;

	totalLoaded = 0;

	images = {};
	animations = {};
	words = {};
	fireballs = [];

	resize();

	stage = new createjs.Stage("stage");
	wordsContainer = new createjs.Container();
	fireballsContainer = new createjs.Container();

	// Difficulty settings
	switch(difficulty){
		case "easy":
			wordRate = 120;
			wordSpeed = 2;
			hpPerFail = -0.1;
			hpPerWord = 0.05;
			energyPerWord = 0.2;
			break;
	}

	// HP bar
	hpContainer = new createjs.Container();
	hpContainer.x = 928;
	hpContainer.y = 20;
	hpContainer.addChild(new createjs.Shape(new createjs.Graphics().beginFill("yellow").drawRect(0, 0, 204, 34)));
	hpContainer.addChild(new createjs.Shape(new createjs.Graphics().beginFill("black").drawRect(2, 2, 200, 30)));
	hpBar = new createjs.Shape(new createjs.Graphics().beginFill("orange").drawRect(2, 2, 200*hpRemaining, 30));
	hpContainer.addChild(hpBar);

	// Energy bar
	energyContainer = new createjs.Container();
	energyContainer.x = 20;
	energyContainer.y = 20;
	energyContainer.addChild(new createjs.Shape(new createjs.Graphics().beginFill("yellow").drawRect(0, 0, 204, 34)));
	energyContainer.addChild(new createjs.Shape(new createjs.Graphics().beginFill("black").drawRect(2, 2, 200, 30)));
	energyBar = new createjs.Shape(new createjs.Graphics().beginFill("pink").drawRect(2, 2, 200*energyRemaining, 30));
	energyContainer.addChild(energyBar);

	// Text
	streakCountText = new createjs.Text("Streak:", "22px Play", "#ff7700"); streakCountText.x = 10; streakCountText.y = canvasBaseHeight-44; streakCountText.textBaseline = "alphabetic";
	bestStreakCountText = new createjs.Text("Best:", "22px Play", "#ff7700"); bestStreakCountText.x = 10; bestStreakCountText.y = canvasBaseHeight-22; bestStreakCountText.textBaseline = "alphabetic";
	wordCountText = new createjs.Text("Total:", "22px Play", "#ff7700"); wordCountText.x = 140; wordCountText.y = canvasBaseHeight-44; wordCountText.textBaseline = "alphabetic";
	bestWordCountText = new createjs.Text("Best:", "22px Play", "#ff7700"); bestWordCountText.x = 140; bestWordCountText.y = canvasBaseHeight-22; bestWordCountText.textBaseline = "alphabetic";

	// Internationalization
  	i18n.init({ useCookie: false },setLngVariables);

  	// Resources to be loaded
	manifest = [];
    manifest.push({src:"images/app2/fox.png", id:"fox", imageType:"spriteSheet",
     	frames:{width: 283, height: 250, regX: 283/2, regY: 250/2},
     	animations: {
			move: [0, 3, "move"]
		},
		initAnim: "move",
		animName: "foxAnim"
	});
	manifest.push({src:"images/app2/fireball.png", id:"fireball", imageType:"spriteSheet",
     	frames:{width: 48, height: 44},
     	animations: {
			move: [0, 3, "idle"]
		},
		initAnim: "idle",
		animName: "fireballAnim"
	});
	manifest.push({src:"images/app2/bg.png", id:"bg", imageType:"background"});
	manifest.push({src:"images/app2/power1.gif", id:"power1"});
	manifest.push({src:"images/app2/power2.gif", id:"power2"});
	manifest.push({src:"images/app2/power3.gif", id:"power3"});
	manifest.push({src:"images/app2/power1_disabled.gif", id:"power1Disabled"});
	manifest.push({src:"images/app2/power2_disabled.gif", id:"power2Disabled"});
	manifest.push({src:"images/app2/power3_disabled.gif", id:"power3Disabled"});

    queue = new createjs.LoadQueue();
    queue.addEventListener("progress", handleProgress);
    queue.addEventListener("complete", handleComplete);
    queue.addEventListener("fileload", handleFileLoad);
    queue.loadManifest(manifest);
}

function resize(){
	$("#stage").width(window.innerWidth);
  	$("#stage").height(window.innerHeight);
}

function update(){
	if(!pause){
		moveBackground();
		updateWords();
		updateFireballs();
		updateWordSets();
		stage.update();
	}
}

function handleProgress(event){
  $("#progress_bar1").css("width",Math.floor(event.loaded*100)+"%");
}

function handleComplete(event){

	setTimeout(function(){
  		counter = 0;
  		createjs.Ticker.setFPS(30);
		createjs.Ticker.addEventListener("tick",update);

        stage.removeAllChildren();
        for(var i=0; i<images["bg"].length; i++){
        	for(var j=0; j<images["bg"][i].length; j++){
        		stage.addChild(images["bg"][i][j]);
        	}
        }
        stage.addChild(fireballsContainer);
        stage.addChild(wordsContainer);
        stage.addChild(animations["fox"]);
        stage.addChild(streakCountText);
        stage.addChild(bestStreakCountText);
        stage.addChild(wordCountText);
        stage.addChild(bestWordCountText);
        stage.addChild(hpContainer);
        stage.addChild(energyContainer);
        setPowerIcons();
        stage.update();

        $("#input1").on("input",inputChange);
        $("#input_div").css("display","block");

        $("#loading_screen_container").css("display","none");
        $("#stage").css("display","block");
        $("#input1").focus();
	}, 1000);

}

function handleFileLoad(event){

  switch(event.item.type){

    case createjs.LoadQueue.IMAGE:
		//image loaded
      	var img = new Image();
      	img.src = event.item.src;
      	$(img).load( function() {

	      	switch(event.item.imageType){

		      	case "spriteSheet":
		      		var spriteSheet =
		      			new createjs.SpriteSheet({
							images: [img],
							frames: event.item.frames,
							animations: event.item.animations
						}),
						animation = new createjs.Sprite(spriteSheet);

					animation.gotoAndPlay(event.item.initAnim);
					animation.shadow = new createjs.Shadow("#454", 0, 5, 4);

					animation.name = event.item.animName;
					animation.x = event.item.frames.regX+(canvasBaseWidth-event.item.frames.width)/2;
					animation.y = event.item.frames.regY+(canvasBaseHeight-event.item.frames.height);

					animations[event.item.id] = animation;
		      		break;

		      	case "background":
		      		images[event.item.id] = [];
		      		for(var i=0; i<=canvasBaseWidth/img.width;i++){
		      			images[event.item.id].push([]);
		      			for(var j=0; j<=canvasBaseHeight/img.height; j++){
		      				images[event.item.id][i].push(new createjs.Bitmap(img));
		      				images[event.item.id][i][j].x = i*img.width;
		      				images[event.item.id][i][j].y = j*img.height;
		      			}
		      		}
		      		break;

		      	default:
		      		var bitmap =  new createjs.Bitmap(img);
		      		bitmap.x = 0;
		      		bitmap.y = 0;

		      		images[event.item.id] = bitmap;
		      		break;
	      	}

		}).error( function() {
    		console.log("Unable to load resource: "+event.item.src);
		});

      	totalLoaded++;
      	break;
  }
}

function handleLoadComplete(event){
}

function setPowerIcons(){
	// Powers enabled
	images["power1"].x = canvasBaseWidth-360;
	images["power1"].y = canvasBaseHeight-120;
	images["power1"].addEventListener("click", function(event) {
		power1();
		$("#input1").focus();
	});
	images["power2"].x = canvasBaseWidth-240;
	images["power2"].y = canvasBaseHeight-120;
	images["power2"].addEventListener("click", function(event) {
		power2();
		$("#input1").focus();
	});
	images["power3"].x = canvasBaseWidth-120;
	images["power3"].y = canvasBaseHeight-120;
	images["power3"].addEventListener("click", function(event) {
		power3();
		$("#input1").focus();
	});

	// Powers disabled
	images["power1Disabled"].x = canvasBaseWidth-360;
	images["power1Disabled"].y = canvasBaseHeight-120;
	images["power1Disabled"].addEventListener("click", function(event) {
		$("#input1").focus();
	});

	images["power2Disabled"].x = canvasBaseWidth-240;
	images["power2Disabled"].y = canvasBaseHeight-120;
	images["power2Disabled"].addEventListener("click", function(event) {
		$("#input1").focus();
	});

	images["power3Disabled"].x = canvasBaseWidth-120;
	images["power3Disabled"].y = canvasBaseHeight-120;
	images["power3Disabled"].addEventListener("click", function(event) {
		$("#input1").focus();
	});

	// Initial visibility
	images["power1"].visible = false;
	images["power3"].visible = false;
	images["power2Disabled"].visible = false;

	stage.addChild(images["power1"]);
	stage.addChild(images["power2"]);
	stage.addChild(images["power3"]);
	stage.addChild(images["power1Disabled"]);
	stage.addChild(images["power2Disabled"]);
	stage.addChild(images["power3Disabled"]);
}


function pickRandomProperty(obj) {
	var keys = Object.keys(obj);
	return keys[parseInt(Math.random()*keys.length)];
}

function moveBackground(){
	for(var i=0; i<images["bg"].length; i++){
		for(var j=0; j<images["bg"][i].length; j++){
			images["bg"][i][j].y++;
			if(images["bg"][i][j].y > canvasBaseHeight){
				images["bg"][i][j].y = -(canvasBaseHeight/(images["bg"][0].length-1))+1;
			}
		}
	}
}

function changeHP(amount){

	hpRemaining += amount;
	hpRemaining = hpRemaining < 0 ? 0 : hpRemaining > 1 ? 1 : hpRemaining;
	hpBar.graphics.clear()
	hpBar.graphics.beginFill("orange").drawRect(2, 2, 200*hpRemaining, 30);
}

function changeEnergy(amount){
	var startEnergy = energyRemaining;

	energyRemaining += amount;
	energyRemaining = energyRemaining < 0 ? 0 : energyRemaining > 1 ? 1 : energyRemaining;
	energyBar.graphics.clear()
	energyBar.graphics.beginFill("pink").drawRect(2, 2, 200*energyRemaining, 30);

	if(startEnergy < 0.5 && energyRemaining >= 0.5){
		images["power1"].visible = true;
		images["power1Disabled"].visible = false;
	}
	if(startEnergy >= 0.5 && energyRemaining < 0.5){
		images["power1"].visible = false;
		images["power1Disabled"].visible = true;
	}
	if(startEnergy < 1.0 && energyRemaining >= 1.0){
		images["power3"].visible = true;
		images["power3Disabled"].visible = false;
	}
	if(startEnergy >= 1.0 && energyRemaining < 1.0){
		images["power3"].visible = false;
		images["power3Disabled"].visible = true;
	}
}

function parseTargetString(word){

	var target = {};
	target.str = [];
	target.displayStr = [];

	if(kanjiOn){
	}
	else{

		for(var i=0; i<word.romaji.length; i++){
			if(word.romaji[i] instanceof Array){
				for(var j=0; j<word.romaji[i].length; j++){
					target.str.push(word.romaji[i][j]);
				}
			}
			else{
				target.str.push(word.romaji[i]);
			}
		}

		for(var i=0; i<word.writing.length; i++){
			if(word.writing[i] instanceof Array){
				for(var j=0; j<word.writing[i].length; j++){
					target.displayStr.push(word.writing[i][j]);
				}
			}
			else{
				target.displayStr.push(word.writing[i]);
			}
		}
	}

	return target;
}

function createWord(){

	var wordNum = parseInt(Math.random()*wordSet.length);
	var target = parseTargetString(wordSet[wordNum]);

	while(words[wordNum]){
		wordNum = wordNum+"-";
	}

	words[wordNum] = {};
	words[wordNum].str = target.str;
	words[wordNum].displayStr = target.displayStr;
	words[wordNum].displayStrHit = [];
	words[wordNum].stepY = wordSpeed;
	words[wordNum].strObj = new createjs.Text(words[wordNum].displayStr.toString().replace(/,/g,""), "24px Arial", "#ffffff");
	words[wordNum].strObj.x = parseInt(Math.random()*(canvasBaseWidth-200));
	words[wordNum].strObj.y = -20;
	words[wordNum].strObj.textBaseline = "alphabetic";
	words[wordNum].strObj.outline = 3;

	words[wordNum].strObjHit = new createjs.Text(words[wordNum].displayStrHit.toString().replace(/,/g,""), "24px Arial", "#ff0000");
	words[wordNum].strObjHit.x = words[wordNum].strObj.x;
	words[wordNum].strObjHit.y = -20;
	words[wordNum].strObjHit.textBaseline = "alphabetic";
	words[wordNum].strObjHit.outline = 3;

	stage.getChildAt(stage.getChildIndex(wordsContainer)).addChild(words[wordNum].strObj);
	stage.getChildAt(stage.getChildIndex(wordsContainer)).addChild(words[wordNum].strObjHit);

	if(Math.random() < 0.5){
		// The word aims to hit the player
		var ticksNeeded = (canvasBaseHeight-104)/wordSpeed;
		words[wordNum].stepX = (canvasBaseWidth/2-words[wordNum].strObj.getBounds().width/2-words[wordNum].strObj.x)/ticksNeeded;
	}
	else{
		words[wordNum].stepX = 0;
	}
}

function destroyWord(key){

	stage.getChildAt(stage.getChildIndex(wordsContainer)).removeChild(words[key].strObj);
	stage.getChildAt(stage.getChildIndex(wordsContainer)).removeChild(words[key].strObjHit);
	delete words[key];

	if(currentTarget == key){
		currentTarget = null;
		currentPos = 0;
	}

	refreshCounter++;
}

function updateWords(){
	counter++;
	if(counter == wordRate){
		counter = 0;

		if(wordSet){
			createWord();
		}
	}

	for(var wordNum in words){
		words[wordNum].strObj.x+=words[wordNum].stepX;
		words[wordNum].strObjHit.x+=words[wordNum].stepX;
		words[wordNum].strObj.y+=words[wordNum].stepY;
		words[wordNum].strObjHit.y+=words[wordNum].stepY;
		if(words[wordNum].strObj.y > canvasBaseHeight){
			destroyWord(wordNum);
			updateStreakCount(0);
			changeHP(hpPerFail);
		}
	}
}

function setFireballSpeed(fireball){
	var ticksToImpact = 30;

	fireball["stepY"] = fireball["img"].y-words[fireball["target"]].strObj.y < 0 ? fireballSpeed : -fireballSpeed;

	ticksToImpact = (fireball["img"].y-words[fireball["target"]].strObj.y)/(words[fireball["target"]].stepY+fireballSpeed);

	fireball["stepX"] = ticksToImpact == 0 ? 0 :
	words[fireball["target"]].stepX+(words[fireball["target"]].strObj.x+words[fireball["target"]].strObj.getBounds().width/2-fireball["img"].x-fireball["img"].getBounds().width/2)/ticksToImpact;
}

function shootFireball(key){

	if(!key){
		key = pickRandomProperty(words);
	}

	fireballs.push({});
	fireballs[fireballs.length-1]["img"] = animations["fireball"].clone();
	fireballs[fireballs.length-1]["img"].x = animations["fox"].x;
	fireballs[fireballs.length-1]["img"].y = animations["fox"].y;
	fireballs[fireballs.length-1]["target"] = key;

	setFireballSpeed(fireballs[fireballs.length-1]);

	stage.getChildAt(stage.getChildIndex(fireballsContainer)).addChild(fireballs[fireballs.length-1]["img"]);
}

function updateFireballs(){
	var difY;

	for(var i=0; i<fireballs.length; i++){

		if(words[fireballs[i]["target"]]){

			difY = words[fireballs[i]["target"]].strObj.y - fireballs[i].img.y;

			fireballs[i].img.x += fireballs[i].stepX;
			fireballs[i].img.y += fireballs[i].stepY;

			if(Math.abs(difY) <= fireballSpeed){
				stage.getChildAt(stage.getChildIndex(fireballsContainer)).removeChild(fireballs[i]["img"]);
				wordHit(fireballs[i]["target"]);
				fireballs.splice(i,1);
				i--;
			}
		}
		else{
			stage.getChildAt(stage.getChildIndex(fireballsContainer)).removeChild(fireballs[i]["img"]);
			fireballs.splice(i,1);
			i--;
		}
	}
}

function wordHit(key){

	if(words[key].strObj.text.length-1 == words[key].strObjHit.text.length){
		destroyWord(key);
		changeHP(hpPerWord);
		changeEnergy(energyPerWord);

		updateWordCount(wordCount+1);
		if(wordCount > bestWordCount){
			updateBestWordCount(wordCount);
		}
		updateStreakCount(streakCount+1);
		if(streakCount > bestStreakCount){
			updateBestStreakCount(streakCount);
		}
	}
	else{
		words[key].displayStrHit = words[key].displayStr.slice(0,words[key].displayStrHit.length+1);
		words[key].strObjHit.text = words[key].displayStrHit.toString().replace(/,/g,"");
	}
}

function inputChange(){
	var key;

	if(key = checkValidity($("#input1").val().toLowerCase())){
		if(words[currentTarget].str.length <= currentPos){
			currentPos = 0;
			currentTarget = null;
		}
		shootFireball(key);
		$("#input1").val("");
	}
}

function checkValidity(value){

	if(currentTarget){
		if(words[currentTarget].str[currentPos] == value){
			currentPos++;
			return currentTarget;
		}
	}
	else{
		var bestTarget = null,
			bestY = -100;

		for(var wordNum in words){
			if(words[wordNum].str[currentPos] == value && words[wordNum].strObj.y > bestY && !words[wordNum].targeted){
				bestY = words[wordNum].strObj.y;
				bestTarget = wordNum;
			}
		}

		if(bestTarget){
			currentPos++;
			currentTarget = bestTarget;
			words[currentTarget].targeted = true;
			return bestTarget;
		}
	}

	return null;
}

function updateWordSets(){
	if(refreshCounter > 20){

		if(!refreshRequest){
			refreshRequest = true;

			socket.emit('getwords', 0, function (data) {
				wordSet2 = data;
			});
		}

		if(refreshCounter > 30){
			wordSet = wordSet2;
			wordSet2 = null;
			refreshRequest = false;
			refreshCounter = 0;
		}
	}
}

function power1(){

	if(energyRemaining >= 0.5){
		for(var wordNum in words){
			words[wordNum].stepY /= 2;
			words[wordNum].stepX /= 2;
			for(var i=0; i<fireballs.length; i++){
				if(fireballs[i]["target"] == wordNum){
					setFireballSpeed(fireballs[i]);
				}
			}
		}
		changeEnergy(-0.5);
	}
}

function power2(){

	changeHP(0.5*energyRemaining);
	changeEnergy(-energyRemaining);
}

function power3(){

	if(energyRemaining == 1.0){
		for(var wordNum in words){
			destroyWord(wordNum);

			updateWordCount(wordCount+1);
			if(wordCount > bestWordCount){
				updateBestWordCount(wordCount);
			}
			updateStreakCount(streakCount+1);
			if(streakCount > bestStreakCount){
				updateBestStreakCount(streakCount);
			}
		}
		changeEnergy(-1);
	}
}

function setLngVariables(){

	updateStreakCount(0);
  	updateBestStreakCount(0);
  	updateWordCount(0);
  	updateBestWordCount(0);
}

function updateStreakCount(value){
	streakCount = value;
 	streakCountText.text = i18n.t("streak")+": "+value;
}

function updateBestStreakCount(value){
	bestStreakCount = value;
 	bestStreakCountText.text = i18n.t("best")+": "+value;
}

function updateWordCount(value){
	wordCount = value;
 	wordCountText.text = i18n.t("wordCount")+": "+value;
}

function updateBestWordCount(value){
	bestWordCount = value;
 	bestWordCountText.text = i18n.t("best")+": "+value;
}