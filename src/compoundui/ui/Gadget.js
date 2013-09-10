Ext.onReady(function() {
		  
	Ext.WindowMgr.zseed = 10001;
	
    lore.ore.ontologyManager = new lore.ore.model.OntologyManager();
    
    lore.ore.controller = new lore.ore.Controller({
        currentURL: "http://austlit.edu.au"
    });
    
    lore.ore.controller.handlePreferencesChanged({
        creator: "Anonymous",
        relonturl: "./ontologies/austlitoaiore.owl",
        rdfrepos: "http://austlit.edu.au/auselit/ore/",
        rdfrepostype: "lorestore",
        annoserver: "http://austlit.edu.au/auselit/annotea",
        disable: false,
        ontologies: JSON.parse('[{\"nsprefix\":\"austlit\",\"locurl\":\"/lore/ontologies/AustLit.xml\",\"useanno\":\"true\",\"useco\":\"false\", \"status\":\"default\", \"nsuri\":\"http://austlit.edu.au/owl/austlit.owl#\"},{\"nsuri\":\"http://RDVocab.info/Elements/\",\"nsprefix\":\"rda\",\"locurl\":\"/lore/ontologies/rda.rdf\",\"useanno\":\"false\",\"useco\":\"false\", \"status\":\"custom\"},{\"nsprefix\":\"lore\", \"locurl\":\"./ontologies/austlitoaiore.owl\",\"useanno\":\"false\",\"useco\":\"true\", \"status\":\"default\", \"nsuri\":\"http://austlit.edu.au/owl/austlitore.owl#\"}]'),
        editor: "grapheditor"
    });
    
    lore.ore.ui.vp = new lore.ore.ui.Viewport();
    lore.ore.reposAdapter = new lore.ore.repos.SPARQLAdapter("http://corbicula.huni.net.au/dataset");
    lore.ore.coListManager = new lore.ore.model.CompoundObjectListManager();
    lore.ore.cache = new lore.ore.model.CompoundObjectCache();  
    	
	lore.ore.reposAdapter.getCompoundObjects(null, null, null, true);
		
    var action1 = new Ext.Action({
        text: '<b>Search</b>',
        handler: function(){
        	lore.ore.reposAdapter.getCompoundObjects(null, null, Ext.getCmp("kwsearchval").getValue(), true);
        }
    });	
    
    var action2 = new Ext.Action({
        text: '<b>Search</b>',
        handler: function(){
        	var searchuri = Ext.getCmp("advsearchform").getForm().findField("searchuri").getValue();
        	var searchpred = Ext.getCmp("advsearchform").getForm().findField("searchpred").getValue();
        	var searchval = Ext.getCmp("advsearchform").getForm().findField("searchval").getValue();
        	lore.ore.reposAdapter.getCompoundObjects(searchuri, searchpred, searchval, true);
        }
    });
    
	new Ext.Viewport({
		layout: 'border',
        items: [
	        /*{
	            region: 'center',
        		html: '<p id="centerPanel">north - generally for menus, toolbars and/or advertisements</p>'
	        },*/
	        {
	        	region: 'center',
	        	items: [
					new Ext.TabPanel({
		                id : "loreviews",
					    renderTo: 'tabs3',
					    activeTab: 0,
					    frame:true,
					    defaults:{autoHeight: true},
					    applyTo: 'tabs3',
					    border : false,
					    bwrapStyle : "position: absolute; top: 26px; bottom: 0px; width: 100%; height: auto;",
				        deferredRender: false,
					    itemTpl: new Ext.XTemplate(
		                    '<li class="{cls}" id="{id}"><a class="x-tab-strip-close"></a>',
		                    '<tpl if="menuHandler">',
		                        '<a title="{text} Menu" href="javascript:void(0);" onclick="{menuHandler}" class="x-tab-strip-menu"></a>',
		                    '</tpl>',
		                    '<a class="x-tab-right" href="javascript:void(0);"><em class="x-tab-left">',
		                    '<span class="x-tab-strip-inner"><span class="x-tab-strip-text {iconCls}">{text}</span></span>',
		                    '</em></a>',
		                    '</li>'
		                ),
		                /** 
		                 * Override to allow menuHandler to be passed in as config
		                 */
		                getTemplateArgs: function(item) {
		                    var result = Ext.TabPanel.prototype.getTemplateArgs.call(this, item);
		                    if (item.menuHandler){
		                        result.cls = result.cls + " x-tab-strip-with-menu";
		                    }
		                    return Ext.apply(result, {
		                        closable: item.closable,
		                        menuHandler: item.menuHandler
		                    });
		                },
		                /** Override to allow mouse clicks on menu button */
		                onStripMouseDown: function(e){
		                    var menu = e.getTarget('.x-tab-strip-active a.x-tab-strip-menu', this.strip);
		                    if (menu || e.button !== 0){
		                        // default onclick behaviour will result
		                        return;
		                    }
		                    e.preventDefault();
		                    var t = this.findTargets(e);
		                    if(t.close){
		                        if (t.item.fireEvent('beforeclose', t.item) !== false) {
		                            t.item.fireEvent('close', t.item);
		                            this.remove(t.item);
		                        }
		                        return;
		                    }
		                    if(t.item && t.item != this.activeTab){
		                        this.setActiveTab(t.item);
		                    }
		                },
		                enableTabScroll : true,
		                // Ext plugin to change hideMode to ensure tab contents are not reloaded
		                plugins : new Ext.ux.plugin.VisibilityMode({
		                            hideMode : 'nosize',
		                            bubble : false
		                }),
					    items : [
							{
								title: 'Raw RDF',
								html: '<p id="centerPanel" style="white-space: pre; overflow: scroll; height: 100%"></p>',
								iconCls: "code-icon"
							},{
	                            title : "Graphical Editor",
	                            tabTip: "View or edit the Resource Map graphically",
	                            id : "drawingarea",
	                            xtype : "grapheditor",
	                            iconCls: "graph-icon"
	                        },{
	                            title : "Resource List",
	                            tabTip: "View or edit the list of resources in the Resource Map",
	                            xtype : "resourcepanel",
	                            id : "remlistview",
	                            iconCls: "list-icon"
	                        },  {
	                            title : "Details",
	                            id: "remdetailsview",
	                            tabTip: "View detailed description of Resource Map contents including properties and relationships",
	                            xtype: "detailspanel",
	                            iconCls: "detail-icon"
	                        },  {
	                            layout : 'fit',
	                            id : "remslideview",
	                            title : "Slideshow",
	                            iconCls: "slide-icon",
	                            tabTip: "View Resource Map contents as a slideshow",
	                            items : [{
                                    id : 'newss',
                                    xtype : "slideshowpanel",
                                    autoScroll : true
                                }]
	                        },	{
	                            title : "Explore",
	                            tabTip: "Discover related resources from the repository",
	                            id : "remexploreview",
	                            xtype : "explorepanel",
	                            iconCls: "explore-icon"
	                        }
			            ]
					})        
	        	]
	        },{
	            region : "south",
	            height : 25,
	            xtype : "statusbar",
	            id : "lorestatus",
	            defaultText : "",
	            autoClear : 6000,
	            items: [
	                '-',
	                {
	                    xtype:'label',
	                    id:'currentCOMsg', 
	                    text: 'New Resource Map'
	                },
	                ' ',
	                {
	                    xtype: 'label',
	                    id:'currentCOSavedMsg',
	                    text:'',
	                    style: 'color:red'
	                },
	                ' ',
	                {
	                    xtype: 'button',
	                    hidden: true,
	                    id: 'lockButton',
	                    icon: './skin/icons/ore/lock.png',
	                    tooltip: 'Resource Map is locked',
	                    scope: lore.ore.controller
	                }
	            ]
	        },{
		        region: 'west',
		        width: 350,
                split:true,
		        items: [
		            new Ext.Toolbar({
		            	items : [
							new Ext.Action({
								id: 'addIcon',
								handler: function(){
									lore.ore.controller.addResourceWithPrompt();
							    },
							    icon: './skin/icons/add.png'
							}),
							new Ext.Action({
								id: 'placeholderIcon',
								handler: function(){
									lore.ore.controller.addPlaceholder();
							    },
							    icon: './skin/icons/ore/plus-white.png'
							}),
							/*{
					            menu: new Ext.menu.Menu({
									id: 'menu1',
							        style: {
							            overflow: 'visible'
							        },
									items: [
										new Ext.Action({
											handler: function(){
												lore.ore.controller.addResourceWithPrompt();
										    },
						                    text: 'Add resource URL'
						                }), 
						                new Ext.Action({
											handler: function(){
												loreoverlay.addFromTabs();
										    },
						                    text: 'Add resources from tabs'
						                })
						            ]
								})
					        },*/
							'-',
							new Ext.Action({
								id: 'saveIcon',
							    handler: function(){
							    	lore.ore.controller.saveCompoundObjectToRepository();
							    },
							    icon: './skin/icons/ore/disk.png'
							}),
							new Ext.Action({
								id: 'dbAddIcon',
								handler: function(){
									lore.ore.controller.createCompoundObject();
							    },
							    icon: './skin/icons/ore/database_add.png'
							}),
							new Ext.Action({
								id: 'dbCopyIcon',
								handler: function(){
									lore.ore.controller.copyCompoundObjectToNew();
							    },
							    icon: './skin/icons/ore/database_go.png'
							}),
							new Ext.Action({
								id: 'lockIcon',
								handler: function(){
									lore.ore.controller.lockCompoundObjectInRepository();
							    },
							    icon: './skin/icons/ore/lock.png'
							}),
							new Ext.Action({
								id: 'deleteIcon',
								handler: function(){
									lore.ore.controller.deleteCompoundObjectFromRepository();
							    },
							    icon: './skin/icons/ore/database_delete.png'
							}),
							/*'-',
							{
								id: 'exportMenu',
							    icon: './skin/icons/table_refresh.png',
							    menu: new Ext.menu.Menu({
									id: 'menu2',
							        style: {
							            overflow: 'visible'
							        },
									items: [
										new Ext.Action({
											handler: function(){
												lore.ore.controller.exportCompoundObject('wordml');
										    },
						                    text: 'Export Summary to Word'
						                }), 
						                new Ext.Action({
											handler: function(){
												lore.ore.controller.exportCompoundObject('rdf');
										    },
						                    text: 'Export to RDF/XML'
						                }), 
						                new Ext.Action({
											handler: function(){
												lore.ore.controller.exportCompoundObject('trig');
										    },
						                    text: 'Export to TriG'
						                }), 
						                new Ext.Action({
											handler: function(){
												lore.ore.controller.exportCompoundObject('json');
										    },
						                    text: 'Export to JSON'
						                }), 
						                new Ext.Action({
											handler: function(){
												try{
									                var fObj =  lore.util.loadFileWithOpen("Select Resource Map RDF/XML file", 
									                {desc:"RDF documents", filter:"*.rdf"}, window);
									                
									                if ( fObj) {
									                    loreoverlay.coView().loadCompoundObject(fObj.data);
									                }
									            } catch (e){
									                lore.debug.ui("Error importing Resource Map from file",e);
									            }
										    },
						                    text: 'Import from RDF/XML file'
						                }), 
						                new Ext.Action({
											handler: function(){
												lore.ore.controller.loadCompoundObjectPromptForURL();
										    },
						                    text: 'Import from RDF/XML URL'
						                })
						            ]
								})
							},*/
							'-',
							/*new Ext.Action({
								id: 'searchIcon',
								handler: function(){
									//document.getElementById("http://localhost:8080/gadgets/ifr?url=http://localhost:8080/lore/lore.xml-data").contentWindow.find("",false, false, true, false, true, true);
									window.find("",false, false, true, false, true, true);  
							    },
							    icon: './skin/icons/ore/page_white_magnify.png'
							}),*/
							/*new Ext.Action({
								handler: function(){
						            //var instantApply = getBoolPref("browser.preferences.instantApply");
									var instantApply = true;
						            var features = "chrome,titlebar,toolbar,centerscreen,resizable=yes" + (instantApply ? ",dialog=no" : ",modal");
						            window.open("./options.xul","", features);
						            
							    },
							    icon: './skin/icons/cog.png'
							}),*/
							new Ext.Action({
								id: 'reportIcon',
								handler: function(){
						            try{ 
						            	var version = this.version;
						                if (!version){
						                  version = "0.0.1";
						                }
						                var url = "mailto:auselit@gmail.com?subject=Problem%20with%20LORE%20" + version
						                  + "&Body=Please describe the problem in as much detail as possible, " 
						                  + "including URLs for the web resources you were working with when the problem occurred:%0A%0A%0A%0A"
						                  + "Recent activity (this information may assist the developers to diagnose the problem): %0A"
						                  + lore.debug.getRecentLog();
						                window.location.href = url;
						            } catch (e){
						            	lore.debug.ui("Error in loreoverlay.reportProblem",e);
						            }
							    },
							    icon: './skin/icons/mail-exclamation.png'
							})
		            	]
		            }),
			        new Ext.TabPanel({
				        renderTo: 'tabs1',
				        activeTab: 0,
				        frame:true,
			            id : "propertytabs",
				        defaults:{autoHeight: true},
				        applyTo: 'tabs1',
			            border : false,
				        items : [
							new Ext.Panel({
								id : 'searchPanel',
								title: 'Search',
					            border : false,
                                items:[
	                                new Ext.TabPanel({
									    renderTo: 'tabs2',
									    activeTab: 0,
									    frame:true,
									    defaults:{autoHeight: true},
									    applyTo: 'tabs2',
									    items : [ 
									        new Ext.Panel({
									         	layout : "hbox",
									             title : "Keyword",
									             tabTip: "Search by keyword across all fields",
									             id : "kwsearchform",
									             padding : 3,
									             layoutConfig : {
									                 pack : 'start',
									                 align : 'stretchmax'
									             },
									             border : false,
									             autoHeight : true,
									             items : [{
									                    xtype : "textfield",
									                    id : "kwsearchval",
									                    flex : 1
									                },
									                new Ext.Button(action1)
									             ]
									        }), 
									        new Ext.FormPanel({
									            url:'save-form.php',
									            frame:true,
									            width: 250,
									            defaults: {width: 245},
									            defaultType: 'textfield',
									            
									            title : "Advanced",
									            tabTip: "Search specific fields",
									            autoHeight : true,
									            autoWidth : true,
									            id : "advsearchform",
									            border : false,
									            bodyStyle : "padding: 0 10px 4px 4px",
									            labelWidth : 75,
									            items: [{
									                    xtype : "label",
									                    id : "find-co-label",
									                    text : "Find Resource Maps",
									                    style : "font-family: arial, tahoma, helvetica, sans-serif; font-size:11px;line-height:2em"
									                },{
									                    fieldLabel: 'containing',
									                    id : "searchuri",
									                    allowBlank:false,
									                    emptyText : "any resource URI"
									                },{
									                	xtype:          'combo',
									                    mode:           'local',
									                    triggerAction:  'all',
									                    forceSelection: true,
									                    editable:       false,
									                    fieldLabel : "having",
									                    id : "searchpred",
									                    displayField : 'curie',
									                    valueField : 'uri',
									                    emptyText : "any property or relationship",
									                    store : new Ext.data.ArrayStore({
									                        storeId: 'advancedSearchPredStore',
									                        fields : ['uri', 'curie'],
									                        data : []
									                    })
									                },{
									                    fieldLabel: 'matching',
									                    id : "searchval",
									                    allowBlank:false,
									                    emptyText : ""
									                }
									            ],
									
									            buttons: [
									                new Ext.Button(action2)
											    ]
									        })
										]
									}),
	    				            {
	    							    minHeight: 0,
	    							    normal: false,
	    							    border : false,
	    							    layout: "anchor",
	    							    "id": "searchResultPanel",
	    							    autoScroll: true, 
	    							    "tbar": {
	    							        "xtype": "pagingToolbar",
	    							        "store": "search",
	    							        "id": "spager"		                    
	    							    }
	    								,
	    							    items: [
	    									{
							                    "xtype": "codataview",
							                    "store": "search",
							                    "id": "cosview"
							                }
	    							    ]
	    							}
	                            ]
                            })
							,
							new Ext.Panel({
						    	id: 'properties',
						        title: 'Properties',
						        layout:'anchor',
						        height: "500px",
						        items: [
									{
						                title : 'Resource Map Properties',
						                id : "remgrid",
						                propertyType: "property",
						                xtype : "propertyeditor"
						            }
									, 
									{
						                title : "Resource Properties",
						                id : "nodegrid",
						                propertyType: "property",
						                xtype : "propertyeditor"
						            }
						            , 
						            {
						                title: "Relationships",
						                id: "relsgrid",
						                propertyType: "relationship",
						                xtype: "relationshipeditor"
						            }
								]
						    })
	                	]
			        })
			    ]
	        }	        
	    ]
    });
	
	new Ext.ToolTip({
		target: 'addIcon',
		html: 'Add URL to LORE Resource Map'
	});
	
	new Ext.ToolTip({
		target: 'placeholderIcon',
		html: 'Add placeholder to represent a concept or thing that does not have a URI'
	});
	
	new Ext.ToolTip({
		target: 'saveIcon',
		html: 'Save the current Resource Map to the repository'
	});
	
	new Ext.ToolTip({
		target: 'dbAddIcon',
		html: 'Create a new (empty) Resource Map'
	});
	
	new Ext.ToolTip({
		target: 'dbCopyIcon',
		html: 'Copy contents of the current Resource Map to a new Resource Map'
	});
	
	new Ext.ToolTip({
		target: 'lockIcon',
		html: 'Save and lock Resource Map to prevent further editing'
	});
	
	new Ext.ToolTip({
		target: 'deleteIcon',
		html: 'Delete the current Resource Map from the repository'
	});
	
	new Ext.ToolTip({
		target: 'exportMenu',
		html: 'Import/Export Resource Map as file'
	});
	
	/*new Ext.ToolTip({
		target: 'searchIcon',
		html: 'Find text within currently visible Resource Map view'
	});*/
	
	new Ext.ToolTip({
		target: 'reportIcon',
		html: 'Report a problem'
	});
	
    lore.ore.ui.grid = Ext.getCmp("remgrid");
    lore.ore.ui.nodegrid = Ext.getCmp("nodegrid");
    lore.ore.ui.relsgrid = Ext.getCmp("relsgrid");
    lore.ore.ui.status = Ext.getCmp("lorestatus");
	
	var searchproplist = [];
    var om = lore.ore.ontologyManager;
    for (var p = 0; p < om.METADATA_PROPS.length; p++) {
        var curie = om.METADATA_PROPS[p];
        var splitprop = curie.split(":");
        searchproplist.push([
            "" + lore.constants.NAMESPACES[splitprop[0]]
            + splitprop[1], curie]);
    }
    Ext.getCmp("searchpred").getStore().loadData(searchproplist);
    
    lore.ore.ui.graphicalEditor = Ext.getCmp("drawingarea");
    Ext.getBody().dom.setAttribute('oncontextmenu', "return false;");
});