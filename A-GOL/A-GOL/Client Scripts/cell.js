//the app class variable
var app = app || {};

//the Cell class
app.Cell = function() {
	
	//constructor for Cell
	//params:
	//Xindex- the cells x-index in mains cell array
	//Yindex- the cells y-index in mains cell array
	function Cell(XIndex, YIndex){
		this.x = XIndex;
		this.y = YIndex;
		this.isAlive = Math.floor(Math.random() * 2);	//whether or not it is alive right now
		this.willBeAlive = this.isAlive;				//whether or not it will be alive next round
	};
	
	//the prototype for the Cell
	var c = Cell.prototype;
	
	//the cells draw function
	//draws white for died and black for alive
	c.draw = function(ctx) {
		ctx.save();
		if(this.isAlive == 0)
			ctx.fillStyle = "white";
		else
			ctx.fillStyle = "black";
		
		ctx.fillRect((this.x*5), (this.y*5), 5, 5);
		ctx.restore();
	}
	
	//goes through all of the cells neighbors and determines whether or not it will be alive next round
	//params:
	//neighbors- the list of neighbors to check
	//n1- rule 1
	//n2- rule 2
	//n3- rule 3
	c.checkNeighbors = function(neighbors, n1, n2, n3)
	{
		//counter for the number of alive and dead neighbors
		var numAlive = 0;
		var numDead = 0;

		for(var i = 0; i < neighbors.length; i++)
		{
			if(neighbors[i].isAlive == 0)
				numDead++;
			else
				numAlive++
		}
		
		//if the number of neighbors alive is between n1 and n2 and its already alive, then it stays alive
		if(this.isAlive == 1)
		{
			if(numAlive < n1 || numAlive > n2)
				this.willBeAlive = 0;
		}
		//if it has exactly n3 alive neighbors and its currently died, then it gets revived in the next round
		else
		{
			if(numAlive == n3)
				this.willBeAlive = 1;
		}
		
	}
	
	return Cell;
}();