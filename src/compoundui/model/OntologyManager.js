Ext.namespace("lore.ore.model");
/** @class lore.ore.model.OntologyManager Manage object and datatype properties from domain ontology that can be used in Resource Maps */
lore.ore.model.OntologyManager = function() {
    /** Default list of properties that can be specified for Resource Maps or resources 
    * @const */
    this.METADATA_PROPS = ["dcterms:abstract", "dcterms:audience", "dc:creator",
        "dc:contributor", "dc:coverage", "dcterms:created", "dc:date-begin", 
        "dc:date-end", "dc:description", "dc:identifier", "dc:language", 
        "dc:latitude","dc:longitude", "dcterms:modified", "dc:publisher", 
        "dc:relation", "dc:rights", "dc:source", "dc:subject", "dc:title", 
        "dc:type"];
    /** Properties that are mandatory/cannot be deleted for Resource Maps
     *  @const */
    this.CO_REQUIRED = ["dc:creator","dcterms:created",
        "dcterms:modified", "ore:describes", "rdf:about", "rdf:type", "lorestore:user"  
    ];
    /** Properties that are mandatory for an aggregated resource
     *  @const */
    this.RES_REQUIRED = ["resource"];
    /** Properties that are mandatory for a relationship 
     * @const */
    this.REL_REQUIRED = ["relationship", "namespace"];

    /** URL from which current ontology was loaded (may be different from URL e.g. when ontology is loaded from local chrome URL)*/
    this.relOntologyURL = "";
    
    /** URI identifying current ontology */
    this.relOntologyURI = "";
    
    /** RDFQuery object representing current ontology */
    this.relOntology = {};
    
    this.dataTypeProps = [];

    // metadata for ontologies from preferences
    this.relOntologyMetadata = new Ext.data.JsonStore ({
        fields: ['nsprefix', 'nsuri', 'locurl', 'useco', 'useanno'],
        idProperty: 'nsprefix',
        storeId: 'ontologies'
    });
    
    // cache previously loaded ontology terms
    this.relOntologyCache = {};
    
};

Ext.apply(lore.ore.model.OntologyManager.prototype, {
    /** Update metadata for ontologies configured for use with LORE */
    updateOntologiesMetadata : function(ontologies, om, setCurrent){
        try{
            // Load metadata about ontologies from data obtained from preference
            this.relOntologyMetadata.loadData(ontologies);
            // Check that all ontology metadata entries include the nsuri for the baseuri
            this.relOntologyMetadata.each(function(r){
              try{
                var nsuri = r.get('nsuri');
                var nspfx = r.get('nsprefix');
                if (nsuri){
                    // make sure this namespace is in constants.NAMESPACES
                    lore.constants.nsprefix(nsuri,nspfx);
                } else {
                    // Load ontology to get namespace uri
                    var locurl = r.get('locurl');
                    if (locurl && locurl != "http://"){
                        this.cacheOntology(locurl, function(ontData){
                            var baseuri;
                            if(ontData && ontData.nsuri){
                                baseuri = ontData.nsuri;
                            } else {
                                // If there was no xml:base, lookup URI or dc:identifier of OWL ontology 
                                var baseQuery = ontData.ontology
                                    .where('?theont rdf:type <http://www.w3.org/2002/07/owl#Ontology>')
                                    .optional('?theont <http://purl.org/dc/elements/1.1/identifier> ?theontid');
                                var res = baseQuery.get(0);
                                if (res){
                                    var baseuri = res.theont.value.toString();
                                    if (!baseuri) {
                                        baseuri = res.theontid.value;
                                    }
                                }
                            }
                            if (baseuri){
                                // If baseuri doesn't end in hash or slash, add hash
                                var lastChar = baseuri[baseuri.length - 1];
                                if (lastChar == '>'){
                                    // remove angle brackets
                                    baseuri = baseuri.slice(1,baseuri.length - 1);
                                }
                                if (!(lastChar == '#' || lastChar == '/')){
                                    baseuri = baseuri + "#";
                                }
                                r.set('nsuri', baseuri);
                                // Ensure that all prefixes are included in constants.NAMESPACES
                                lore.constants.nsprefix(baseuri,nspfx);
                                // TODO: store nsuri back into preference so we don't have to look it up again
                                //r.nsuri = baseuri;
                            } 
                        });
                    }
                }
                
              } catch (ex){
                    lore.debug.ore("Error loading ontology metadata",ex);
              }
            },this);
            if (setCurrent){
                  om.setCurrentOntology(om);
            }
        } catch (e){
            lore.debug.ore("Error in updateOntologiesMetadata",e);
        }
    },
    /** Load ontology terms into cache */
    cacheOntology : function(ourl, callback){
        var om = this;
        if (ourl) {
            // Check if it is already in the cache
            if (this.relOntologyCache[ourl]){
                callback(this.relOntologyCache[ourl]);
                return;
            }
            
            var xhr = new XMLHttpRequest();                
            xhr.overrideMimeType('text/xml');
            var oThis = this;
            xhr.open("GET", lore.constants.baseUrl + 'ontologies/austlitoaiore.owl');
            xhr.onreadystatechange= function(){
                if (xhr.readyState == 4) {                    
                    var ontData = {relationships:{}, dataTypeProps: []};
                    // Get xml:base
                    var tmp = xhr.responseXML.getElementsByTagNameNS(lore.constants.NAMESPACES["rdf"], 'RDF')[0];
                    if (tmp){
                        tmp = tmp.getAttributeNS('http://www.w3.org/XML/1998/namespace','base');
                    }
                    if (tmp){
                        ontData.nsuri = tmp;
                    }
                    // Load contents javascof ontology into rdfquery databank
                    var db = jQuery.rdf.databank();
                    for (ns in lore.constants.NAMESPACES) {
                        db.prefix(ns, lore.constants.NAMESPACES[ns]);
                    }
                    db.load(xhr.responseXML);
                    var relOntology = jQuery.rdf({
                        databank : db
                    });
                    // always provide dc:relation as an option
                    ontData.relationships["relation"] = lore.constants.NAMESPACES["dc"];
                    // Cache RDF properties (add to both datatype and object property lists as could be either)
                    relOntology.where('?prop rdf:type <http://www.w3.org/1999/02/22-rdf-syntax-ns#Property>')
                            .each(function() {
                                var relresult = lore.util
                                        .splitTerm(this.prop.value
                                                .toString());
                                var ns = lore.constants.nsprefix(relresult.ns);
                                ontData.relationships[relresult.term] = relresult.ns;
                                ontData.dataTypeProps.push(ns + ":" + relresult.term);
                            });
                    // Cache OWL Object properties
                    relOntology.where('?prop rdf:type <'
                            + lore.constants.OWL_OBJPROP + '>').each(
                            function() {
                                try {
                                    var relresult = lore.util
                                            .splitTerm(this.prop.value
                                                    .toString());
                                    ontData.relationships[relresult.term] = relresult.ns;
                                } catch (e) {
                                    lore.debug.ore("Error loading rels", e);
                                }
                    });
                    // Cache datatype properties
                    relOntology.where('?prop rdf:type <' + lore.constants.OWL_DATAPROP + '>').each(
                            function (){
                                try {
                                    var relresult = lore.util.splitTerm(this.prop.value.toString());
                                    var ns = lore.constants.nsprefix(relresult.ns);
                                    ontData.dataTypeProps.push(ns + ":" + relresult.term);
                                } catch (e){
                                    lore.debug.ore("Error loading data props",e);
                                }
                            }
                    );
                    ontData.ontology = relOntology;
                    om.relOntologyCache[ourl] = ontData;
                    callback(ontData);
                }
            };
            xhr.send(null);
        }
    },
    /** Change the ontology currently used for relationships and properties */
    setCurrentOntology : function(om){
        try{
        om.dataTypeProps = om.METADATA_PROPS.slice(0);
        om.cacheOntology(om.relOntologyURL, function(ontData){
            try{
            om.theOntRelationships = ontData.relationships;
            om.relOntology = ontData.ontology;
            // merge ontData.dataTypeProps and om.dataTypeProps : remove duplicates
            for (var i = 0; i< ontData.dataTypeProps.length; i++){
                var d = ontData.dataTypeProps[i];
                if (om.dataTypeProps.indexOf(d) == -1){
                    om.dataTypeProps.push(d);
                }
            }
            lore.ore.theOntRelationships = om.theOntRelationships;
            } catch (e){
                lore.debug.ore("Error in setCurrentOntology cache",e);
            }
        });
        } catch (ex){
            lore.debug.ore("Error in setCurrentOntology",ex);
        }

        //lore.ore.resource_metadata_props = ["rdf:type","ore:isAggregatedBy"];
        
    },
    /**
     * Respond to ontology preferences being updated
     */
    loadOntology : function(ourl, ontologies) {
        try {
            var om = this;
            var setCurrent = false;
            if (!(this.relOntologyURL && this.relOntologyURL == ourl && !lore.util.isEmptyObject(this.relOntology))){
                setCurrent = true;
                this.relOntologyURL = ourl;
            }
            this.updateOntologiesMetadata(ontologies, om, setCurrent); 
        } catch (e) {
            lore.debug.ore("Error in loadOntology", e);
        }
    },
    getDataTypeProperties : function(forCompoundObject){
        if (!forCompoundObject){
            return this.dataTypeProps;    
        } else {
            return this.dataTypeProps.filter(function(e,i,a){return !(e == "dc:type" || e == "dcterms:modified" || e == "dcterms:created")});
        }
        
    },
    /** return the values from the current type vocabulary as array of [id,displayName] values */
    getDCTypeVocab : function(){
       if (!this.dctypeVocab){
            // TODO: allow customisable type vocab and load from ontology file.
            // At present we use DCMIType only (hardcoded below)
            this.dctypeVocab = [
               ['http://purl.org/dc/dcmitype/Collection','Collection'],
               ['http://purl.org/dc/dcmitype/Dataset', 'Dataset'],
               ['http://purl.org/dc/dcmitype/Event','Event'],
               ['http://purl.org/dc/dcmitype/Image', 'Image'],
               ['http://purl.org/dc/dcmitype/StillImage', 'Still Image'],
               ['http://purl.org/dc/dcmitype/MovingImage', 'Moving Image'],
               ['http://purl.org/dc/dcmitype/InteractiveResource','InteractiveResource'],
               ['http://purl.org/dc/dcmitype/Service','Service'],
               ['http://purl.org/dc/dcmitype/Software','Software'],
               ['http://purl.org/dc/dcmitype/Sound','Sound'],
               ['http://purl.org/dc/dcmitype/Text','Text'],
               ['http://purl.org/dc/dcmitype/PhysicalObject', 'PhysicalObject']
           ];
       }
       return this.dctypeVocab;
    }
});