function buildParallelCoordinates(data, popt, toggleArray){
	var margin = {top: 50, right: 50, bottom: 50, left: 50},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;
	
	var x = d3.scalePoint().range([0, width]),
		y = {},
		yy = {},
		dragging = {};

	var line = d3.line(),
	    axis = d3.axisLeft(),
	    background,
			foreground;
	
	var categories = _.uniq(_.pluck(data, "category")),
			numOfCategories = categories.length,
			bbHeight = height / numOfCategories;
			alpha = .20, // distance between two secondary axes
			beta = 0.5; // scale down factor to accomodate all categories
	
	var gamma = 0.25; // cpx points. represents 25% of space between secondary and nearest primary axis (max curviness is 0.25)

	var groups = _.groupBy(data, function(d){ return d['category'];});

	// Extract the list of dimensions and create a scale for each.
	x.domain(dimensions = d3.keys(data[0]).filter(function(d) {
		return d != "name" && 
		(y[d] = d3.scaleLinear()
			.domain(d3.extent(data, function(p) { return +p[d]; }))
			.range([height, 0])) && 
			(yy[d] = d3.scaleLinear())}).slice(0,-1));
									
	
			var disBetAxes = x(dimensions[1]) - x(dimensions[0]);
	
			var leftOffset = disBetAxes*(1-alpha)/2,
			bottomOffset = 0.45*bbHeight,
			nextOffset = disBetAxes*alpha,
			lineSize = 0.500*bbHeight;

			
	var svg = d3.select("body").append("svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom)
		  .append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");		

	
			
			for (var dimIdx = 0; dimIdx < dimensions.length; dimIdx++) {
				var cDim = dimensions[dimIdx];

				var path  = d3.path(),
						path2 = d3.path();
				
				var ypos     = bottomOffset;
				var yscales  = [];
				for (var catIdx = 0; catIdx < numOfCategories; catIdx++){

						var catFiltered = _.filter(data, function(d) {
							return d.category === categories[catIdx];
						});
						
						catFiltered = _.pluck(catFiltered, cDim);

						yscales.push(d3.scaleLinear()
															.domain([_.max(catFiltered), _.min(catFiltered)])
															.range([ypos, ypos+lineSize]));

						if (dimIdx !== dimensions.length-1) { // dont make Wis and Wi+1 for last dim
							path.moveTo(x(cDim)+leftOffset, ypos);
							path2.moveTo(x(cDim)+leftOffset+nextOffset, ypos);
							ypos = ypos + lineSize;
							path.lineTo(x(cDim)+leftOffset, ypos);
							path2.lineTo(x(cDim)+leftOffset+nextOffset, ypos);
						}else{
							ypos = ypos + lineSize;
						}

						ypos = ypos + bottomOffset;
						
				}

				yy[cDim] = yscales;
				
				svg.append("path").attr("d", path).attr("stroke", "#000");
				svg.append("path").attr("d", path2).attr("stroke", "#000");


			}


	  // Add grey background lines for context.
	  background = svg.append("g")
		  .attr("class", "background")
		.selectAll("path")
		  .data(data)
		.enter().append("path")
		  .attr("d", path3);
	
	
	var blues = d3.scaleOrdinal(d3.schemeDark2);
	  // Add blue foreground lines for focus.
	  foreground = svg.append("g")
		  .attr("class", "foreground")
		.selectAll("path")
		  .data(data)
		.enter().append("path")
		.attr('style', function(d) {
			return "stroke: " + blues(categories.indexOf(d.category));
		})
		  .attr("d", path3);
	
	  // Add a group element for each dimension.
	  var g = svg.selectAll(".dimension")
		  .data(dimensions)
		.enter().append("g")
		  .attr("class", "dimension")
		  .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
		  .call(d3.drag()
			.subject(function(d) { return {x: x(d)}; })
			.on("start", function(d) {
			  dragging[d] = x(d);
			  background.attr("visibility", "hidden");
			})
			.on("drag", function(d) {
			  dragging[d] = Math.min(width, Math.max(0, d3.event.x));
			  foreground.attr("d", path3);
			  dimensions.sort(function(a, b) { return position(a) - position(b); });
			  x.domain(dimensions);
			  g.attr("transform", function(d) { return "translate(" + position(d) + ")"; });
			})
			.on("end", function(d) {
			  delete dragging[d];
			  transition(d3.select(this)).attr("transform", "translate(" + x(d) + ")");
			  transition(foreground).attr("d", path3);
			  background
				  .attr("d", path3)
				.transition()
				  .delay(500)
				  .duration(0)
				  .attr("visibility", null);
			}));
			
	  // Add an axis and title.
	  g.append("g")
		  .attr("class", "axis")
		  .each(function(d) { d3.select(this).call(axis.scale(y[d])); })
		.append("text")
			.style("text-anchor", "middle")
			.attr("y", -5)
			.attr("stroke", "#000")
		  .text(function(d) { return d; });
	
			g.append("g")
			.attr("class", "brush")
			.each(function (d) {
					d3.select(this).call(d.brush = d3.brushY()
							.extent([[-10, 0], [10, height]])
							.on("start", brushstart)
							.on("brush", brush)
							.on("end", brush));
			})
			.selectAll("rect")
			.attr("x", -8) /* cross hair render start -8 in the x-direction */
			.attr("width", 16);/* renders to the cross-hair area */


	function position(d) {
	  var v = dragging[d];
	  return v == null ? x(d) : v;
	}
	
	function transition(g) {
	  return g.transition().duration(500);
	}
	
	// Returns the path for a given data point.
	function path3(d) {
		
		var path = d3.path();
		var linePoints = [];
		var categoryIdx = categories.indexOf(d.category);
		var cDim, nDim;

		for (var dimIdx = 0; dimIdx < dimensions.length - 1; dimIdx++){
				cDim = dimensions[dimIdx];
				nDim = dimensions[dimIdx+1];

				path.moveTo(x(cDim), y[cDim](d[cDim]));

				var cpx1 = x(cDim) + leftOffset*gamma,
						cpx2 = x(cDim) + leftOffset -leftOffset*gamma;
				path.bezierCurveTo(cpx1, y[cDim](d[cDim]), cpx2, yy[cDim][categoryIdx](d[cDim]), x(cDim)+leftOffset, yy[cDim][categoryIdx](d[cDim]));

				path.lineTo(x(cDim)+leftOffset+nextOffset, yy[nDim][categoryIdx](d[nDim]));

				cpx = x(nDim) - leftOffset*gamma;
				path.bezierCurveTo(cpx, y[nDim](d[nDim]), cpx, y[nDim](d[nDim]), x(nDim), y[nDim](d[nDim]));
		}
		return path;
	}
	
	function brushstart() {
	  d3.event.sourceEvent.stopPropagation();
	}
	
	

	function brush(){
		var actives = [];

		svg.selectAll(".dimension .brush")
				.filter(function(d){
						return d3.brushSelection(this);
				})
				.each(function(d){
						actives.push({
								dimension: d,
								extent: d3.brushSelection(this)
						});
				});

		foreground.style("display", function(d){

				return actives.every(function (active) {
						var dim = active.dimension;
						var ex  = active.extent;

						// NOTE: extent stays in opposite direction
						return d[dim] <= y[dim].invert(ex[0]) && d[dim] >= y[dim].invert(ex[1]);
				}) ? null : "none";
		});
}


}