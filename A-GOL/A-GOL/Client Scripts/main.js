"use strict";


//the main app for the client, contains everything most of the client side
var app = app || {};

//calls app's init function once the window is loaded
window.onload = function() {
	console.log("window loaded");
    app.main.init();

    //the event listener for when the user pauses the simulation
    document.getElementById("simPauseButton").onclick = function (e) {
        e.preventDefault();
        app.main.isPaused = !app.main.isPaused;
    };

    //the event listener for when the user switches between reviving and killing cells
    //in the simulation. Also pauses the simulation if its not already paused
    document.getElementById("simPaintButton").onclick = function (e) {
        e.preventDefault();

        app.main.isPaused = true;

        app.main.erasing = !app.main.erasing;
    };

    //when the user selects a pre-made setup, a function is called that renders the proper simulation on the screen
    document.getElementById("setups").onchange = function (e) {
        app.main.setups(e.target.value);
    };


    //event listener for when the user clears th esimulation aka kills all of the cells at once, leaving a blank simulation
    //also pauses the simulation if it wasn't already paused
    document.getElementById("simClearButton").onclick = function (e) {
        e.preventDefault();

        for (var i = 0; i < app.main.cells.length; i++) {
            for (var j = 0; j < app.main.cells[0].length; j++) {
                app.main.cells[i][j].isAlive = 0;
                app.main.cells[i][j].willBeAlive = 0;
            }
        }

        app.main.isPaused = true;
    };

    //automatically updates rule 1 (the lower limit for survival) as the player changes it
    document.getElementById("rule1").onchange = function (e) {
        e.preventDefault();
        if (isNaN(e.target.value)) {
            e.target.value = app.main.rule1;
        }
        else {
            app.main.rule1 = e.target.value;
        }
    };

    //automatically updates rule 2 (the upper limit for survival) as the player changes it
    document.getElementById("rule2").onchange = function (e) {
        e.preventDefault();

        if (isNaN(e.target.value)) {
            e.target.value = app.main.rule2;
        }
        else {
            app.main.rule2 = e.target.value;
        }
    };

    //automatically updates rule 3 (the amount of neighbors for revival) as the player changes it
    document.getElementById("rule3").onchange = function (e) {
        e.preventDefault();

        if (isNaN(e.target.value)) {
            e.target.value = app.main.rule3;
        }
        else {
            app.main.rule3 = e.target.value;
        }
    };

    //the event listener for the save new simulation button
    //collects all the data about the current state of the 
    //simulation and sends it in the proper format to the backend through ajax
    document.getElementById("makeSimButton").onclick = function (e) {
        e.preventDefault();

        //makes sure the rules are logical
        if ($("#rule1").val() > $("#rule2").val()) {
            alert("Lower bound must be less than upper bound");
            return false;
        }

        console.log($("#rule1").val() + " | " + $("#rule2").val() + " | " + $("#rule3").val())
        if (isNaN($("#rule1").val()) || isNaN($("#rule2").val()) || isNaN($("#rule3").val())) {
            alert("All rules must be numbers");
            return false;
        }

        //makes sure the simulation has a name
        if ($('#simName').val() == '') {
            alert("Must give new Simulation a name");
            return false;
        }

        //sets up the dataX and dataY arrays for the save
        var dataX = [];
        var dataY = [];

        for (var i = 0; i < app.main.cells.length; i++) {
            for (var j = 0; j < app.main.cells[0].length; j++) {
                if (app.main.cells[i][j].isAlive) {
                    dataX.push(i);
                    dataY.push(j);
                }
            }
        }

        //sends new simulation data to the server through an ajax call
        $.ajax({
            cache: false,
            type: "POST",
            url: "Sim/SaveNew",
            data: {
                dataX: dataX,
                dataY: dataY,
                rule1: $("#rule1").val(),
                rule2: $("#rule2").val(),
                rule3: $("#rule3").val(),
                name: $('#simName').val()
            },
            success: function () {
                alert("Simulation saved successfully!")
                location.reload()
            },
            error: function (xhr, status, error) {
                alert(error);
            }
        });

        return false;
    };
};

//the main 'class', most of everything is in here
app.main = {
	//variables
	canvas: undefined,	//the simulation canvas
	ctx: undefined,		//the simulation canvas context
    cells: undefined,	//the array of cells in the simulation
    width: 280,         //was 288
    height: 140,        //was 150
	rule1: undefined,	//the first rule (as defined before)
	rule2: undefined,	//the second rule (as defined before)
	rule3: undefined,	//the third rule (as defined before)
	intervalID: undefined,	//the id connected to the update loop, used to help stop it when the simulation is paused
	isPaused: false,		//bool stating whether or not the simulation is paused. True means yes, false means no
	painting: false,	//bool used to clarify whether the user is actively reviving cells
	erasing: false,		//bool used for determing whether the player is in revive or kill mode. false means revive
	username: undefined,	//the username of the user
	
	//the initializer function
	init: function() {
		//sets up all of the canvas stuff
		app.main.canvas = document.getElementById("gameWindow");
		app.main.canvas.width = 1400;//Math.round(window.innerWidth*.75);
		app.main.canvas.height = 700;//Math.round(window.innerHeight*.8);
		//sets up the event listeners for the mouse actions within the canvas
		app.main.canvas.onmousedown = app.main.doMouseDown;
		app.main.canvas.onmousemove = app.main.doMouseMove;
		app.main.canvas.onmouseup = app.main.doMouseUp;
		app.main.canvas.onmouseout = app.main.doMouseOut;
		app.main.ctx = app.main.canvas.getContext('2d');
		
		//gets the rule data from the webpage
		var data = document.getElementById('ruleData');
		app.main.rule1 = document.getElementById('rule1').value;
		app.main.rule2 = document.getElementById('rule2').value;
		app.main.rule3 = document.getElementById('rule3').value;
		
		//initializes cells for a new simulation (makes 288x150 cells)
        app.main.cells = [];
        for (var i = 0; i < app.main.width; i++)
		{
			app.main.cells.push([]);
			for(var j = 0; j < app.main.height; j++)
				app.main.cells[i].push(new app.Cell(i, j));
		}
		
		//calls the initial update and sets up the inetrval at which to call update in the main loop
		//simulation updates at 10 fps so user can see changes as they happen in the simulation
		app.main.update();
		app.main.intervalID = setInterval(app.main.update, 100);
		
	},
	
	//the update or main loop function
	update: function() {
		
		//draws all of the cells
        for (var i = 0; i < app.main.width; i++)
        {
            for (var j = 0; j < app.main.height; j++)
				app.main.cells[i][j].draw(app.main.ctx);
		}
		
		//goes through all of the cells and preps them for the next update if the simulation isnt paused
		if(!app.main.isPaused)
		{	
			app.main.cycleCells();
		}
		
		//chanegs the ui text values on the screen to match what is 
		//currently selected to help the player know what they are doing
		if(app.main.isPaused)
		{
			document.getElementById("simPauseButton").innerHTML = "Resume";
			document.getElementById("simPauseState").innerHTML = "Paused";
		}
		else
		{
			document.getElementById("simPauseButton").innerHTML = "Pause";
			document.getElementById("simPauseState").innerHTML = "Playing";
		}
		
		if(app.main.erasing)
		{
			document.getElementById("simPaintButton").innerHTML = "Revive Cells";
			document.getElementById("simDrawState").innerHTML = "Killing Cells";
		}
		else
		{
			document.getElementById("simPaintButton").innerHTML = "Kill Cells";
			document.getElementById("simDrawState").innerHTML = "Reviving Cells";
		}
		
	},
	
	//goes through all of the cells and determines which ones will survive/die/be revived in the next round
	cycleCells: function() {
	
		//goes through all of the cells, creates a list of its neighbors (minding the edge cases)
		//and checks them to set the cell up for the proper value next round
		for(var i = 0; i < app.main.cells.length; i++)
		{
			for (var j = 0; j < app.main.cells[0].length; j++)
			{
				var cellNeighbors  = [];
				if(i != 0 && j != 0)
					cellNeighbors.push(app.main.cells[i-1][j-1]);
				if(i != 0)
					cellNeighbors.push(app.main.cells[i-1][j]);
				if(i != 0 && j != app.main.height-1)
					cellNeighbors.push(app.main.cells[i-1][j+1]);
				if(j != 0)
					cellNeighbors.push(app.main.cells[i][j-1]);
				if(j != app.main.height-1)
					cellNeighbors.push(app.main.cells[i][j+1]);
				if(i != app.main.width-1 && j != 0)
					cellNeighbors.push(app.main.cells[i+1][j-1]);
				if(i != app.main.width-1)
					cellNeighbors.push(app.main.cells[i+1][j]);
				if(i != app.main.width-1 && j != app.main.height-1)
					cellNeighbors.push(app.main.cells[i+1][j+1]);
					
				app.main.cells[i][j].checkNeighbors(cellNeighbors, app.main.rule1, app.main.rule2, app.main.rule3);
			}
		}
		
		//goes through all of the cells, and if it was deterined above that the 
		//cell will be alive next round, then it's status is changed
		for(var i = 0; i < app.main.cells.length; i++)
		{
			for (var j = 0; j < app.main.cells[0].length; j++)
			{
				app.main.cells[i][j].isAlive = app.main.cells[i][j].willBeAlive;
			}
		}
	},
	
	//the event listener for if the mouse is down
	//if the simulation is paused, then the user begins reviving/killing cells
	doMouseDown: function(e) {
		if(app.main.isPaused)
		{
			app.main.painting = true;
			app.main.doMouseMove(e);
		}
	},
	
	//the event listener for if the mouse is moving
	//if the simulation is paused and the user is painting, then the cell 
	//that the mouse is over gets swtched to whatever the current mode does
	doMouseMove: function(e) {
		if(app.main.isPaused && app.main.painting)
		{
			var mouse = {};
			mouse.x = e.pageX - e.target.offsetLeft;
			mouse.y = e.pageY - e.target.offsetTop;
			
			var i = Math.round(mouse.x/5);
			var j = Math.round(mouse.y/5);
			
			if(!app.main.erasing)
			{
                app.main.cells[i][j].isAlive = 1;
                app.main.cells[i][j].willBeAlive = 1;
			}
			else
			{
                app.main.cells[i][j].isAlive = 0;
                app.main.cells[i][j].willBeAlive = 0;
			}
			
			//draws the cell so that it gives the user immediate feedback
			app.main.cells[i][j].draw(app.main.ctx);
		}
	},
	
	//the event listener for if the mouse goes up
	//ends painting for the user
	doMouseUp: function(e) {
		app.main.painting = false;
	},
	
	//the event listener for if the mouse leaves the canvas window
	//ends painting for the user
	doMouseOut: function(e) {
		app.main.painting = false;
	},
	
	//function used for setting up the simulation according to one of the pre-made setups chosen in the drop down
	setups: function(type){
		
		//changes the rules to match the simulation
        app.main.rule1 = 2;
		app.main.rule2 = 3;
		app.main.rule3 = 3;
		document.getElementById('rule1').value = 2;
        document.getElementById('rule2').value = 3;
		document.getElementById('rule3').value = 3;
		
		//kills all of the simulations cells so that it has an empty canvas to work with, 
		//and by the end only the proper cells will be alive
		for(var i = 0; i < app.main.cells.length; i++)
		{
			for (var j = 0; j < app.main.cells[0].length; j++)
			{
				app.main.cells[i][j].isAlive = 0;
				app.main.cells[i][j].willBeAlive = 0;
			}
		}
		
		if(type == 1) {	//the glider gun demo
			app.main.cells[52][43].isAlive = 1;
			app.main.cells[52][43].willBeAlive = 1;		
			
			app.main.cells[52][44].isAlive = 1;
			app.main.cells[52][44].willBeAlive = 1;	
			
			app.main.cells[53][43].isAlive = 1;
			app.main.cells[53][43].willBeAlive = 1;
			
			app.main.cells[53][44].isAlive = 1;
			app.main.cells[53][44].willBeAlive = 1;
			
			app.main.cells[62][43].isAlive = 1;
			app.main.cells[62][43].willBeAlive = 1;
			
			app.main.cells[62][44].isAlive = 1;
			app.main.cells[62][44].willBeAlive = 1;
			
			app.main.cells[62][45].isAlive = 1;
			app.main.cells[62][45].willBeAlive = 1;
			
			app.main.cells[63][42].isAlive = 1;
			app.main.cells[63][42].willBeAlive = 1;
			
			app.main.cells[63][46].isAlive = 1;
			app.main.cells[63][46].willBeAlive = 1;
			
			app.main.cells[64][41].isAlive = 1;
			app.main.cells[64][41].willBeAlive = 1;
			
			app.main.cells[64][47].isAlive = 1;
			app.main.cells[64][47].willBeAlive = 1;
			
			app.main.cells[65][41].isAlive = 1;
			app.main.cells[65][41].willBeAlive = 1;
			
			app.main.cells[65][47].isAlive = 1;
			app.main.cells[65][47].willBeAlive = 1;
			
			app.main.cells[66][44].isAlive = 1;
			app.main.cells[66][44].willBeAlive = 1;
			
			app.main.cells[67][42].isAlive = 1;
			app.main.cells[67][42].willBeAlive = 1;
			
			app.main.cells[67][46].isAlive = 1;
			app.main.cells[67][46].willBeAlive = 1;
			
			app.main.cells[68][43].isAlive = 1;
			app.main.cells[68][43].willBeAlive = 1;
			
			app.main.cells[68][44].isAlive = 1;
			app.main.cells[68][44].willBeAlive = 1;
			
			app.main.cells[68][45].isAlive = 1;
			app.main.cells[68][45].willBeAlive = 1;
			
			app.main.cells[69][44].isAlive = 1;
			app.main.cells[69][44].willBeAlive = 1;
			
			app.main.cells[72][41].isAlive = 1;
			app.main.cells[72][41].willBeAlive = 1;
			
			app.main.cells[72][42].isAlive = 1;
			app.main.cells[72][42].willBeAlive = 1;
			
			app.main.cells[72][43].isAlive = 1;
			app.main.cells[72][43].willBeAlive = 1;
			
			app.main.cells[73][41].isAlive = 1;
			app.main.cells[73][41].willBeAlive = 1;
			
			app.main.cells[73][42].isAlive = 1;
			app.main.cells[73][42].willBeAlive = 1;
			
			app.main.cells[73][43].isAlive = 1;
			app.main.cells[73][43].willBeAlive = 1;
			
			app.main.cells[74][40].isAlive = 1;
			app.main.cells[74][40].willBeAlive = 1;
			
			app.main.cells[74][44].isAlive = 1;
			app.main.cells[74][44].willBeAlive = 1;
			
			app.main.cells[76][39].isAlive = 1;
			app.main.cells[76][39].willBeAlive = 1;
			
			app.main.cells[76][40].isAlive = 1;
			app.main.cells[76][40].willBeAlive = 1;
			
			app.main.cells[76][44].isAlive = 1;
			app.main.cells[76][44].willBeAlive = 1;
			
			app.main.cells[76][45].isAlive = 1;
			app.main.cells[76][45].willBeAlive = 1;
			
			app.main.cells[86][41].isAlive = 1;
			app.main.cells[86][41].willBeAlive = 1;
			
			app.main.cells[86][42].isAlive = 1;
			app.main.cells[86][42].willBeAlive = 1;
			
			app.main.cells[87][42].isAlive = 1;
			app.main.cells[87][42].willBeAlive = 1;
			
			app.main.cells[87][41].isAlive = 1;
			app.main.cells[87][41].willBeAlive = 1;
			
			app.main.cells[159][132].isAlive = 1;
			app.main.cells[159][132].willBeAlive = 1;
			
			app.main.cells[159][133].isAlive = 1;
			app.main.cells[159][133].willBeAlive = 1;
			
			app.main.cells[160][132].isAlive = 1;
			app.main.cells[160][132].willBeAlive = 1;
			
			app.main.cells[161][133].isAlive = 1;
			app.main.cells[161][133].willBeAlive = 1;
			
			app.main.cells[161][134].isAlive = 1;
			app.main.cells[161][134].willBeAlive = 1;
			
			app.main.cells[161][135].isAlive = 1;
			app.main.cells[161][135].willBeAlive = 1;
			
			app.main.cells[162][135].isAlive = 1;
			app.main.cells[162][135].willBeAlive = 1;
		}
		else if(type == 2){	//the line pattern demo
			for(var i = 93; i < 180; i++)
			{
				app.main.cells[i][71].isAlive = 1;
				app.main.cells[i][71].willBeAlive = 1;		
			}
		}
		else if(type == 3){	//the blinker demo
			app.main.cells[0][1].isAlive = 1;
			app.main.cells[0][1].willBeAlive = 1;	

			app.main.cells[0][2].isAlive = 1;
			app.main.cells[0][2].willBeAlive = 1;		
			
			app.main.cells[0][2].isAlive = 1;
			app.main.cells[0][2].willBeAlive = 1;	
			
			app.main.cells[0][3].isAlive = 1;
			app.main.cells[0][3].willBeAlive = 1;	
			
			app.main.cells[0][136].isAlive = 1;
			app.main.cells[0][136].willBeAlive = 1;

			app.main.cells[0][137].isAlive = 1;
			app.main.cells[0][137].willBeAlive = 1;

			app.main.cells[0][138].isAlive = 1;
			app.main.cells[0][138].willBeAlive = 1;
			
			app.main.cells[1][0].isAlive = 1;
			app.main.cells[1][0].willBeAlive = 1;	
			
			app.main.cells[1][5].isAlive = 1;
			app.main.cells[1][5].willBeAlive = 1;	
			
			app.main.cells[1][134].isAlive = 1;
			app.main.cells[1][134].willBeAlive = 1;	
			
			app.main.cells[1][139].isAlive = 1;
			app.main.cells[1][139].willBeAlive = 1;	
			
			app.main.cells[2][0].isAlive = 1;
			app.main.cells[2][0].willBeAlive = 1;	
			
			app.main.cells[2][5].isAlive = 1;
			app.main.cells[2][5].willBeAlive = 1;	
			
			app.main.cells[2][134].isAlive = 1;
			app.main.cells[2][134].willBeAlive = 1;	
			
			app.main.cells[2][139].isAlive = 1;
			app.main.cells[2][139].willBeAlive = 1;	
			
			app.main.cells[3][0].isAlive = 1;
			app.main.cells[3][0].willBeAlive = 1;	
			
			app.main.cells[3][5].isAlive = 1;
			app.main.cells[3][5].willBeAlive = 1;	
			
			app.main.cells[3][134].isAlive = 1;
			app.main.cells[3][134].willBeAlive = 1;	
			
			app.main.cells[3][139].isAlive = 1;
			app.main.cells[3][139].willBeAlive = 1;	
			
			app.main.cells[5][1].isAlive = 1;
			app.main.cells[5][1].willBeAlive = 1;	

			app.main.cells[5][2].isAlive = 1;
			app.main.cells[5][2].willBeAlive = 1;		
			
			app.main.cells[5][2].isAlive = 1;
			app.main.cells[5][2].willBeAlive = 1;	
			
			app.main.cells[5][3].isAlive = 1;
			app.main.cells[5][3].willBeAlive = 1;	
			
			app.main.cells[5][136].isAlive = 1;
			app.main.cells[5][136].willBeAlive = 1;

			app.main.cells[5][137].isAlive = 1;
			app.main.cells[5][137].willBeAlive = 1;

			app.main.cells[5][138].isAlive = 1;
			app.main.cells[5][138].willBeAlive = 1;
			
			app.main.cells[29][23].isAlive = 1;
			app.main.cells[29][23].willBeAlive = 1;
			
			app.main.cells[30][23].isAlive = 1;
			app.main.cells[30][23].willBeAlive = 1;
			
			app.main.cells[31][23].isAlive = 1;
			app.main.cells[31][23].willBeAlive = 1;
			
			app.main.cells[33][19].isAlive = 1;
			app.main.cells[33][19].willBeAlive = 1;
			
			app.main.cells[33][20].isAlive = 1;
			app.main.cells[33][20].willBeAlive = 1;
			
			app.main.cells[33][21].isAlive = 1;
			app.main.cells[33][21].willBeAlive = 1;
			
			app.main.cells[33][25].isAlive = 1;
			app.main.cells[33][25].willBeAlive = 1;
			
			app.main.cells[33][26].isAlive = 1;
			app.main.cells[33][26].willBeAlive = 1;
			
			app.main.cells[33][27].isAlive = 1;
			app.main.cells[33][27].willBeAlive = 1;
			
			app.main.cells[35][23].isAlive = 1;
			app.main.cells[35][23].willBeAlive = 1;
			
			app.main.cells[36][23].isAlive = 1;
			app.main.cells[36][23].willBeAlive = 1;
			
			app.main.cells[37][23].isAlive = 1;
			app.main.cells[37][23].willBeAlive = 1;
			
			app.main.cells[56][56].isAlive = 1;
			app.main.cells[56][56].willBeAlive = 1;
			
			app.main.cells[57][56].isAlive = 1;
			app.main.cells[57][56].willBeAlive = 1;
			
			app.main.cells[57][57].isAlive = 1;
			app.main.cells[57][57].willBeAlive = 1;
			
			app.main.cells[58][56].isAlive = 1;
			app.main.cells[58][56].willBeAlive = 1;
			
			app.main.cells[58][57].isAlive = 1;
			app.main.cells[58][57].willBeAlive = 1;
			
			app.main.cells[59][57].isAlive = 1;
			app.main.cells[59][57].willBeAlive = 1;
			
			app.main.cells[65][57].isAlive = 1;
			app.main.cells[65][57].willBeAlive = 1;
			
			app.main.cells[66][56].isAlive = 1;
			app.main.cells[66][56].willBeAlive = 1;
			
			app.main.cells[66][57].isAlive = 1;
			app.main.cells[66][57].willBeAlive = 1;
			
			app.main.cells[67][56].isAlive = 1;
			app.main.cells[67][56].willBeAlive = 1;
			
			app.main.cells[67][57].isAlive = 1;
			app.main.cells[67][57].willBeAlive = 1;
			
			app.main.cells[68][56].isAlive = 1;
			app.main.cells[68][56].willBeAlive = 1;
			
			app.main.cells[108][52].isAlive = 1;
			app.main.cells[108][52].willBeAlive = 1;
			
			app.main.cells[108][53].isAlive = 1;
			app.main.cells[108][53].willBeAlive = 1;
			
			app.main.cells[109][52].isAlive = 1;
			app.main.cells[109][52].willBeAlive = 1;
			
			app.main.cells[110][55].isAlive = 1;
			app.main.cells[110][55].willBeAlive = 1;
			
			app.main.cells[111][54].isAlive = 1;
			app.main.cells[111][54].willBeAlive = 1;
			
			app.main.cells[111][55].isAlive = 1;
			app.main.cells[111][55].willBeAlive = 1;
			
			app.main.cells[113][62].isAlive = 1;
			app.main.cells[113][62].willBeAlive = 1;
			
			app.main.cells[114][62].isAlive = 1;
			app.main.cells[114][62].willBeAlive = 1;
			
			app.main.cells[115][62].isAlive = 1;
			app.main.cells[115][62].willBeAlive = 1;
			
			app.main.cells[117][54].isAlive = 1;
			app.main.cells[117][54].willBeAlive = 1;
			
			app.main.cells[117][55].isAlive = 1;
			app.main.cells[117][55].willBeAlive = 1;
			
			app.main.cells[118][55].isAlive = 1;
			app.main.cells[118][55].willBeAlive = 1;
			
			app.main.cells[119][52].isAlive = 1;
			app.main.cells[119][52].willBeAlive = 1;
			
			app.main.cells[120][52].isAlive = 1;
			app.main.cells[120][52].willBeAlive = 1;
			
			app.main.cells[120][53].isAlive = 1;
			app.main.cells[120][53].willBeAlive = 1;
			
			app.main.cells[164][69].isAlive = 1;
			app.main.cells[164][69].willBeAlive = 1;
			
			app.main.cells[164][70].isAlive = 1;
			app.main.cells[164][70].willBeAlive = 1;
			
			app.main.cells[164][71].isAlive = 1;
			app.main.cells[164][71].willBeAlive = 1;
			
			app.main.cells[164][75].isAlive = 1;
			app.main.cells[164][75].willBeAlive = 1;
			
			app.main.cells[164][76].isAlive = 1;
			app.main.cells[164][76].willBeAlive = 1;
			
			app.main.cells[164][77].isAlive = 1;
			app.main.cells[164][77].willBeAlive = 1;
			
			app.main.cells[166][67].isAlive = 1;
			app.main.cells[166][67].willBeAlive = 1;
			
			app.main.cells[166][72].isAlive = 1;
			app.main.cells[166][72].willBeAlive = 1;
			
			app.main.cells[166][74].isAlive = 1;
			app.main.cells[166][74].willBeAlive = 1;
			
			app.main.cells[166][79].isAlive = 1;
			app.main.cells[166][79].willBeAlive = 1;
			
			app.main.cells[167][67].isAlive = 1;
			app.main.cells[167][67].willBeAlive = 1;
			
			app.main.cells[167][72].isAlive = 1;
			app.main.cells[167][72].willBeAlive = 1;
			
			app.main.cells[167][74].isAlive = 1;
			app.main.cells[167][74].willBeAlive = 1;
			
			app.main.cells[167][79].isAlive = 1;
			app.main.cells[167][79].willBeAlive = 1;
			
			app.main.cells[168][67].isAlive = 1;
			app.main.cells[168][67].willBeAlive = 1;
			
			app.main.cells[168][72].isAlive = 1;
			app.main.cells[168][72].willBeAlive = 1;
			
			app.main.cells[168][74].isAlive = 1;
			app.main.cells[168][74].willBeAlive = 1;
			
			app.main.cells[168][79].isAlive = 1;
			app.main.cells[168][79].willBeAlive = 1;
			
			app.main.cells[169][69].isAlive = 1;
			app.main.cells[169][69].willBeAlive = 1;
			
			app.main.cells[169][70].isAlive = 1;
			app.main.cells[169][70].willBeAlive = 1;
			
			app.main.cells[169][71].isAlive = 1;
			app.main.cells[169][71].willBeAlive = 1;
			
			app.main.cells[169][75].isAlive = 1;
			app.main.cells[169][75].willBeAlive = 1;
			
			app.main.cells[169][76].isAlive = 1;
			app.main.cells[169][76].willBeAlive = 1;
			
			app.main.cells[169][77].isAlive = 1;
			app.main.cells[169][77].willBeAlive = 1;
			
			app.main.cells[171][69].isAlive = 1;
			app.main.cells[171][69].willBeAlive = 1;
			
			app.main.cells[171][70].isAlive = 1;
			app.main.cells[171][70].willBeAlive = 1;
			
			app.main.cells[171][71].isAlive = 1;
			app.main.cells[171][71].willBeAlive = 1;
			
			app.main.cells[171][75].isAlive = 1;
			app.main.cells[171][75].willBeAlive = 1;
			
			app.main.cells[171][76].isAlive = 1;
			app.main.cells[171][76].willBeAlive = 1;
			
			app.main.cells[171][77].isAlive = 1;
			app.main.cells[171][77].willBeAlive = 1;
			
			app.main.cells[172][67].isAlive = 1;
			app.main.cells[172][67].willBeAlive = 1;
			
			app.main.cells[172][72].isAlive = 1;
			app.main.cells[172][72].willBeAlive = 1;
			
			app.main.cells[172][74].isAlive = 1;
			app.main.cells[172][74].willBeAlive = 1;
			
			app.main.cells[172][79].isAlive = 1;
			app.main.cells[172][79].willBeAlive = 1;
			
			app.main.cells[173][67].isAlive = 1;
			app.main.cells[173][67].willBeAlive = 1;
			
			app.main.cells[173][72].isAlive = 1;
			app.main.cells[173][72].willBeAlive = 1;
			
			app.main.cells[173][74].isAlive = 1;
			app.main.cells[173][74].willBeAlive = 1;
			
			app.main.cells[173][79].isAlive = 1;
			app.main.cells[173][79].willBeAlive = 1;
			
			app.main.cells[174][67].isAlive = 1;
			app.main.cells[174][67].willBeAlive = 1;
			
			app.main.cells[174][72].isAlive = 1;
			app.main.cells[174][72].willBeAlive = 1;
			
			app.main.cells[174][74].isAlive = 1;
			app.main.cells[174][74].willBeAlive = 1;
			
			app.main.cells[174][79].isAlive = 1;
			app.main.cells[174][79].willBeAlive = 1;
			
			app.main.cells[176][69].isAlive = 1;
			app.main.cells[176][69].willBeAlive = 1;
			
			app.main.cells[176][70].isAlive = 1;
			app.main.cells[176][70].willBeAlive = 1;
			
			app.main.cells[176][71].isAlive = 1;
			app.main.cells[176][71].willBeAlive = 1;
			
			app.main.cells[176][71].isAlive = 1;
			app.main.cells[176][71].willBeAlive = 1;
			
			app.main.cells[176][75].isAlive = 1;
			app.main.cells[176][75].willBeAlive = 1;
			
			app.main.cells[176][76].isAlive = 1;
			app.main.cells[176][76].willBeAlive = 1;
			
			app.main.cells[176][77].isAlive = 1;
			app.main.cells[176][77].willBeAlive = 1;
			
			app.main.cells[274][1].isAlive = 1;
			app.main.cells[274][1].willBeAlive = 1;

			app.main.cells[274][2].isAlive = 1;
			app.main.cells[274][2].willBeAlive = 1;

			app.main.cells[274][3].isAlive = 1;
			app.main.cells[274][3].willBeAlive = 1;

			app.main.cells[274][136].isAlive = 1;
			app.main.cells[274][136].willBeAlive = 1;

			app.main.cells[274][137].isAlive = 1;
			app.main.cells[274][137].willBeAlive = 1;

			app.main.cells[274][138].isAlive = 1;
			app.main.cells[274][138].willBeAlive = 1;
			
			app.main.cells[276][0].isAlive = 1;
			app.main.cells[276][0].willBeAlive = 1;

			app.main.cells[276][5].isAlive = 1;
			app.main.cells[276][5].willBeAlive = 1;

			app.main.cells[276][134].isAlive = 1;
			app.main.cells[276][134].willBeAlive = 1;

			app.main.cells[276][139].isAlive = 1;
			app.main.cells[276][139].willBeAlive = 1;
			
			app.main.cells[277][0].isAlive = 1;
			app.main.cells[277][0].willBeAlive = 1;

			app.main.cells[277][5].isAlive = 1;
			app.main.cells[277][5].willBeAlive = 1;

			app.main.cells[277][134].isAlive = 1;
			app.main.cells[277][134].willBeAlive = 1;

			app.main.cells[277][139].isAlive = 1;
			app.main.cells[277][139].willBeAlive = 1;
			
			app.main.cells[278][0].isAlive = 1;
			app.main.cells[278][0].willBeAlive = 1;

			app.main.cells[278][5].isAlive = 1;
			app.main.cells[278][5].willBeAlive = 1;

			app.main.cells[278][134].isAlive = 1;
			app.main.cells[278][134].willBeAlive = 1;

			app.main.cells[278][139].isAlive = 1;
			app.main.cells[278][139].willBeAlive = 1;

			app.main.cells[279][1].isAlive = 1;
			app.main.cells[279][1].willBeAlive = 1;

			app.main.cells[279][2].isAlive = 1;
			app.main.cells[279][2].willBeAlive = 1;
			
			app.main.cells[279][3].isAlive = 1;
			app.main.cells[279][3].willBeAlive = 1;
			                
			app.main.cells[279][136].isAlive = 1;
			app.main.cells[279][136].willBeAlive = 1;
			
			app.main.cells[279][137].isAlive = 1;
			app.main.cells[279][137].willBeAlive = 1;
			
			app.main.cells[279][138].isAlive = 1;
			app.main.cells[279][138].willBeAlive = 1;
		}
		else if(type == 4) {	//the r-pentomino demo
		
			app.main.cells[133][64].isAlive = 1;
			app.main.cells[133][64].willBeAlive = 1;
			
			app.main.cells[134][63].isAlive = 1;
			app.main.cells[134][63].willBeAlive = 1;
			
			app.main.cells[134][64].isAlive = 1;
			app.main.cells[134][64].willBeAlive = 1;
			
			app.main.cells[134][65].isAlive = 1;
			app.main.cells[134][65].willBeAlive = 1;
			
			app.main.cells[135][63].isAlive = 1;
			app.main.cells[135][63].willBeAlive = 1;
		}
		
		
	},
	
	
	//function used for setting up a user saved simulation setup
	//params:
	//dataX- the x coordinates for each cell to be made alive for the simulation in order to atch with dataY
	//dataY- the y coordinates for each cell to be made alive for the simulation in order to atch with dataX
	//rule1- the  first simulation rule
	//rule2- the  second simulation rule
	//rule3- the  third simulation rule
	setup: function(dataX, dataY, rule1, rule2, rule3){
		
		//sets the rules equal to those provided as well as updates the text boxes on screen
        app.main.rule1 = rule1;
		app.main.rule2 = rule2;
		app.main.rule3 = rule3;
		document.getElementById('rule1').value = rule1;
        document.getElementById('rule2').value = rule2;
		document.getElementById('rule3').value = rule3;
		
		
		//clears the old simulation so there are no cells alive
		for(var i = 0; i < app.main.cells.length; i++)
		{
			for (var j = 0; j < app.main.cells[0].length; j++)
			{
				app.main.cells[i][j].isAlive = 0;
				app.main.cells[i][j].willBeAlive = 0;
			}
		}
		
		//lops through dataX and dataY and sets the proper cells to be alive
		for(var i = 0; i < dataX.length; i++)
		{
			app.main.cells[dataX[i]][dataY[i]].isAlive = 1;
			app.main.cells[dataX[i]][dataY[i]].willBeAlive = 1;
		}
	},
	
	//used for development purposes only
	//used to get reference lists for hard coding in the pre-defined setups
	printOut: function() {
		for(var i = 0; i < app.main.cells.length; i++)
		{
			for (var j = 0; j < app.main.cells[0].length; j++)
			{
				if(app.main.cells[i][j].isAlive)
					console.log("i= " + i + ", j= " + j);
			}
		}
	}
	
};