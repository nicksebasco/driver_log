var graph = (function(){
  var ref_dataset = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,4,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,1,1,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,4,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2];
  var colors = {
    grid: "#ef5350"
  };
  // attributes for postioning the graph on the canvas
  var attributes = {
    leftPadding:   100,
    topPadding:    25,
    row_dialation: 1.1,
    y_labs: ["OFF DUTY","SLEEPER BERTH","DRIVING","ON DUTY"]
  };
  // helper methods
  var helpers = {
    convert_time: function(t){
      if(!t){
        return "12 am";
      }
      return t <= 12 ? String(t): String(t-12);
    },
    gen_random_data: function(){
      return ref_dataset.map(function(i){
        return Math.floor(Math.random()*4)+1;
      });
    }
  };
  // event state of the canvas
  var status = {
    point   :null,  // stores point info
    active  :false, // is there a point actively being clicked (probably redundant)
    drag    :false, // is a point being dragged
    selected:false, // is multiselect being used
    down    :false, // is the mouse being pressed down
    x       :0,     // x0, used by multiselect
    y       :0,     // y0, used by multiselect
    points  :[],     // points that have been selected
    dataset_not: [],
    reset: function(ds){
      this.points = null;
      this.active = false;
      this.drag = false;
      this.selected = false;
      this.down = false;
      this.x = 0;
      this.y = 0;
      this.points = [];
      this.dataset_not = ds.slice(0);
    }
  };
  // pont fitting state of canvas
  var state = {
    index: 0,
    data : [],
    add  : function(set){
            // maybe modify so that it only toggles between fitted data, and last unfitted
            this.index++;
            this.data.push(set);
    }
  };
  // initialize the interface with a dataset, a fixed with, fixed height, and an id.
  function initialize(dataset,w,h,id){
    var parent = document.getElementById("canvas-container");
    var old_canvas = parent.getElementsByTagName('canvas');
    if(parent){
      // if a canvas has already been loaded, delete it
      if(old_canvas.length){
        parent.removeChild(old_canvas[0]);
        status.reset(dataset);
      }

      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      var c = {
        dataset: dataset,
        w: w,
        h: h,
        id: id,
        cnv: canvas,
        ctx: ctx
      };

      // set canvas attributes
      canvas.id = id || "cnv";
      canvas.width  = w || parseFloat(parent.width)  || 0;
      canvas.height = h || parseFloat(parent.height) || 0;
      parent.appendChild(canvas);

      // setup dataset_not
      status.dataset_not = dataset.slice(0);
      // add 97th point, this will be equal to the first point (12am === 12am).
      // dataset.push(dataset[0]);

      /*

      *** canvas events ***

      */

      var cnv = c.cnv;
      var displ_pos = function(point){

        var show_time = function(t){
          var time = Math.abs(  (24* (t*15)/(24*60)) ), min;
          if(Math.floor(time) === 12 || Math.floor(time) === 0){
            min = (parseFloat(time)-parseInt(time))*60;
            min = min?":"+min:0;
            return Math.abs(  (24* ((t+1)*15)/(24*60)) ) > 12 ? 12 +min+ " pm": 12 +min+ " am";
          }
          else if(time<12){
            min = (parseFloat(time)-parseInt(time))*60;
            return !min? time + " am": parseInt(time)+":"+min+ " am";
          }
          else{
            var time2 = Math.abs( 12- (24* (t*15)/(24*60)) );
            min = (parseFloat(time2)-parseInt(time2))*60;
            return  !min? parseInt(time2)+ " pm": parseInt(time2)+":"+min+ " pm";
          }
        };

        $("#xval").val(show_time(point[0]));
        $("#yval").val(attributes.y_labs[point[1]-1]);
      };

      $('#'+id).on("mousedown",function(e){

        var x = e.clientX - cnv.offsetLeft,
        y = e.clientY - cnv.offsetTop,
        r = 2,
        err = 1.5;

        // sub-method that determines if user has clicked on point
        var clicked = transform( dataset,Math.floor( (w-attributes.leftPadding) /24),Math.floor(h/(4*1.1)) ).filter(function(points){
            var withinX = x >= (points[0] - 2-err) && x<= (points[0] + 2+err);
            var withinY = y >= (points[1] - 2-err) && y<= (points[1] + 2+err);
            return withinX && withinY;
        });

        // update event state
        status.down = true;
        status.x    = x;
        status.y    = y;

        if(clicked.length > 0){
          status.active = true;
          status.point = clicked[0];
          // change cursor css to pointer
          $('#'+id).css("cursor","pointer");
          // dialate the point and change its color
          draw_point(ctx,status.point[0],status.point[1],"#FF1654",3);
          // display x and y values in control form
          displ_pos([get_index(status.point,Math.floor( (w-attributes.leftPadding) /24),100), get_y(status.point,Math.floor( (w-attributes.leftPadding) /24),25)]);
          // status.points.push(point);
        }
        else{
          status.selected = false;
          status.points = [];
          plot_coords(c.id,ctx,w,h,dataset);
        }
      });

      $('#'+id).on("mouseup",function(){

        status.active = false;
        status.down = false;
        status.dataset_not = dataset.slice(0); // reset dataset_not
        plot_coords(c.id,ctx,w,h,dataset); // update graph

        if(status.selected){

          if(!status.drag){
            // if multiple points have been selected and they are not being dragged, redraw points with "selected style"
            for(var j = 0; j< status.points.length; j++){
              draw_point(ctx,status.points[j][0],status.points[j][1],"#FF1654",3);
            }
          }
          else{
            // this block fixed the moving bug
            status.selected = false;
            status.points = [];
          }

          status.drag = false; // drag only gets reset if selected.
        }

        console.log(dataset.length); // removeMe
        $('#'+id).click();  // click canvas to "reset" point value, this probably shouldn't be here
        $('#'+id).css("cursor","auto"); // reset canvas cursor

      });

      $('#'+id).on("mousemove",function(e){

        var x = e.clientX - cnv.offsetLeft,
        y = e.clientY - cnv.offsetTop,
        r = 2,
        err = 0.6, // is err needed in this scope?
        idx;

        // If the mouse is being pressed down, If there is a point currently being clicked on, If there are selected points.
        if ( status.active && status.down && status.selected ){
          /*
          Iterate through all of the selected points, modify the dataset such that the selected points are undefined and will not
          render on the graph, do this in a temporary dataset (dataset_not) so that the original dataset is not mutated in an
          irrecoverable way.
          */
          for(var k = 0; k< status.points.length; k++){
            var tmp_point = status.points[k];
            idx = get_index(tmp_point,Math.floor( (w-attributes.leftPadding) /24),100);
            dataset[idx] = get_y([x,y],Math.floor( (w-attributes.leftPadding) /24),25);
            status.dataset_not[idx] = undefined;
          }
          plot_coords(id,ctx,w,h,status.dataset_not); // plot data with dataset_not.
          status.drag = true; // tell status that the point is being dragged.
          draw_point(ctx,x,y,"#FF1654",3); // draw a point to trail the cursor.
          displ_pos([idx,dataset[idx]]);       // display the points info in the display bar.

        }
        // If there is a single point actively being clicked.
        else if(status.active){

          idx = get_index(status.point,Math.floor( (w-attributes.leftPadding) /24),100);
          dataset[idx] = get_y([x,y],Math.floor( (w-attributes.leftPadding) /24),25);
          status.dataset_not[idx] = undefined;
          plot_coords(id,ctx,w,h,status.dataset_not);

          draw_point(ctx,x,y,"#FF1654",3); // draw a point to trail the cursor.
          displ_pos([idx,dataset[idx]]);       // display the points info in the display bar.

        }
        // If the mouse is being held down and moving over the canvas.
        else if (status.down){

          plot_coords(id,ctx,w,h,status.dataset_not); // re-plot the coordinates
          selection(ctx,status,x,y);        // call graph's selection method (rsponsible for creating the selection rectangle).

          /*
            modified version of clicked array analogous to the one used in the mousedown function;however, this function uses the
            dimensions of the selection box rather than the x,y position of the user's click.
          */
          var clicked = _.filter( transform( dataset,Math.floor( (w-attributes.leftPadding) /24),Math.floor(h/(4*1.1))) ,function(points){
            var withinX, withinY;
            if(x > status.x){
              withinX = x >= (points[0] - 2-err) && status.x<= (points[0] + 2+err);
              if(y > status.y){
                withinY = y >= (points[1] - 2-err) && status.y<= (points[1] + 2+err);
                return withinX && withinY;
              }
              else{
                withinY = status.y >= (points[1] - 2-err) && y<= (points[1] + 2+err);
                return withinX && withinY;
              }
            }
            else{
                withinX = status.x >= (points[0] - 2-err) && x<= (points[0] + 2+err);
                if(y > status.y){
                  withinY = y >= (points[1] - 2-err) && status.y<= (points[1] + 2+err);
                  return withinX && withinY;
                }
                else{
                  withinY = status.y >= (points[1] - 2-err) && y<= (points[1] + 2+err);
                  return withinX && withinY;
                }
            }
          });
          // if any points lie with the selection area:
          if(clicked.length){
            clicked.forEach(function(p){
              draw_point(ctx,p[0],p[1],"#FF1654",3); // redraw all points with selection styling
              status.points.push(p);                       // add points selection aray
            });
            status.selected = true; // update canvas event object so that it knows multiple points have been selected.
          }
        } // end else if

      });

      /*

      *** control events ***

      */

      // fit new data points to reference ine
      $('#fit_points').click(function(){
        if ($(this).prop('checked') ){
          state.add(dataset.slice(0));
          dataset = ref_dataset.slice(0);

        }
        else{
          dataset = state.data[state.index-1];
        }

        plot_coords(id,ctx,w,h,dataset);
        // fixes a minor boolean glitch that occurs, this definitely needs to be changed
        $( '#'+c.id ).mousedown();
        $( '#'+c.id ).mouseup();

      });

      // add line to points that have been plotted
      $('#line_yes').click(function(){
        // the checkbox is checked
        if ($(this).prop('checked') ){
          var ds = transform(dataset,Math.floor( (w-attributes.leftPadding) /24),Math.floor(h/(4*1.1)));
          for(var i=0; i<ds.length-1; i++){
            var p1 = ds[i], p2 = ds[i+1];
            ctx.lineWidth = 4; //3
            ctx.strokeStyle = "#7986CB";
            ctx.beginPath();
            if(p1[1] === p2[1]){
              ctx.moveTo(p1[0],p1[1]);
              ctx.lineTo(p2[0],p2[1]);
            }
            else{
              ctx.moveTo(p1[0],p1[1]);
              ctx.lineTo(p2[0],p1[1]);
              ctx.moveTo(p2[0],p1[1]);
              ctx.lineTo(p2[0],p2[1]);
            }
            ctx.closePath();
            ctx.stroke();
          }
        }
        // the checkbox is not checked
        else{
          plot_coords(id,ctx,w,h,dataset);
        }
      });

      // post data to some server, need to implement this.
      $('#save_btn').click(function(){
        var server = "http://localhost:3000/controls"; // $$ server_name here $$
        // set up test server
        $.post( server , JSON.stringify(dataset) );
      });

      plot_coords(id,ctx,w,h,dataset);

      return c;
    }
    else{
      console.log("ERROR, no canvas container found.");
      return undefined;
    }

  }

  // this method will transform the dataset into a more useful form
  function transform(d,dx,dy){
    return d.map(function(v,i){
      return [i*(dx/4)+attributes.leftPadding,v*dy-dy/2+attributes.topPadding];
    });
  }
  // get the y value at a particular point
  function get_y(point,dy,dy2){
    var y = point[1];
    return Math.round( (y+dy/2-dy2)/(2*dy) )? Math.round( (y+dy/2-dy2)/(2*dy) ):1;
  }
  // get index of a point
  function get_index(point,dx,dx2){
    var x = point[0];
    return 4*(x-dx2)/dx;
  }
  // change data back to original form
  function reconstruct(d,dy,dy2){
    return d.map(function(v){
      return (v[1]+dy/2-dy2)/dy;
    });
  }
  // add badge to a text component
  function add_badge(ctx,x,y,w,h,color){
    ctx.fillStyle = color;
    ctx.fillRect(x,y,w,h);
  }
  // add label to the graph
  function add_label(ctx,x,y,text,color){
    ctx.fillStyle = color;
    ctx.font = "8px Arial"; // Andale Mono;
    ctx.fillText(text,x,y);
  }
  // add groupings(of 3) of tick marks
  function draw_tick(ctx,x,dx,y,sign){
    var tick_height = 5*sign;
    for( var i = 0; i<4; i++ ){
      if( i === 0 ){
        continue;
      }
      else if( i === 2 ){
        tick_height *= 1.5;
      }
      ctx.beginPath();
      ctx.moveTo(x+i*(dx/4)+attributes.leftPadding,y+attributes.topPadding);
      ctx.lineTo(x+i*(dx/4)+attributes.leftPadding,y+tick_height+attributes.topPadding);
      ctx.stroke();
      ctx.closePath();
      tick_height = sign*5;
    }
  }
  // plot a point at a certain x,y with a usr specified color
  function draw_point(ctx,x,y,color,ra){
    var r = ra || 2, theta0 = 0, thetaf = 2*Math.PI;
    ctx.strokeStyle = "black";
    ctx.lineWidth = "0.5";
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x,y,r,theta0,thetaf);
    ctx.stroke();
    ctx.fill();

    ctx.closePath();
    ctx.fillStyle = "black";
  }
  // refreshes canvas (re-draw grid, add reference line, plot all points in a dataset)
  function plot_coords(id,ctx,w,h,ds){
    // refersh canvas
    ctx.clearRect ( 0 , 0 , w , h );
    var offset = draw_grid(id,ctx,4,24);
    add_ref_data(ctx,w,h);
    // plot points
    for (var i = 0; i < ds.length; i++){
      if(ds[i]){
        draw_point(ctx,offset.dx2+(i*offset.dx/4), ds[i]*offset.dy-offset.dy/2+offset.dy2,"#FAFAFA"); //"#455A64"
      }
    }
  }
  // this method is used to select a grouping of points on the canvas
  function selection(ctx,d,x,y){
    ctx.lineWidth = 0.5;
    ctx.fillStyle = "rgba(236,239,241,.5)";
    ctx.strokeStyle = "black";
    ctx.fillRect(d.x,d.y,x-d.x,y-d.y);
    ctx.strokeRect(d.x,d.y,x-d.x,y-d.y);
  }
  // this method adds the background (reference line) to the canvas
  function add_ref_data(ctx,w,h){
    //ctx.clearRect ( 0 , 0 , w , h );
    //var offset = draw_grid("cnv",ctx,4,24);
    var ds = transform(ref_dataset,Math.floor( (w - attributes.leftPadding) /24),Math.floor(h/(4*1.1)));
    for(var i=0; i<ds.length-1; i++){

      var p1 = ds[i], p2 = ds[i+1];
      ctx.lineWidth = 4; //3
      ctx.strokeStyle = "#70C1B3";//"#212121";
      ctx.beginPath();
      if(p1[1] === p2[1]){
        ctx.moveTo(p1[0],p1[1]);
        ctx.lineTo(p2[0],p2[1]);
      }
      else{
        ctx.moveTo(p1[0],p1[1]);
        ctx.lineTo(p2[0],p1[1]);
        ctx.moveTo(p2[0],p1[1]);
        ctx.lineTo(p2[0],p2[1]);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  // draw a grid on the canvas
  function draw_grid(cid,ctx,rows,cols){
    var h = $( "#"+cid ).height(), w = $( "#"+cid ).width()-attributes.leftPadding, dx, dx2, dy, dy2;

    // calculate dx and dy
    dx = Math.floor( w/cols );
    dy = Math.floor( h/(rows*attributes.row_dialation) );

    // translate grid parameters
    dx2 = attributes.leftPadding;
    dy2 = attributes.topPadding;

    // set ctx properties
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 0.75;

    // add backgroud color to the grid
    var grid_bg = "#F3FFBD";//"rgba(236,239,241,.5)"; //"rgba(236,239,241,.5)";
    ctx.fillStyle = grid_bg;
    ctx.fillRect(dx2,dy2,w-9,h);

    for(var i = 0; i < cols; i++){
      // add time label to the graph
      if(!i || i === 12){
        add_label(ctx,i*dx+dx2-6,15, i===12?helpers.convert_time(i)+" pm":helpers.convert_time(i));
      }else{
        add_label(ctx,i*dx+dx2-2,15,helpers.convert_time(i),"black");
      }

      for(var j = 0; j<rows; j++){
        // add the y labels
        if(i===0){
          add_badge(ctx,dx2-85-10,j*dy+dy-15,90,22.5,"#7986CB");
          add_label(ctx,dx2-85,j*dy+dy,j+1+".  "+attributes.y_labs[j],"white");
        }
        ctx.moveTo(i*dx +dx2,j*dy +dy2);
        if(j<2){
          draw_tick(ctx,i*dx,dx,j*dy,1);
        }else{
          draw_tick(ctx,i*dx,dx,j*dy+dy,-1);
        }
        ctx.beginPath();
        ctx.lineTo(i*dx +dx +dx2, j*dy +dy2);
        ctx.lineTo(i*dx +dx +dx2, j*dy +dy+ dy2);
        ctx.lineTo(i*dx+dx2, j*dy +dy +dy2);
        ctx.lineTo(i*dx +dx2,j*dy +dy2);
        ctx.closePath();
        ctx.stroke();
      }
    }
    // return reference to delta x and delta y
    return {
      dx:dx,
      dy:dy,
      dx2:dx2,
      dy2:dy2
    };
  }
  return {
    randomData: helpers.gen_random_data, // generates a random dataset
    initialize: initialize, // initialize the canvas with a dataset
  };
})();
