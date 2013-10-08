/**
 * 
 * @class lore.ore.ui.ExplorePanel Panel to display explore view: visualisation of connections from repository 
 * @extends Ext.Panel
 */
lore.ore.ui.ExplorePanel = Ext.extend(Ext.Panel,{ 
   constructor: function (config){ 
        this.hideLabels = false;
        this.hideUnconnected = false,
        this.filterRels = {},
        this.edgeToolTip = new Ext.ToolTip({plain:true, showDelay: 100, title: 'Relationship type:'});
        Ext.apply(config, {
            menuHandler: "lore.ore.explorePanel.onTabMenu(event);",
            layout: "border",
            bodyCssClass: 'explorePanel',
            items: [
                {
                    region : "north",
                    //split: true,
                    id: "exploreHistory",
                    useSplitTips: true,
                    height: 28,
                    minHeight: 0,
                    style: 'position: relative; padding-bottom: 5px;',
                    bodyCssClass: 'exploreHistory'
                },{
                    region: "center",
                    id: "exploreinfovis",
                    forceLayout: true,
                    style: 'position: static; background-color: #FFFFFF; border: 1px solid; border-color: #D0D0D0;',
                    html: "<div id='infovis'></div>"
                }
            ]
        });
        lore.ore.ui.ExplorePanel.superclass.constructor.call(this, config);
        
        /*this.getComponent(0).on("resize",function(c,adjw, adjh, raww, rawh){
           try{
              if (this.fd) {  
                    var canv = this.fd.canvas;
                    var csize = canv.getSize();
                    var w = c.getWidth();
                    var h = c.getHeight();
                    // check if canvas is smaller than current window, if so, resize
                    // by an increment
                    if (csize.width < w || csize.height < h){
                        canv.resize(w + 300, h + 300);
                    } 
                    canv.getPos(true);
              }
           } catch (e){
              lore.debug.ore("Error in ExplorePanel",e);
           }
        },this);*/
        this.on("activate", this.updateContent);
        
        lore.ore.explorePanel = this;
        this.previewCanvas = document.createElement("canvas");
        this.colorKey = {
            "http://www.openarchives.org/ore/terms/aggregates": "#EEEEEE",
            "http://www.openarchives.org/ore/terms/isAggregatedBy": "#808080",
            "http://purl.org/dc/elements/1.1/relation": "#E3E851"
        },

        this.ckTemplate = new Ext.Template("<span style='font-size:smaller;border:0.5px solid black;background-color:{color};'>&nbsp;&nbsp;&nbsp;</span>&nbsp;&nbsp;{rel}",
            {compiled: true}
        );
        this.historyTemplate = new Ext.Template(
            "<span style='white-space:nowrap;'><a title='{tooltip}' href='javascript:void(0);' onclick='{action}'><img style='border:none' src='{icon}'></a>&nbsp;{name}</a></span>",
            {compiled: true}
        );
        this.colorKeyWin = new Ext.Window({ 
                closable: false,
                layout: 'anchor',
                closeAction: 'hide',
                animateTarget: 'remexploreview',
                width: 450,
                height: 200,
                autoScroll: true,
                title: "Explore View Options",
                items: [
                   {
                       xtype: 'fieldset',
                       title: 'Relationships',
                       defaultType: 'checkbox',
                       id: 'epRels',
                       defaults: {
                           hideLabel: true
                           
                       },
                       anchor: "-20"
                   },
                   {
                       xtype: 'fieldset',
                       title: 'View options',
                       defaultType: 'checkbox',
                       defaults: {
                           hideLabel: true
                       },
                       anchor: "-20",
                       items: [
                           {           
                               name: 'hideLabels',
                               id: 'epHideLabels',
                               boxLabel: 'Hide resource labels',
                               checked: false
                           },
                           {                          
                               name: 'hideUnconnected',
                               id: 'epHideUnconnected',
                               boxLabel: 'Hide resources connected by hidden relationships',
                               checked: lore.ore.explorePanel.hideUnconnected
                           }
                       ]
                   }
                ],
                bbar: [
                   '->',
                   {
                     xtype: 'button',
                     text: 'OK',
                     tooltip: 'Apply and close',
                     handler: function(b, e){
                         try{
                             var ep = lore.ore.explorePanel;
                             ep.colorKeyWin.hide();
                             
                             // iterate over rels and update filterRels
                             Ext.getCmp('epRels').items.each(function(item, index, length){
                                 if (index != 0){
                                     ep.filterRels[item.getName()] = item.getValue();
                                 }
                             });
                             // onBeforePlotLine will be called which updates adjacency alphas: this is inefficient
                             ep.fd.fx.plot();
                             
                             // update view options
                             var hideLabels = Ext.getCmp('epHideLabels').getValue();
                             if (ep.hideLabels != hideLabels){
                                 ep.fd.labels.hideLabels(hideLabels);
                                 ep.hideLabels = hideLabels;
                             }
                             
                             // Hide unconnected always called because hidden connections may have changed
                             var hideUnconnected = Ext.getCmp('epHideUnconnected').getValue();
                             ep.hideUnconnected = hideUnconnected;
                             ep.hideUnconnectedNodes();
                             
                         } catch (e){
                             lore.debug.ore("Error applying explore view options",e);
                         }
                     }
                   } ,
                   {
                       xtype: 'button',
                       text: 'Reset',
                       tooltip: 'Reset to default values',
                       handler: function(b,e){
                           Ext.getCmp('epRels').items.each(function(item, index, length){
                                 if (index != 0){
                                     item.setValue(false);
                                 }
                           });
                           Ext.getCmp('epHideLabels').setValue(false);
                           Ext.getCmp('epHideUnconnected').setValue(false);
                       }
                   }
                ]
        });
   },
   /** Set up the visualisation */
   initGraph : function(){
        Ext.getCmp("exploreHistory").body.update("");
      /** The JIT Graph that provides the explore visualization */
        this.fd = new $jit.ForceDirected({
            injectInto: 'infovis',
            width: 1200,
            height: 1200,
            Navigation: {
              enable: true,
              panning: 'avoid nodes',
              zooming: 10 
            },
            Node: {
               overridable: true,
               dim: 4,
               type: "square",
               color: "#DDDDDD"
            },
            NodeStyles: {  
                enable: true,  
                type: 'Native',  
                stylesHover: {  
                  dim: 15 
                },  
                duration: 300  
            },
            Edge: {
                overridable: true,
                //type: 'arrow', #302: wait until JIT fixes redraw bug to enable: arrows are also wrong
                lineWidth: 3,
                color: "#DDDDDD"
           },
           Tips: {
              enable: true,
              type: 'Native',
              offsetX: 3,
              offsetY: 3,
              onShow: function(tip, node) {
                // clear old tip contents
                var domObj = tip.firstChild;
                if (domObj) {
                    tip.removeChild(domObj);
                }
                if (!lore.ore.explorePanel.hideLabels || (node.data['$alpha'] == 0)) {
                    
                } else {
                    var childNodes = [];
                    if (node.data.creator){
                        childNodes.push("Created by " + node.data.creator); 
                    } 
                    if (node.data.modified){
                        childNodes.push(", modified " + node.data.modified);
                    }
                    Ext.get(tip).createChild({
                        tag: "div",
                        cls: "exploretip-title",
                        children: [
                            node.name,
                            {
                                tag: "div",
                                cls: "exploretip-text",
                                children: childNodes
                            }]
                    });                 
                }
              }
            },
            Events: {
              enable: true,
              type: 'Native',
              /*onClick: function(node, eventInfo, e){
                    lore.ore.explorePanel.fd.controller.requestGraph(node);
              },*/
              onMouseMove: function(node,eventInfo,e){
                try{
                if (!node){
                    // show color key info when over edge: we do look up based on color of pixel under mouse
                    // because we don't have access to a hover event for paths drawn on canvas
                    var ep = lore.ore.explorePanel;
                    var tt = ep.edgeToolTip;
                    var canvasCtx = ep.fd.canvas.viz.canvas.getCtx();
                    var data = canvasCtx.getImageData(e.layerX,e.layerY,1,1).data;
                    var color = '#' + new lore.draw2d.Color(data[0], data[1], data[2]).hex();
                    var rel = false;
                    if (color != '#000000') {
                        if (color == '#DDDDDD') {
                            rel = 'Unspecified relationship'; // should not happen, but default edge color is #DDDDDD
                        } else {
                            var cKey = ep.colorKey;
                            for (c in cKey){
                                if (cKey[c] == color) {
                                    rel = c;
                                    break;
                                }
                            }
                        }
                    }
                    if (rel) {
                        tt.showAt(e.pageX, e.pageY);
                        // showAt doesn't seem to be setting position properly
                        tt.setPagePosition(e.pageX, e.pageY);   
                        tt.update(ep.ckTemplate.apply({rel: rel, color: color}));
                    } else {
                        // hide color info
                        lore.ore.explorePanel.edgeToolTip.hide();        
                    }         
                }
                } catch (ex){
                    lore.debug.ore("Error in ExplorePanel with rel tooltip",ex);
                }
              },
              //Change cursor style when hovering a node
              onMouseEnter: function(node) {
                lore.ore.explorePanel.fd.canvas.getElement().style.cursor = 'move';
              },
              onMouseLeave: function() {
                lore.ore.explorePanel.fd.canvas.getElement().style.cursor = '';
              },
              //Update node positions when dragged
              onDragMove: function(node, eventInfo, e) {
                var pos = eventInfo.getPos();
                node.pos.setc(pos.x, pos.y);
                lore.ore.explorePanel.fd.plot();
              },
              onRightClick: function(node, eventInfo, e){
                    this.clickedNode = node;
                    var ep = lore.ore.explorePanel;
                    if (node) {
                        ep.onNode = true;
                        ep.onNodeMenu(this,e);
                        return false;
                    } else {
                        ep.onNode = false;
                    }
              }
            },
            //Number of iterations for the FD algorithm
            iterations: 200,
            //Edge length
            levelDistance: 130,
            clickedNode: {},
            
            requestGraph: function(node) {
                if (!node.id || !node.id.match ("http")) {
                    lore.debug.ore("requestGraph not http", node);
                    return;
                }
                lore.ore.ui.vp.progress("Retrieving data for explore view");
                try{
                   /* var context  = lore.ore.explorePanel.fd.canvas.viz.canvas.getCtx();
                    context.shadowOffsetX = 1;
                    context.shadowOffsetY = 1;
                    context.shadowBlur    = 2;
                    context.shadowColor   = '#666666';*/
                var historyData = {
                    name: Ext.util.Format.ellipsis(node.name.toString(),30),
                    action : "lore.util.launchTab(\"" + node.id + "\", window);",
                    icon : lore.constants.baseUrl + "skin/icons/page_go.png",
                    tooltip : "Show in browser"
                };
                
                // stylesheet sets type to circle for Resource Maps
                if (node.data["$type"] == "circle"){
                    historyData.action = "lore.ore.controller.loadCompoundObjectFromURL(\"" + node.id + "\");";
                    historyData.icon = lore.constants.baseUrl + "skin/oaioreicon-sm.png";
                    historyData.tooltip = "Load in LORE";
                } else if (node.data["anno"]){ // annotation
                    historyData.action = "lore.util.launchTab(\"" + node.id + "?danno_useStylesheet=\");";
                }
                var historyEl = Ext.getCmp("exploreHistory").body;
                var childNodes = [lore.ore.explorePanel.historyTemplate.apply(historyData)];
                if (historyEl.dom.childNodes.length != 0){
                    childNodes.push(" &lt;&nbsp;");
                }
                historyEl.createChild({
                    tag: "span",
                    children: childNodes
                }, historyEl.dom.firstChild);
                
                lore.ore.explorePanel.loadRem(node.id, node.name, (node.data["$type"]=='circle'), function(json) {
                    try{
                    // TODO: implement a limit on the number of nodes or drop off old ones
                    lore.ore.explorePanel.fd.op.sum(json, {
                        'type': 'fade:con',
                        duration: 1500,
                        hideLabels: true,
                        onAfterCompute: function(){
                            lore.ore.ui.vp.info("Explore view updated");
                            lore.ore.explorePanel.hideUnconnectedNodes();
                            lore.ore.explorePanel.fd.labels.hideLabels(lore.ore.explorePanel.hideLabels);
                        }
                    });
                    } catch (e){
                        lore.debug.ore("Error in requestGraph loadRem",e);
                        lore.ore.ui.vp.warning("Unable to get data for explore view");
                    }
                });
                } catch (e){
                    lore.debug.ore("Error in requestGraph",e);
                    lore.ore.ui.vp.warning("Unable to get data for explore view");
                }
            },
            onCreateLabel: function(domElement, node) {
              var nameContainer = document.createElement('span'), 
                  style = nameContainer.style;
              nameContainer.className = 'x-unselectable explorename';
              if (!node.name){
                node.name = "Untitled";
              } else {
                node.name = node.name.replace(/&amp;/g, '&');
              }
              nameContainer.textContent = Ext.util.Format.ellipsis(node.name,30);
              nameContainer.setAttribute("title","Show connections for \"" + node.name + "\"");
              domElement.appendChild(nameContainer);
              
              style.fontSize = "1.1em";
              style.color = "#51666b";
              
              nameContainer.onclick = function () {
                lore.ore.explorePanel.fd.controller.requestGraph(node);
              };
            },
            onPlaceLabel: function(domElement, node) {
                 var style = domElement.style;
                  var left = parseInt(style.left);
                  var top = parseInt(style.top);  
                  var w = domElement.offsetWidth;
                  style.left = (left - w / 2) + 'px';
                  style.top = (top + 4) + 'px';
                  style.padding = '2px';
                  style.display = '';
              }, 
              onBeforePlotLine: function(adj) {
                   
                   var rel = adj.data["rel"];
                   var newColor = "";
                   if (rel){
                        if (lore.ore.explorePanel.colorKey[rel]){
                            newColor = lore.ore.explorePanel.colorKey[rel];
                        } else {
                            // generate a semi-random color to represent this type of relationship
                            // this tends towards purple shades, but it looks better than actual random colours
                            newColor = Math.round(0xffffff * Math.random()).toString(16);
                            while(newColor.length < 6) {
                                newColor = "0" + newColor;
                            }
                            newColor = "#" + newColor.toUpperCase();
                            lore.ore.explorePanel.colorKey[rel] = newColor;  
                        }
                       adj.data["$color"] = newColor;
                   }
                   if (lore.ore.explorePanel.filterRels[rel]){
                       adj.setData('alpha', 0, 'current');       
                   } else {
                       adj.setData('alpha',1,'current');
                   }
            }
            
        });
        
        if (this.body){
            this.mon(this.body, {
                scope: this,
                contextmenu: this.onContextMenu
            });
        }
    },
    /** Handle context menu for nodes in visualisation: allow deletion/expansion of each node */
    onNodeMenu: function(fdcontroller,e){  
        try{    
	        if (!this.nodemenu) {
	            var nodemenu = new Ext.menu.Menu({
	                id : "explore-node-menu",
	                showSeparator: false
	            });
	            this.titleItem = new Ext.menu.Item({text: "Selected node:", canActivate: false});
	            nodemenu.add(this.titleItem);
	            nodemenu.add("-");
	            nodemenu.add({
	                text : "Show connections",
	                icon: lore.constants.baseUrl + "skin/icons/ore/network.png",
	                scope: fdcontroller,
	                handler : function(evt) {
	                    var node = this.clickedNode;
	                    lore.ore.explorePanel.fd.controller.requestGraph(node); 
	                }
	            });
	            nodemenu.add({
	               text: "Show in browser",
	               icon: lore.constants.baseUrl + "skin/icons/page_go.png",
	               scope: fdcontroller,
	               handler: function(evt) {
	                    var node = this.clickedNode;
	                    // TODO: disable this option if it's a Resource Map: provide option to open in LORE instead
	                    lore.util.launchTab(Ext.util.Format.htmlDecode(node.id), window);
	               }
	            });
	            nodemenu.add({
	                text : "Hide this resource and connections",
	                icon: lore.constants.baseUrl + "skin/icons/ore/cross.png",
	                scope: fdcontroller,
	                handler : function(evt) {
	                    var node = this.clickedNode;
	                    node.setData('alpha', 0, 'end');
	                    node.eachAdjacency(function(adj) {
	                        adj.setData('alpha', 0, 'end');
	                    });
	                    lore.ore.explorePanel.fd.fx.animate({
	                        modes: ['node-property:alpha',
	                            'edge-property:alpha'],
	                        duration: 500
	                    });
	                    
	                }
	            });
	            this.nodemenu = nodemenu;
	         }
            this.titleItem.setText(Ext.util.Format.ellipsis(fdcontroller.clickedNode.name,30));
        	this.nodemenu.showAt([e.pageX,e.pageY]); 
        } catch (e){
            lore.debug.ore("Error in  explore context menu",e);
        }
    },
    onTabMenu : function(e){
        //var el = Ext.get(e.explicitOriginalTarget);
        var el = Ext.get("loreviews__remexploreview");
    	var xy = el.getAnchorXY();
        // adjustments to make menu appear under explore tab
        xy[0] = xy[0] - 70; // width from menu icon to left-side of tab
        xy[1] = xy[1] + 22; // height of tab
        lore.ore.explorePanel.onContextMenu({xy:xy});
    },
    /** Handle context menu on explore view background, providing diagram-wide options such as export to image */
    onContextMenu : function (e){ 
        if (this.onNode) {
            return false;
        }
        if (!this.contextmenu) {
            this.contextmenu = new Ext.menu.Menu({
                id : this.id + "-context-menu",
                showSeparator: false
            });
            
            this.contextmenu.add({
	            text : "Save diagram as image",
	            icon: lore.constants.baseUrl + "skin/icons/ore/image.png",
	            scope: this,
	            handler : function(evt) {
	              html2canvas($("#infovis"), {
	        		onrendered: function(canvas) {
	        		  canvas.toBlob(function(blob) {
	                    saveAs(blob, "explore.png");
	                  });
	        		}
	        	  });
	            }
             });
            this.contextmenu.add({
	            text : "Center visualisation",
	            icon: lore.constants.baseUrl + "skin/icons/ore/arrow_move.png",
	            scope: this,
	            handler : function(evt) {	             	            	
	              var left, right, top, bottom;
	            	
	              for (var i = 0; i < $("#infovis-label")[0].children.length; i++) {
	            	  var child = $("#infovis-label")[0].children[i];
	            	  
	            	  var cLeft = child.offsetLeft;
	            	  var cRight = child.offsetLeft + child.offsetWidth;
	            	  var cTop = child.offsetTop;
	            	  var cBottom = child.offsetTop + child.offsetHeight;
	            	  
	            	  if (!left || cLeft < left) {
	            		  left = cLeft;
	            	  }
	            	  if (!right || cRight > right) {
	            		  right = cRight;
	            	  }
	            	  if (!top || cTop < top) {
	            		  top = cTop;
	            	  }
	            	  if (!bottom || cBottom > bottom) {
	            		  bottom = cBottom;
	            	  }
	              }	       	              
	              this.fd.canvas.translate(((($("#exploreinfovis")[0].clientWidth) - (left + right)) / 2) 
	            		  / this.fd.canvas.scaleOffsetX, ((($("#exploreinfovis")[0].clientHeight) 
	            				  - (top + 20 + bottom)) / 2) / this.fd.canvas.scaleOffsetY);
	            }
             });
             this.contextmenu.add({
                text: "Reset visualisation",
                icon: lore.constants.baseUrl + "skin/icons/arrow_refresh.png",
                scope: this,
                handler: function(evt){
                    this.showInExploreView(lore.ore.cache.getLoadedCompoundObjectUri(),"Current Resource Map",true);
                }
             });
             this.contextmenu.add({
                text: "Show color key and options",
                icon: lore.constants.baseUrl + "skin/icons/ore/color-swatch.png",
                scope: this,
                handler: function(evt){
                    var relFieldSet = this.colorKeyWin.getComponent(0);
                    relFieldSet.removeAll();
                    relFieldSet.add({xtype:'label', text: 'Hide:'});
                    for (c in this.colorKey) { 
                        var colorKeyHTML = this.ckTemplate.apply({rel: c, color: this.colorKey[c]});
                        relFieldSet.add({
                           name: c,
                           boxLabel: "&nbsp;&nbsp;" + colorKeyHTML,
                           checked: lore.ore.explorePanel.filterRels[c]
                        });
                    }                    
                    this.colorKeyWin.show();
                }
             });
                      
             this.contextmenu.add({
                    text: "Zoom out",
                    icon: lore.constants.baseUrl + "skin/icons/ore/magnifier-zoom-out.png",
                    scope: this,
                    handler: function (){
                        this.fd.canvas.scale(0.7,0.7);                     
                    }
             });
             this.contextmenu.add({
                    text: "Zoom in",
                    icon: lore.constants.baseUrl + "skin/icons/ore/magnifier-zoom-in.png",
                    scope: this,
                    handler: function (){
                        this.fd.canvas.scale(1.3,1.3);                     
                    }
             });
        }
        this.contextmenu.showAt(e.xy);
        if (e.stopEvent){
            e.stopEvent();
        }
        return false;
    },
    /** generate a PNG image capturing the visualisation from this view */
    getAsImage : function() {
        try {
	        var epanel = this.getComponent(0);
	        var imageW = epanel.getInnerWidth() + 50;
	        var imageH = epanel.getInnerHeight() + 50;
	        // TODO: get height from actual diagram rather than hardcoding image dimensions
	        imageW = 1000;
	        imageH = 1000;
	        // recenter jit canvas in case user has panned
	        var fdc = this.fd.canvas;
	        var fdcx = fdc.translateOffsetX;
	        var fdcy = fdc.translateOffsetY;
	        fdc.translate((0 - fdcx),(0 - fdcy));
	        var canvas = this.previewCanvas;
	        var context = canvas.getContext("2d");
	        var pos = this.getPosition();
	        var offsetX = pos[0] + 1;
	        var offsetY = pos[1] + 31; // don't show history
	        	        
	        // resize the viewport so that image captures entire diagram
	        var vp = lore.ore.ui.vp;
	        var vpsize = vp.getSize();
	        vp.setSize(imageW + offsetX + 50, imageH + offsetY + 50);
	        canvas.setAttribute("width", imageW + "px");
	        canvas.setAttribute("height", imageH + "px");
	        context.clearRect(0,0, imageW, imageH);
	        
	        // Draw the window, cropping to display just the visualisation
	        context.drawWindow(window, offsetX, offsetY, imageW, imageH, "rgb(255,255,255)");
	
	        var imgData = canvas.toDataURL();
	        // restore viewport original size
	        vp.setSize(vpsize);
	        vp.syncSize();
	        // translate jit canvas back to original position
	        this.fd.canvas.translate(fdcx, fdcy);
	        vp.info("Image ready");
	        return imgData;        
        } catch (e) {
            lore.debug.ore("Error in ExplorePanel.getAsImage",e);
        }
    },
    /** Temporary function to regenerate content each time the panel is activated 
     * @param {} p The panel
     */
    updateContent : function (p) {
        
        if (lore.ore.cache.getLoadedCompoundObjectIsNew()){
            Ext.getCmp("exploreinfovis").body.hide();
	            try {
	            this.clearExploreData();
	            this.exploreLoaded = "";
	            Ext.getCmp("exploreHistory").body.update("&nbsp;&nbsp;No connections to explore from repository: current Resource Map is unsaved&nbsp;&nbsp;");
	            return;
            } catch (ex){
                lore.debug.ore("Error updating explore view",ex);
            }
        }
        var currentCO = lore.ore.cache.getLoadedCompoundObject();
        var currentREM = currentCO.uri;
        if (this.exploreLoaded !== currentREM) {
            this.exploreLoaded = currentREM;
            Ext.getCmp("exploreinfovis").body.hide();
            Ext.getCmp("exploreHistory").body.update("");
            this.showInExploreView(currentREM, lore.ore.ui.grid.getPropertyValue("dc:title"), true);
        }

    },
    /**
     * Gets resource map as RDF, transforms to JSON and applies function to it
     * @param {URI} id Identifier of the Resource Map to be retrieved
     * @param {String} title Used as a label for the Resource Map
     * @param {function} f Function to apply
     */
    loadRem : function(id, title, isCompoundObject, f){
        lore.ore.reposAdapter.getExploreData(id,title,isCompoundObject,f);
    },
    clearExploreData: function(){
        if (!this.fd){
            this.initGraph();
        } else {
            this.fd.graph.empty();
        }
    },
    hideUnconnectedNodes: function(){
        try{
            if (this.hideUnconnected){
                this.fd.graph.eachNode(function(node){
                    var alpha = 0;
                    node.eachAdjacency(function(adj){                   
                        if (adj.data["$alpha"] != 0){
                            alpha = 1;
                        }
                    });
                    node.setData('alpha', alpha, 'current');  
                });
            
            } else {
                this.fd.graph.eachNode(function(node){
                    node.setData('alpha',1,'current');
                });
            }
            this.fd.fx.plot();
        } catch (e){
            lore.debug.ore("Error in hideUnconnectedNodes",e);
        }
    },
    showLoadingMessage : function(show){
        if (show){
            Ext.getCmp("exploreinfovis").el.addClass('explore-loading');
        } else {
            Ext.getCmp("exploreinfovis").el.removeClass('explore-loading')
        }
    },
    /** Initialize the explore view to display resources from the repository related to a Resource Map
     * @param {URI} id The URI of the Resource Map
     * @param {String} title Label to display for the Resource Map
     */
    showInExploreView : function (id, title, isCompoundObject, dontraise){
    	try {
	        this.clearExploreData();
	        this.showLoadingMessage(true);
	        this.loadRem(id, title, isCompoundObject || false, function(json){
	            lore.ore.explorePanel.fd.loadJSON(json);
	            lore.ore.explorePanel.fd.computeIncremental({
	                iter: 40,
	                property: 'end',
	                onComplete: function(){ 
	                  lore.ore.ui.vp.info("Explore data loaded");
	                  var ep = lore.ore.explorePanel;
	                  lore.ore.explorePanel.showLoadingMessage(false);
	                  Ext.getCmp("exploreinfovis").body.show();
	                  Ext.getCmp("exploreHistory").body.show();
	                  ep.fd.animate({
	                    modes: ['linear'],
	                    duration: 1000
	                  });
	                  ep.hideUnconnectedNodes();
	                  // intial adjustment to bring into view
	                  var canv = ep.fd.canvas;
	                  if (canv.translateOffsetX == 0){
	                    var newx = 0 - ((1100 - ep.getWidth()) / 2);
	                    var newy = 0 - ((1100 - ep.getHeight()) / 2);
	                    canv.translate(newx,newy);
	                  }
	                }
	            });
	            
	            var historyData = {
	                    name: Ext.util.Format.ellipsis(title,30),
	                    action : "lore.util.launchTab(\"" + id + "\", window);",
	                    icon : lore.constants.baseUrl + "skin/icons/page_go.png",
	                    tooltip : "Show in browser"
	            };
	            // if it is a Resource Map use lore icon and open in lore instead of browser link
	            if (isCompoundObject){
	                historyData.action = "lore.ore.controller.loadCompoundObjectFromURL(\"" + id + "\");";
	                historyData.icon = lore.constants.baseUrl + "skin/oaioreicon-sm.png";
	                historyData.tooltip = "Load in LORE";
	            }   
	            Ext.getCmp("exploreHistory").body.update(lore.ore.explorePanel.historyTemplate.apply(historyData));
	        });  
	        if (!dontraise){
	            Ext.getCmp("loreviews").activate(this.id);
	        }
	    } catch (e){
	        lore.debug.ore("Error in show in explore view",e);
	    }
    }
});
Ext.reg('explorepanel',lore.ore.ui.ExplorePanel);