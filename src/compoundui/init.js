/**
 * Initialise the Extjs UI components and listeners
 */
lore.ore.ui.initUIComponents = function() {
    Ext.DomHelper.useDom = true; // force Ext to use dom methods instead of inner HTML
    Ext.Container.prototype.bufferResize = false;
    // make sure popup windows appear above everything else, particularly when over the graphical editor
    Ext.WindowMgr.zseed = 10000;

    try {
	    Ext.MessageBox.show({
	       msg: 'Loading LORE...',
	       width:250,
	       defaultTextHeight: 0,
	       closable: false,
	       cls: 'co-load-msg'
	    });
	    lore.ore.ui.vp = new lore.ore.ui.Viewport();
	    lore.ore.ui.vp.show();
    } catch (e) {
        lore.debug.ore("Error creating Ext UI components from spec", e);
    }

    // set up glocal variable references to main UI components
    lore.ore.ui.grid = Ext.getCmp("remgrid");
    lore.ore.ui.nodegrid = Ext.getCmp("nodegrid");
    lore.ore.ui.relsgrid = Ext.getCmp("relsgrid");
    lore.ore.ui.status = Ext.getCmp("lorestatus");

    /** Tree used to display properties in resource details editor */
    lore.ore.ui.resproptreeroot = new Ext.tree.TreeNode({
                id : "resproptree",
                text : "Properties",
                qtip : "The resource's properties",
                iconCls : "tree-ore"
            });

    /** Tree used to display relationships in resource details editor */
    if (Ext.getCmp("remresedit")) {
        lore.ore.ui.resreltreeroot = new Ext.tree.TreeNode({
                    id : "resreltree",
                    text : "Relationships",
                    qtip : "The resource's relationships",
                    iconCls : "tree-ore"
                });
        var resdetailstree = Ext.getCmp("resdetailstree").getRootNode();
        resdetailstree.appendChild(lore.ore.ui.resproptreeroot);
        resdetailstree.appendChild(lore.ore.ui.resreltreeroot);
        lore.ore.ui.resproptreeroot.on("beforeclick", lore.ore.updateResDetails);
        lore.ore.ui.resreltreeroot.on("beforeclick", lore.ore.updateResDetails);
        // load resource details handler
        lore.ore.ui.resselectcombo.on("select", lore.ore.loadResourceDetails); 
    }

    
    var sidetabs = Ext.getCmp("propertytabs");
    // Fix collapsing
    sidetabs.on('beforecollapse', function(p) {
                try {
                    p.body.setStyle('display', 'none');
                } catch (e) {
                    lore.debug.ore("Error in beforecollapse", e);
                }
    });
    sidetabs.on('beforeexpand', function(p){p.body.setStyle('display','block');});
    
    sidetabs.items.each(function(item){
        // force repaint on scroll for the sidetabs to avoid rendering issues if iframe previews are scrolled behind #209
        var tabEl = item.body;
        tabEl.on("scroll",function(e,t,o){this.repaint();},tabEl);
    });
    
    sidetabs.activate("browsePanel");
    Ext.QuickTips.interceptTitles = true;
    Ext.QuickTips.init();
    
    // set up drag and drop from browse/history/search dataviews to graphical editor
    var d1 = new lore.ore.ui.CompoundObjectDragZone(Ext.getCmp('cobview'));
    var d2 = new lore.ore.ui.CompoundObjectDragZone(Ext.getCmp('cohview'));
    var d3 = new lore.ore.ui.CompoundObjectDragZone(Ext.getCmp('cosview'));
};

/**
 * Initialise Resource Maps component of LORE
 */
lore.ore.ui.init = function() {
    var currentURL;
    if (lore.ore.firefox){
        // Get a reference to the overlay
        lore.ore.ui.topView = lore.global.ui.topWindowView.get(window.instanceId);
        currentURL = window.top.getBrowser().selectedBrowser.contentWindow.location.href;
    } else {
        currentURL = "http://austlit.edu.au";
    }
    lore.ore.controller = new lore.ore.Controller({
        currentURL: currentURL
    });
    if (lore.ore.ui.topView){
        lore.global.ui.compoundObjectView.registerView(lore.ore.controller,window.instanceId);
        lore.ore.am = lore.ore.ui.topView.getAuthManager();
        if (!lore.ore.am){
            lore.ore.am = lore.ore.ui.topView.setAuthManager(new lore.AuthManager(window));
        }
        
        lore.ore.am.on('error', lore.ore.controller.onAuthErrorOrCancel);
        lore.ore.am.on('cancel', lore.ore.controller.onAuthErrorOrCancel);
    
    }
    
    lore.ore.ontologyManager = new lore.ore.model.OntologyManager();
    
    if (lore.ore.firefox){
        lore.ore.ui.topView.loadCompoundObjectPrefs(true);
    } else {
        // load preference defaults for Google Chrome
        lore.ore.controller.handlePreferencesChanged(new Store("settings", {
            creator: "Anonymous",
            relonturl: "/content/ontologies/austlitoaiore.owl",
            rdfrepos: "http://austlit.edu.au/auselit/ore/",
            rdfrepostype: "lorestore",
            annoserver: "http://austlit.edu.au/auselit/annotea",
            disable: false,
            ontologies: '[{\"nsprefix\":\"austlit\",\"locurl\":\"/content/ontologies/AustLit.xml\",\"useanno\":\"true\",\"useco\":\"false\", \"status\":\"default\", \"nsuri\":\"http://austlit.edu.au/owl/austlit.owl#\"},{\"nsuri\":\"http://RDVocab.info/Elements/\",\"nsprefix\":\"rda\",\"locurl\":\"/content/ontologies/rda.rdf\",\"useanno\":\"false\",\"useco\":\"false\", \"status\":\"custom\"},{\"nsprefix\":\"lore\", \"locurl\":\"/content/ontologies/austlitoaiore.owl\",\"useanno\":\"false\",\"useco\":\"true\", \"status\":\"default\", \"nsuri\":\"http://austlit.edu.au/owl/austlitore.owl#\"}]',
            editor: "grapheditor"
        }).toObject());
        
        chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
          if (request.action == 'gpmeGetOptions') {
            var settings = new Store("settings",{});
            lore.ore.controller.handlePreferencesChanged(settings.toObject());
          }
        });
    }
    lore.ore.coListManager = new lore.ore.model.CompoundObjectListManager();
    lore.ore.historyManager = new lore.ore.model.HistoryManager(lore.ore.coListManager);
    lore.ore.cache = new lore.ore.model.CompoundObjectCache();    

    lore.ore.ui.graphicalEditor = Ext.getCmp("drawingarea");
    lore.ore.ui.initUIComponents();
    
    lore.ore.ui.vp.info("Welcome to LORE");
    
    lore.ore.controller.createCompoundObject();

    if (lore.ore.ui.topView && lore.ore.ui.topView.compoundObjectsVisible()){
        lore.ore.controller.onShow();
    }

    lore.debug.ui("LORE Resource Maps init complete", lore);
    Ext.Msg.hide();
    Ext.getCmp("drawingarea").focus();
};

window.addEventListener('message', function(message){
	var data = JSON.parse(message.data);
	
	var props = {"dc:title_0" : 'dc:TITLE', "rdf:type" : lore.constants.BASIC_OBJECT_TYPE};
	
	if (data.metadata) {
		for (var i = 0; i < data.metadata.length; i++) {
			if (data.metadata[i]) {				
				var label = data.metadata[i].label;
				var uri = data.metadata[i].uri;
				var value =  data.metadata[i].value;
				
				if (label == "Title") {
					props["dc:title_0"] = value;
				} else if (label == "Latitude") {
					props["dc:latitude_0"] = value;
				} else if (label == "Longitude") {
					props["dc:longitude_0"] = value;
				} else if (label == "Date Created") {
					props["dc:date-begin_0"] = value;
				} else if (label == "Date Ended") {
					props["dc:date-end_0"] = value;
				} else {
					for (var ns in lore.constants.NAMESPACES) {
	        			if (uri.indexOf(lore.constants.NAMESPACES[ns]) == 0) {
	        				uri = ns + ":" + uri.substring(lore.constants.NAMESPACES[ns].length);
	        			}
	        		}
					
					props[uri] = value;
				}
			}
		}
	}
	
	lore.ore.ui.graphicalEditor.addFigure({url:data.url, props: props, 
    	rdftype : lore.constants.BASIC_OBJECT_TYPE,
		oh: 170, h: 30, w: 180}, true);
}, false);
