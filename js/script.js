//Full data
//https://data.seattle.gov/Public-Safety/Seattle-Police-Department-911-Incident-Response/3k2p-39jp

(function (app, window, d3, undefined) {
  "use strict";
  var svg = d3.select('#barChart')
      .append('svg'),
    margin = {top: 20, right: 20, bottom: 30, left: 40},
    width,// = +svg.attr("width") - margin.left - margin.right,
    height,// = +svg.attr("height") - margin.top - margin.bottom,
    g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
    barChartData,
    rawData;

  var pullData = function(callback) {
    d3.tsv("data/consolidatedHistory.tsv")
      .row(function (d) {
        return {
          year: +d.year,
          month: +d.month,
          eventGroup: d.eventGroup,
          count: +d.count
        };
      })
      .get(function (data){
        console.log(data.length);
        
        rawData = data;
        app.topData();

        resizeChart();
      });
  };

  //Update
  var redrawChart = function () {
    console.log("--------------------------------------");
    console.time("draw");
    var data = barChartData;

    var x = d3.scaleBand()
      .rangeRound([0, width - 75])
      .padding(0.1)
      .align(0.1);

    var y = d3.scaleLinear()
      .rangeRound([height - 50, 0]);
    
    var z = d3.scaleSequential(d3.interpolateMagma);

    var stack = d3.stack();

    var nestedData = d3.nest()
      .key(function (d) { return d.year; })
      .sortKeys(d3.ascending)
      .key(function (d) { return d.eventGroup; })
      .rollup(function (leaves) {
        return leaves.map(function (leaf) { return leaf.count; }).reduce(function (a,b) { return a + b; });
      })
      .entries(data);

    //Flatten the array
    var flattenedKeys = [].concat.apply([], nestedData.map(function (d) { return d.values; }));

    var keys = d3.set(flattenedKeys.map(function (d) { return d.key })).values();

    var yearlyValues = nestedData.map(function (d) { return d.values.map(function (leaf) { return leaf.value }).reduce(function (a,b) { return a+b; }) });

    x.domain(nestedData.map(function(d) { return d.key; }));
    y.domain([0, d3.max(yearlyValues)]).nice();
    z.domain([0, keys.length]);

    var newRows = nestedData.map(function (d) { 
      var result = { year: d.key  };

      keys.forEach(function (overallCategory) {
        var categoryInYear = d.values.filter(function(category) { return category.key === overallCategory; });

        result[overallCategory] = categoryInYear.length ? categoryInYear[0].value : 0;
      });

      return result; 
    });

    console.log("normalized", newRows);

    var categoryData = g.selectAll(".category")
      .data(stack.keys(keys)(newRows));

    var rectData = categoryData.enter().append("g")
        .attr("class", "category")
        .attr("fill", function(d) { return z(keys.indexOf(d.key)); })
      .selectAll("rect")
      .data(function(d) { return d; });


    rectData.enter().append("rect")
        .attr("x", function(d) { return x(d.data.year); })
        .attr("y", function(d) { return y(d[1]); })
        .attr("height", function(d) { return y(d[0]) - y(d[1]); })
        .attr("width", x.bandwidth());

    categoryData.exit()
        .remove();
    d3.selectAll("g.axis").remove();

    g.append("g")
        .attr("class", "axis axis-x")
        .attr("transform", "translate(0," + (height - 50) + ")")
        .call(d3.axisBottom(x));

    g.append("g")
        .attr("class", "axis axis-y")
        .call(d3.axisLeft(y).ticks(10, "s"))
      .append("text")
        .attr("x", 2)
        .attr("y", y(y.ticks(10).pop()))
        .attr("dy", "0.35em")
        .attr("text-anchor", "start")
        .attr("fill", "#000")
        .text("Incidents");

    var legendData = g.selectAll(".legend")
      .data(keys.reverse());
      
    var legend = legendData
      .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(-40," + i * 20 + ")"; })
        .style("font", "10px sans-serif");

    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", function (d) { return z(keys.indexOf(d)); });

    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .text(function(d) { return d; });

    legendData.exit()
        .remove();

    console.timeEnd("draw");
  };

  var resizeChart = function () {
    //Bar Chart
    width = parseInt(d3.select('#barChart').style("width"), 10) - margin.left - margin.right;
    height = parseInt(d3.select('#barChart').style("height"), 10) - margin.top - margin.bottom;

    svg.attrs({width: width, height: height});

    redrawChart();
  };

  app.rawData = function () {
    barChartData = rawData;

    console.log("raw size", rawData.length);
  };

  app.topData = function () {
    var topData = [];

    var nestedData = d3.nest()
      .key(function (d) { return d.eventGroup; })
      .sortKeys(d3.ascending)
      .rollup(function (leaves) {
        return leaves.map(function (leaf) { return leaf.count; }).reduce(function (a,b) { return a + b; });
      })
      .entries(rawData);

    var sortedCategories = nestedData.sort(function (x, y) {
      return d3.descending(x.value, y.value);
    })

    var topCategories = sortedCategories.slice(0, 10).map(function (d) { return d.key; });

    console.log("top categories", topCategories);

    for (var i = 0; i < rawData.length; i++) {
      if (topCategories.indexOf(rawData[i].eventGroup) >= 0) {
        topData.push(rawData[i]);
      }
    }

    console.log("top size", topData.length);

    barChartData = topData;
  };
  
  app.bindHandlers = function () {
    d3.select(".raw-data")
      .on("click", function () {
        app.rawData();
        redrawChart();
        d3.select(this).classed("hide", true);
        d3.select(".top-data").classed("hide", false);
      });

    d3.select(".top-data")
      .on("click", function () {
        app.topData();
        redrawChart();
        d3.select(this).classed("hide", true);
        d3.select(".raw-data").classed("hide", false);
      });

    d3.select(window)
      .on('resize', resizeChart);
  };

  app.bindHandlers();
  pullData(redrawChart);

})(window.app = window.app || {}, window, d3);