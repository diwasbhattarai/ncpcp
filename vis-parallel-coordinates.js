function buildParallelCoordinates(data, popt, toggleArray){
	var margin = {top: 30, right: 10, bottom: 10, left: 10},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

	var x = d3.scalePoint().range([0, width]),
	    y = {};

	var line = d3.line(),
	    axis = d3.axisLeft(),
	    background,
	    foreground;

	var svg = d3.select("body").append("svg").attr("id","mainSvgID")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Returns the path for a given data point.
	function path(d) {
	  //console.log(p, y[p])
	  return line(dimensions.map(function(p) { return [x(p), y[p](d[p])]; }));
	}

	// Handles a brush event, toggling the display of foreground lines.
	function brush() {
	  var actives = dimensions.filter(function(p) { return !y[p].brush.empty(); }),
	      extents = actives.map(function(p) { return y[p].brush.extent(); });
	  foreground.style("display", function(d) {
	    return actives.every(function(p, i) {
	      return extents[i][0] <= d[p] && d[p] <= extents[i][1];
	    }) ? null : "none";
	  });
	}

	var dimensions  = d3.keys(data[0]);
	//dim = _.difference(dimensions, categorical);

	x.domain(dimensions);
	for (var i in dimensions){
	  var d = dimensions[i];
	  
	  if (_.contains(popt.categorical, d)){
	    var uniq = _.unique(cars.map(function(dp){ return dp[d];}));
	    var r    = [];
	    var h    = height;
	    var i    = 1;
	    var div  = height/(uniq.length-1);
	    for (var u in uniq){
	      r.push(Math.floor(h));
	      h = h - div;
	    }

	    y[d] = d3.scaleOrdinal().domain(uniq)
	                             .range(r);
	  } else {
	    y[d] = d3.scaleLinear();
	                           
		// if(popt.ranges[d]){
		if (d == "power (hp)" && _.contains(toggleArray, d)){
			// transform points in terms of height

			y[d] = y[d].domain(popt[d][0])
			           .range([height, height*.15, 0]);
			//console.log(popt[d][0]);
			//console.log(y[d].range());
		}
		else
			if (d == "t0t60 mph(s)" && _.contains(toggleArray, d)){
			//console.dir(popt[d][0]);

			y[d] = y[d].domain(popt[d][0])
				       .range([height, height*.90, height*.10,  0]);
			console.dir("range", y[d].range());
		}

		else{
			y[d].domain(d3.extent(cars, function(datapoint){ return +datapoint[d];}))
			           .range([height, 0]);
		}

	  }
	  
	}


	background = svg.append("g").attr("class", "background")
	                            .selectAll("path").data(cars)
	                            .enter().append("path").attr("d", path);

	foreground = svg.append("g").attr("class", "foreground")
	                            .selectAll("path").data(cars)
	                            .enter().append("path").attr("d", path);

	var g = svg.selectAll(".dimension").data(dimensions)
	           .enter().append("g").attr("class", "dimension")
	           .attr("transform", function(d){return "translate("+x(d)+")";});

	

	g.append("g").attr("class", "axis")
	             .each(function(d){ /*d=dim_name*/
	             	if (d == "weight (lb)"){
             			d3.select(this).call(d3.axisLeft().scale(y[d]));

	             	}else
	             		d3.select(this).call(d3.axisLeft().scale(y[d]));
	             })
	             .append("text").style("text-anchor", "middle").attr("y", -9)
	             .text(function(d){ return d; });
}


