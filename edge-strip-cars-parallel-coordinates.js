function buildParallelCoordinatesStrip(data, popt, toggleArray){

    var margin = {top: 60, right: 10, bottom: 10, left: 30},
    width = 960 - margin.left - margin.right,
    height = 700 - margin.top - margin.bottom;
	var x = d3.scalePoint().range([0, width]),
	    y = {};

	var line = d3.line(),
		axis = d3.axisLeft(),
		alphaScaling = 0.75,
	    background,
			foreground;
			
			

	var clusterScale = 0.15;
	$("#mainSvgID").remove();
	var svg = d3.select("body").append("svg").attr("id","mainSvgID")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var dimensions  = d3.keys(data[0]);
	dimensions = ["displacement (cc)", "power (hp)", "weight (lb)", "economy (mpg)"];
	var color_selection = "displacement (cc)";
	var color_choices = ['red', 'blue', 'green'];
	
	x.domain(dimensions);

	var clusters = {
		"displacement (cc)":[{"min": 68, "max": 120},{"min": 121, "max": 300},{"min": 301, "max": 455}],
		"power (hp)":[{"min": 46, "max": 100},{"min": 101, "max": 150},{"min": 151, "max": 175},{"min": 176, "max": 230}],
		"weight (lb)":[{"min": 1613, "max": 1800},{"min": 1801, "max": 2500},{"min": 2501, "max": 5140}],
		"economy (mpg)":[{"min": 9, "max": 15},{"min": 16, "max": 35},{"min": 36, "max": 46.6}]
	};
	

	var stats = {};
	var maxCount = -1;

	for (var i = 0; i < dimensions.length; i++){
		var d       = dimensions[i];
		var cluster = clusters[d];
		stats[d]    = []; // hold clusters for each dimension d

		var points = _.pluck(cars, d);
		points     = _.unique(points);
		points     = _.sortBy(points, function(p){return +p;});
		

		for (var j = 0; j < cluster.length; j++){
			var c = cluster[j];
			var clusterCount = _.filter(points, function(row){
				return row >= c.min && row <= c.max;
			}).length;

			stats[d].push({
				min: c.min, max: c.max, mean: (c.min+c.max)/2, count: clusterCount
			});

			if (maxCount < clusterCount) maxCount = clusterCount;
		}
		
		for (j = 0; j < cluster.length; j++){
			stats[d][j].maxCount = maxCount;
		}

		y[d] = d3.scaleLinear();
		y[d].domain(d3.extent(cars, function(datapoint){ return +datapoint[d];}))
			.range([height, 0]);
	  
	}
	// first hold max and min in the loop above. then loop again to calculate opacity(count)
	for (i = 0; i < dimensions.length-1; i++){
		var d = dimensions[i],
			nd = dimensions[i+1];
		var cluster = clusters[d],
			ncluster = clusters[dimensions[i+1]];
			var max = -1;
		for(var j = 0; j < cluster.length; j++){ // loop on current dimension's clusters
			var visited = false;
			stats[d][j].tentaclesc = [];
			
			for (var k = 0; k < ncluster.length; k++){  // loop over clusters of next dimension

				var points = _.filter(cars, function(row){
					return (row[d] >= stats[d][j].min && row[d] <= stats[d][j].max) &&
							(row[nd] >= stats[nd][k].min && row[nd] <= stats[nd][k].max);
				});
				
				stats[d][j].tentaclesc.push(points.length);
				
				if (max < points.length) max = points.length;
			}

			if (!visited){
				stats[d][j].tentacles = _.map(stats[d][j].tentaclesc, function(tm){ return tm/max;});
				visited = true;
			}

			
		}

	}

	var points = dimensions.map(function(p){
		return [x(p), y[p](data[p])];
	});

	var r_axis = 0.10*(points[1][0] - points[0][0]),
	l_axis = 0.90*(points[1][0] - points[0][0]);

	
	function drawClusterPolygon(data_axis, bundle_axis, bezier_cpx, moveTox, dimIdx, clustIdx, color){ 
		var path = d3.path();
		path.moveTo(moveTox, data_axis.max);
		path.bezierCurveTo(bezier_cpx, data_axis.max, bezier_cpx, bundle_axis.max, moveTox+r_axis, bundle_axis.max);
		path.lineTo(moveTox+r_axis, bundle_axis.min);
		path.bezierCurveTo(bezier_cpx, bundle_axis.min, bezier_cpx, data_axis.min, moveTox, data_axis.min);
		
		path.closePath();

		foreground = svg.append("g");
		foreground.attr("class", "foreground d-"+dimIdx+"_ct"+clustIdx)
		.append("path").attr("d", path).attr("style", "opacity:"+alphaScaling*data_axis.countRatio+"; fill: "+color);
		$(".d-"+dimIdx+"_ct"+clustIdx).on('click', function(e){console.log('hello '+dimensions[dimIdx]+clustIdx);});
	}


	function drawLeftmostClusters(clusterData, dim, dimIdx, clustIdx, color){
		
		var data_axis = clusterData[0];
		var bundle_axis = clusterData[1];

		var bezier_cpx = x(dim) + r_axis/2;
		var moveTox = x(dim);

		drawClusterPolygon(data_axis, bundle_axis, bezier_cpx, moveTox, dimIdx, clustIdx, color);
	}

	function drawLeftClustersToNextDimension(clusterData, dim, dimIdx, clustIdx, color){
		var bundle_axis  = clusterData[1];
		var data_axis    = clusterData[0];

		var bezier_cpx = x(dim) - r_axis/2;
		var moveTox    = x(dim) - r_axis;

		var path = d3.path();
		path.moveTo(moveTox, bundle_axis.max);
		path.bezierCurveTo(bezier_cpx, bundle_axis.max, bezier_cpx, data_axis.max, moveTox+r_axis, data_axis.max);
		path.lineTo(moveTox+r_axis, data_axis.min);
		path.bezierCurveTo(bezier_cpx, data_axis.min, bezier_cpx, bundle_axis.min, moveTox, bundle_axis.min);
		
		path.closePath();

		foreground = svg.append("g");
		foreground.attr("class", "foreground d-"+dimIdx+1+"_ct"+clustIdx)
		.append("path").attr("d", path).attr("style", "opacity:"+alphaScaling*data_axis.countRatio+"; fill: "+color);
		$(".d-"+dimIdx+1+"_ct"+clustIdx).on('click', function(e){console.log('hello '+dim+clustIdx);});
	}

	function utility(dimIdx, clustIdx) {
		var thisAndNextDimension = [];

		var dim = dimensions[dimIdx]; 
		var nextdim = dimensions[dimIdx+1];

		var scale = y[dim];
		var mean = scale(stats[dim][clustIdx].mean),
			max = scale(stats[dim][clustIdx].max),
			min = scale(stats[dim][clustIdx].min);

		var bmax = mean + clusterScale * (max - mean),
			bmin = mean + clusterScale * (min - mean),
			bmean = (bmax + bmin)/2;

		var data_axis = {mean: mean, max: max, min:min, count: stats[dim][clustIdx].count, 
						countRatio:stats[dim][clustIdx].count/stats[dim][clustIdx].maxCount,
						tentacles:stats[dim][clustIdx].tentacles};
		var bundle_axis = {max: bmax, min:bmin, mean:bmean, 
						   count: stats[dim][clustIdx],
						   countRatio:stats[dim][clustIdx].count/stats[dim][clustIdx].maxCount,
						   tentacles:stats[dim][clustIdx].tentacles};
		

		return [[data_axis, bundle_axis]];
	}

	function drawLeftClustersTentacles(bundle_axis, nbundle_axis, dim, ndim, clustIdx, nClustIdx, dimIdx, color){
		var opacity = bundle_axis.count;

		var bezier_cpx = x(dim) + l_axis/2;
		var moveTox = x(dim) + r_axis;

		var path = d3.path();
		path.moveTo(moveTox, bundle_axis.max);
		path.lineTo(moveTox+l_axis-r_axis, nbundle_axis.max);
		path.lineTo(moveTox+l_axis-r_axis, nbundle_axis.min);
		path.lineTo(moveTox, bundle_axis.min);
		
		path.closePath();

		foreground = svg.append("g");
		foreground.attr("class", "foreground d-"+dimIdx+"_ct"+clustIdx+"_nct"+nClustIdx)
				  .append("path").attr("d", path).attr("style", "opacity: "+alphaScaling*bundle_axis.tentacles[nClustIdx]+"; fill: "+color);
		$(".d-"+dimIdx+"_ct"+clustIdx+"_nct"+nClustIdx).on('click', function(e){console.log('hello '+dim+clustIdx+" "+nClustIdx);});
	}


	var visitedDim = [];
	function path_cluster(dimIdx, clustIdx){
		// contains array [currentdim, nextdim]. currentdim/nextdim = [dataaxis, bundleaxis]
		// dataaxis/bundleaxis = {mean: mean2, max: max2, min:min2, count:c/maxcount}
		var clusterData  = utility(dimIdx, clustIdx); 

		var nClusters = stats[dimensions[[1+dimIdx]]];
		for (var i = 0; i < nClusters.length; i++){
			var n = nClusters[i];
			
			var scale = y[dimensions[1+dimIdx]];
			var mean = scale(n.mean),
				max = scale(n.max),
				min = scale(n.min);

			var bmax = mean + clusterScale * (max - mean),
				bmin = mean + clusterScale * (min - mean),
				bmean = (bmax + bmin) / 2;
			
			var pscale = y[dimensions[dimIdx]];
			var pmean = clusterData[0][0].mean,
				pmax = (clusterData[0][0].max),
				pmin = (clusterData[0][0].min);
	
			var pbmax = pmean + clusterScale * (pmax - pmean),
				pbmin = pmean + clusterScale * (pmin - pmean),
				pbmean = (pbmax + pbmin) / 2;
			
			var bundleAxis = [
				{	
					mean: pbmean, max: pbmax, min: pbmin, count: clusterData[0][0].count, 
					countRatio: clusterData[0][0].countRatio, tentacles:clusterData[0][0].tentacles 
				},
				{   
					mean: bmean,  max: bmax,  min: bmin,  count: clusterData[0][0].count, 
					countRatio: clusterData[0][0].countRatio, tentacles:clusterData[0][0].tentacles
				}
			];
			
			if(dimIdx==0)
				var color = color_choices[clustIdx];
			else {
				// perform color blending
			}
			
			drawLeftClustersTentacles(bundleAxis[0], bundleAxis[1], dimensions[dimIdx], dimensions[dimIdx+1], clustIdx, i, dimIdx, color);
			if(!_.contains(visitedDim, dimIdx)){

				if (dimIdx === 0) {
					
					var color;
					// gives count of datapoints coming from dimIdx, clustIdx to clustIdx of next dim in tentaclesc
					for (var k = 0; k < clusters[dimensions[dimIdx]].length; k++){
						var count = stats[dimensions[dimIdx]][clustIdx].tentaclesc[i]; 
						var clusterColor = d3.color(color_choices[k]);
						debugger;
						console.log(count*clusterColor.r/255);
					}
					
					var color = 'purple';
					debugger;
					
				}

				drawLeftClustersToNextDimension([
					{mean: mean, max: max, min: min, countRatio:n.count/n.maxCount},
					{mean:bmean, max:bmax, min:bmin, countRatio:n.count/n.maxCount}], 
					dimensions[dimIdx+1], dimIdx, clustIdx, color);
			
			}
		}
		visitedDim.push(dimIdx);
		if(dimIdx === 0)
			var color = color_choices[clustIdx];

		drawLeftmostClusters(clusterData[0], dimensions[dimIdx], dimIdx, clustIdx, color);
		
	}
	
	for (i = 0; i < dimensions.length-1; i++){
		var d = dimensions[i];
		var s = stats[d];
		for (var j = 0; j < s.length; j++){
			path_cluster(i, j);
		}
	}
	
	var g = svg.selectAll(".dimension").data(dimensions)
	           .enter().append("g").attr("class", "dimension")
						 .attr("transform", function(d){return "translate("+x(d)+")";});
						 
    var l_g =	svg.selectAll(".dimension-r").data(dimensions)
	           .enter().filter(function(d){
							return x(d) < width;
						}).append("g").attr("class", "dimension-r")
						 .attr("transform", function(d){return "translate("+(x(d)+r_axis)+")";});
						 
	var r_g = svg.selectAll(".dimension-l").data(dimensions)
	           .enter().filter(function(d){
							return x(d) < width;
						}).append("g").attr("class", "dimension-l")
	           .attr("transform", function(d){return "translate("+(x(d)+l_axis)+")";});

	

	g.append("g").attr("class", "axis")
	             .each(function(d){ /*d=dim_name*/
             			d3.select(this).call(d3.axisLeft().scale(y[d]));
	             })
	             .append("text").style("text-anchor", "middle").attr("y", -9)
							 .text(function(d){ return d; });
							 
	l_g.append("g").attr("class", "axis")
								.each(function(d){ /*d=dim_name*/
										d3.select(this).call(d3.axisRight().scale(y[d]));
								})
								.attr("class", "b-left");
							 
	r_g.append("g").attr("class", "axis")
								.each(function(d){ /*d=dim_name*/
										d3.select(this).call(d3.axisLeft().scale(y[d]));
								})
								.attr("class", "b-right");
}


