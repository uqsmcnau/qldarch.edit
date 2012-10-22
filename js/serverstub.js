var menuProperties = {
    animates : [
      {
          uri: "http://qldarch.net/rdf#employeeOf",
          label: "employee of",
          definition: "The subject was an employee of the indicated firm",
          domain: [ "http://qldarch.net/rdf#Architect" ],
          range: [ "http://qldarch.net/rdf#Firm" ],
          reification: "http://qldarch.net/rdf#EmployeeRelation"
      },
      {
          uri: "http://qldarch.net/rdf#wasPartnerAt",
          label: "was a partner at",
          definition: "The subject was an partner at the indicated firm",
          domain: [ "http://qldarch.net/rdf#Architect" ],
          range: [ "http://qldarch.net/rdf#Firm" ],
          reification: "http://qldarch.net/rdf#PartnerRelation"
      },
      {
          uri: "http://qldarch.net/rdf#collaboratedWith",
          label: "collaborated with",
          definition: "The subject collaborated with the indicated architect",
          domain: [ "http://qldarch.net/rdf#Architect" ],
          range: [ "http://qldarch.net/rdf#Architect" ],
      },
  ],
    betweens : [
      {
          uri: "http://qldarch.net/rdf#designed",
          label: "designed",
          definition: "The subject was involved in designing the indicated structure",
          domain: [ "http://qldarch.net/rdf#Architect" ],
          range: [ "http://qldarch.net/rdf#Structure" ],
      },
      {
          uri: "http://qldarch.net/rdf#receivedAward",
          label: "received award",
          definition: "The subject received the indicated award.",
          domain: [ "http://qldarch.net/rdf#Architect", "http://qldarch.net/rdf#Structure" ],
          range: [ "http://qldarch.net/rdf#Award" ],
      },
  ],
    types : [
      {
          uri: "http://qldarch.net/rdf#Architect",
          label: "Architect",
          definition: "A person who is or has been an Architect"
      },
      {
          uri: "http://qldarch.net/rdf#Firm",
          label: "Firm",
          definition: "A business with a recognised continuity of identity"
      },
      {
          uri: "http://qldarch.net/rdf#Client",
          label: "Client",
          definition: "An agent who has engaged an Architect or Firm on a project"
      },
      {
          uri: "http://qldarch.net/rdf#Structure",
          label: "Structure",
          definition: "A building, or other distinguishable part of our built environment"
      },
      {
          uri: "http://qldarch.net/rdf#Award",
          label: "Award",
          definition: "An recognition of meritorious conduct or achivement"
      }
  ]
};
var properties = {
    uri: {
        label: "URI",
        display: false,
        editable: false
    },
    label: {
        label: "Label",
        display: false,
        editable: true
    },
    "rdf:type" : {
        label: "RDF Type",
        display: false,
        editable: false
    },
    "foaf:firstName" : {
        label: "First Name",
        display: true,
        editable: true
    },
    "foaf:lastName" : {
        label: "Last Name",
        display: true,
        editable: true
    },
    "qldarch:firmName" : {
        label: "Firm Name",
        display: true,
        editable: true
    },
    "qldarch:beganEmployment" : {
        label: "Began Employment",
        display: true,
        editable: true,
        domain: [ "http://qldarch.net/rdf#EmployeeRelation", "http://qldarch.net/rdf#PartnerRelation" ],
        range: [ "xsd:date" ]
    },
    "qldarch:endedEmployment" : {
        label: "Ended Employment",
        display: true,
        editable: true,
        domain: [ "http://qldarch.net/rdf#EmployeeRelation", "http://qldarch.net/rdf#PartnerRelation" ],
        range: [ "xsd:date" ]
    },
    "qldarch:relationDescription" : {
        label: "Other Details",
        display: true,
        editable: true,
        domain: [ "http://qldarch.net/rdf#EmployeeRelation", "http://qldarch.net/rdf#PartnerRelation" ],
        range: [ "xsd:string" ]
    },
};
var entities = {
    "http://qldarch.net/rdf/resources#00001" : {
        uri: "http://qldarch.net/rdf/resources#00001",
        label: "Graham Bligh",
        "rdf:type" : "http://qldarch.net/rdf#Architect",
        "foaf:firstName" : "Graham",
        "foaf:lastName" : "Bligh"
    },
    "http://qldarch.net/rdf/resources#00002" : {
        uri: "http://qldarch.net/rdf/resources#00002",
        label: "James Birrell",
        "rdf:type" : "http://qldarch.net/rdf#Architect",
        "foaf:firstName" : "James",
        "foaf:lastName" : "Birrell"
    },
    "http://qldarch.net/rdf/resources#00003" : {
        uri: "http://qldarch.net/rdf/resources#00003",
        label: "Ian Chalton",
        "rdf:type" : "http://qldarch.net/rdf#Architect",
        "foaf:firstName" : "Ian",
        "foaf:lastName" : "Charlton"
    },
    "http://qldarch.net/rdf/resources#00004" : {
        uri: "http://qldarch.net/rdf/resources#00004",
        label: "Jon Voller",
        "rdf:type" : "http://qldarch.net/rdf#Architect",
        "foaf:firstName" : "Jon",
        "foaf:lastName" : "Voller"
    },
    "http://qldarch.net/rdf/resources#00005" : {
        uri: "http://qldarch.net/rdf/resources#00005",
        label: "Blair Wilson",
        "rdf:type" : "http://qldarch.net/rdf#Architect",
        "foaf:firstName" : "Blair",
        "foaf:lastName" : "Wilson"
    },
    "http://qldarch.net/rdf/resources#00015" : {
        uri: "http://qldarch.net/rdf/resources#00015",
        label: "Duncan McPhee",
        "rdf:type" : "http://qldarch.net/rdf#Architect",
        "foaf:firstName" : "Duncan",
        "foaf:lastName" : "McPhee"
    },
};
var resourcesByRdfType = {
    "http://qldarch.net/rdf#Architect" : [
    {
        uri: "http://qldarch.net/rdf/resources#00001",
        label: "Graham Bligh"
    },
    {
        uri: "http://qldarch.net/rdf/resources#00002",
        label: "James Birrell",
        preferredImage: "http://qldarch.net/rdf/content#00029",
    },
    {
        uri: "http://qldarch.net/rdf/resources#00003",
        label: "Ian Charlton"
    },
    {
        uri: "http://qldarch.net/rdf/resources#00004",
        label: "Jon Voller"
    },
    {
        uri: "http://qldarch.net/rdf/resources#00005",
        label: "Blair Wilson"
    },
    {
        uri: "http://qldarch.net/rdf/resources#00015",
        label: "Duncan McPhee"
    }
    ],
    "http://qldarch.net/rdf#Firm" : [
    {
        uri: "http://qldarch.net/rdf/resources#00006",
        label: "Hayes and Scott",
        "qldarch:firmName": "Hayes and Scott"
    },
    {
        uri: "http://qldarch.net/rdf/resources#00007",
        label: "Bligh, Jessup, Bretnall and Partners",
        "qldarch:firmName": "Bligh, Jessup, Bretnall and Partners"
    },
    {
        uri: "http://qldarch.net/rdf/resources#00008",
        label: "Colin and Fulton",
        "qldarch:firmName": "Colin and Fulton"
    }
    ],
    "http://qldarch.net/rdf#Client" : [
    {
        uri: "http://qldarch.net/rdf/resources#00009",
        label: "The University of Queensland"
    }
    ],
    "http://qldarch.net/rdf#Structure" : [
    {
        uri: "http://qldarch.net/rdf/resources#00010",
        label: "International House UQ"
    },
    {
        uri: "http://qldarch.net/rdf/resources#00011",
        label: "Schonel Theatre UQ"
    },
    {
        uri: "http://qldarch.net/rdf/resources#00012",
        label: "Cutt House"
    },
    {
        uri: "http://qldarch.net/rdf/resources#00013",
        label: "Queensland Agricultural College, Gatton"
    },
    {
        uri: "http://qldarch.net/rdf/resources#00014",
        label: "Gladstone Town Council, Memorial Park"
    },
    ],
    "http://qldarch.net/rdf#Award" : []
};

var types = {
    artifacts : [
      {
          uri: "http://qldarch.net/rdf#Interview",
          label: "Interview",
          plural: "Interviews",
          definition: "An audio or video recording of an interview."

      },
      {
          uri: "http://qldarch.net/rdf#Photograph",
          label: "Photograph",
          plural: "Photographs",
          definition: "An image created by light falling on a light-sensitive surface."
      },
      {
          uri: "http://qldarch.net/rdf#LineDrawing",
          label: "Line Drawing",
          plural: "Line Drawings",
          definition: "An image that consists of distinct straight and curved lines to represent two-dimensional or three-dimensional objects"
      }
    ],
    proper : [
      {
          uri: "http://qldarch.net/rdf#Architect",
          label: "Architect",
          plural: "Architects",
          definition: "A person who is or has been an Architect"

      },
      {
          uri: "http://qldarch.net/rdf#Firm",
          label: "Firm",
          plural: "Firms",
          definition: "A business with a recognised continuity of identity"
      },
      {
          uri: "http://qldarch.net/rdf#Client",
          label: "Client",
          plural: "Clients",
          definition: "An agent who has engaged an Architect or Firm on a project"
      },
      {
          uri: "http://qldarch.net/rdf#Structure",
          label: "Structure",
          plural: "Structures",
          definition: "A building, or other distinguishable part of our built environment"
      }
    ]
};

var contentByRdfType = {
    "http://qldarch.net/rdf#Interview" : [
        {
            uri: "http://qldarch.net/rdf/content#00001",
            label: "Interview with James Birrell",
            audio: "audio/Birrell_JM_and_AW.ogg",
            transcript: "transcript/Birrell.json",
            keywords: "James|Birrell|Interview",
            "rdf:type": "http://qldarch.net/rdf#Interview",
            "qldarch:relatedTo" : "http://qldarch.net/rdf/resources#00002"
        },
        {
            uri: "http://qldarch.net/rdf/content#00002",
            label: "Interview with Graham Bligh",
            audio: "audio/Bligh.ogg",
            transcript: "transcript/Bligh.json",
            keywords: "Graham|Bligh|Interview",
            "rdf:type": "http://qldarch.net/rdf#Interview",
            "qldarch:relatedTo": "http://qldarch.net/rdf/resources#00001",
        },
        {
            uri: "http://qldarch.net/rdf/content#00003",
            label: "Interview with Duncan McPhee",
            audio: "audio/Duncan.ogg",
            transcript: "transcript/Duncan.json",
            keywords: "Duncan|McPhee|Interview",
            "rdf:type": "http://qldarch.net/rdf#Interview",
            "qldarch:relatedTo": "http://qldarch.net/rdf/resources#00015",
        },
    ],
    "http://qldarch.net/rdf#Photograph" : [
        {
            uri: "http://qldarch.net/rdf/content#00004",
            label: "Queensland Agricultural College, Gatton, T4, photograph 1275",
            image: "img/7a2c5126d0315565abcc61e4648e9f42.jpg",
            keywords: "Queensland|Agricultural|College|Gatton|UQ",
            "rdf:type": "http://qldarch.net/rdf#Photograph",
            "qldarch:relatedTo" : "http://qldarch.net/rdf/resources#00007"
        },
        {
            uri: "http://qldarch.net/rdf/content#00005",
            label: "Queensland Agricultural College, Gatton, T3, photograph J765",
            image: "img/5f53e03162b04b747718dc24ff597f0b.jpg",
            keywords: "Queensland|Agricultural|College|Gatton|UQ",
            "rdf:type": "http://qldarch.net/rdf#Photograph",
            "qldarch:relatedTo" : "http://qldarch.net/rdf/resources#00007"
        },
        {
            uri: "http://qldarch.net/rdf/content#00006",
            label: "Queensland Agricultural College, Gatton, photograph 1661/4",
            image: "img/85e5db2c750c949497f60fc11cec43bd.jpg",
            keywords: "Queensland|Agricultural|College|Gatton|UQ",
            "rdf:type": "http://qldarch.net/rdf#Photograph",
            "qldarch:relatedTo" : "http://qldarch.net/rdf/resources#00007"
        },
        {
            uri: "http://qldarch.net/rdf/content#00007",
            label: "Hill Residence, Clayfield, Street view 1",
            image: "img/c74d234c2a40e08b4c1f3d0057c68798.jpg",
            keywords: "Hill|Clayfield",
            "rdf:type": "http://qldarch.net/rdf#Photograph",
            "qldarch:relatedTo" : "http://qldarch.net/rdf/resources#00007"
        },
        {
            uri: "http://qldarch.net/rdf/content#00008",
            label: "Hill Residence, Clayfield, Building detail",
            image: "img/5ad96a5487dbd3568c3070aed0615185.jpg",
            keywords: "Hill|Clayfield",
            "rdf:type": "http://qldarch.net/rdf#Photograph",
            "qldarch:relatedTo" : "http://qldarch.net/rdf/resources#00007"
        },
        {
            uri: "http://qldarch.net/rdf/content#00009",
            label: "Hill Residence, Clayfield, Street view 3",
            image: "img/0a5e2c442c2b0f01a507d63e848d5404.jpg",
            keywords: "Hill|Clayfield",
            "rdf:type": "http://qldarch.net/rdf#Photograph",
            "qldarch:relatedTo" : "http://qldarch.net/rdf/resources#00007"
        },
        {
            uri: "http://qldarch.net/rdf/content#00010",
            label: "Mt Gravatt Teachers College, facade",
            image: "img/0305f064f1780ab118c618f654b518bd.jpg",
            keywords: "Gravatt|Teachers|College",
            "rdf:type": "http://qldarch.net/rdf#Photograph",
            "qldarch:relatedTo" : "http://qldarch.net/rdf/resources#00007"
        },
        {
            uri: "http://qldarch.net/rdf/content#00011",
            label: "Mt Gravatt Teachers College, photograph 1209/8",
            image: "img/bef53097ca4e17b401b675f44dce83b6.jpg",
            keywords: "Gravatt|Teachers|College",
            "rdf:type": "http://qldarch.net/rdf#Photograph",
            "qldarch:relatedTo" : "http://qldarch.net/rdf/resources#00007"
        },
        {
            uri: "http://qldarch.net/rdf/content#00012",
            label: "Mt Gravatt Teachers College, scale model, photograph L73",
            image: "img/cff22b0f126283858aba02119fd0979d.jpg",
            keywords: "Gravatt|Teachers|College",
            "rdf:type": "http://qldarch.net/rdf#Photograph",
            "qldarch:relatedTo" : "http://qldarch.net/rdf/resources#00007"
        },
        {
            uri: "http://qldarch.net/rdf/content#00026",
            label: "Hayes House after alterations in 1966, St Lucia, view of the garden and the terrace",
            image: "img/08103c44713686e592059015d5cbdfea.jpg",
            keywords: "Hayes|Lucia",
            "rdf:type": "http://qldarch.net/rdf#Photograph",
            "qldarch:relatedTo" : "http://qldarch.net/rdf/resources#00006"
        },
        {
            uri: "http://qldarch.net/rdf/content#00027",
            label: "Hayes House, 1946, St Lucia, detail of garden",
            image: "img/29c993db3812d9be1a2721d0530a90ec.jpg",
            keywords: "Hayes|Lucia",
            "rdf:type": "http://qldarch.net/rdf#Photograph",
            "qldarch:relatedTo" : "http://qldarch.net/rdf/resources#00006"
        },
        {
            uri: "http://qldarch.net/rdf/content#00028",
            label: "Hayes House, 1946, St Lucia, view of the south-eastern facade",
            image: "img/e506d3c38364f354a24e47f1851146c9.jpg",
            keywords: "Hayes|Lucia",
            "rdf:type": "http://qldarch.net/rdf#Photograph",
            "qldarch:relatedTo" : "http://qldarch.net/rdf/resources#00006"
        },
        {
            uri: "http://qldarch.net/rdf/content#00029",
            label: "James Birrell Portrait",
            image: "img/james_birrell.jpg",
            keywords: "James|Birrell",
            "rdf:type": "http://qldarch.net/rdf#Photograph",
            "qldarch:relatedTo" : "http://qldarch.net/rdf/resources#00002"
        },
    ],
    "http://qldarch.net/rdf#LineDrawing" : [
        {
            uri: "http://qldarch.net/rdf/content#00013",
            label: "Commerce Building for the University of Queensland, Arial view from North-West",
            image: "img/9e43071d2e64f41379b247343f60b902.jpg",
            keywords: "Commerce|University|Queensland|UQ",
            "rdf:type": "http://qldarch.net/rdf#LineDrawing"
        },
        {
            uri: "http://qldarch.net/rdf/content#00014",
            label: "Commerce Building for the University of Queensland, Site & Earthworks",
            image: "img/2049829da9be94523bf5d69d91270e6a.jpg",
            keywords: "Commerce|University|Queensland|UQ",
            "rdf:type": "http://qldarch.net/rdf#LineDrawing"
        },
        {
            uri: "http://qldarch.net/rdf/content#00015",
            label: "Commerce Building for the University of Queensland, Sections",
            image: "img/807cee622792787afd2eb7170436e4ed.jpg",
            keywords: "Commerce|University|Queensland|UQ",
            "rdf:type": "http://qldarch.net/rdf#LineDrawing"
        },
        {
            uri: "http://qldarch.net/rdf/content#00016",
            label: "Commerce Building for the University of Queensland, Floor Plans",
            image: "img/92323ff8d0fcffbb0d98f8d8e6fc9210.jpg",
            keywords: "Commerce|University|Queensland|UQ",
            "rdf:type": "http://qldarch.net/rdf#LineDrawing"
        },
        {
            uri: "http://qldarch.net/rdf/content#00017",
            label: "Gladstone Town Council, Memorial park develoment, Aerial view",
            image: "img/64d01ecda3985391e4f7365ec3ae09c7.jpg",
            keywords: "Gladstone|Council|Park",
            "rdf:type": "http://qldarch.net/rdf#LineDrawing"
        },
        {
            uri: "http://qldarch.net/rdf/content#00018",
            label: "Gladstone Town Council, Memorial park develoment, Site layout",
            image: "img/792be1e292d49f497d4a8087f0f8c760.jpg",
            keywords: "Gladstone|Council|Park",
            "rdf:type": "http://qldarch.net/rdf#LineDrawing"
        },
        {
            uri: "http://qldarch.net/rdf/content#00019",
            label: "Gladstone Town Council, Memorial park develoment, Pool area, Site layout",
            image: "img/5017e7e7b6f5512c43ec97be94cb82cc.jpg",
            keywords: "Gladstone|Council|Park",
            "rdf:type": "http://qldarch.net/rdf#LineDrawing"
        },
        {
            uri: "http://qldarch.net/rdf/content#00020",
            label: "Queensland Agricultural College, Abattoir Poultry Technology, Plan, Elevations & Section",
            image: "img/f2e16805cf0768ec723244758833c1ce.jpg",
            keywords: "Queensland|Agricultural|Collge|Abattoir|Gatton|UQ",
            "rdf:type": "http://qldarch.net/rdf#LineDrawing"
        },
        {
            uri: "http://qldarch.net/rdf/content#00021",
            label: "Queensland Agricultural College, Abattoir Poultry, Floor plan, Section & Elevation",
            image: "img/707f4921e4230155e61583fe51bf43d7.jpg",
            keywords: "Queensland|Agricultural|Collge|Abattoir|Gatton|UQ",
            "rdf:type": "http://qldarch.net/rdf#LineDrawing"
        },
        {
            uri: "http://qldarch.net/rdf/content#00021",
            label: "Queensland Agricultural College, Abattoir Poultry, Floor plan, Section & Elevation",
            image: "img/707f4921e4230155e61583fe51bf43d7.jpg",
            keywords: "Queensland|Agricultural|Collge|Abattoir|Gatton|UQ",
            "rdf:type": "http://qldarch.net/rdf#LineDrawing"
        },
        {
            uri: "http://qldarch.net/rdf/content#00022",
            label: "Residence at Beecroft for Mr.&Mrs. R.J. Bligh, 1st Schematic layout",
            image: "img/003de94314ae7f58848335778768b4d6.jpg",
            keywords: "Residence|Beecroft|Bligh",
            "rdf:type": "http://qldarch.net/rdf#LineDrawing"
        },
        {
            uri: "http://qldarch.net/rdf/content#00023",
            label: "Residence at Beecroft for Mr.&Mrs. R.J. Bligh, Main floor plan & Section",
            image: "img/ce9b072c0161051c5b34cbae7e150f22.jpg",
            keywords: "Residence|Beecroft|Bligh",
            "rdf:type": "http://qldarch.net/rdf#LineDrawing"
        },
        {
            uri: "http://qldarch.net/rdf/content#00024",
            label: "Residence at Beecroft for Mr.&Mrs. R.J. Bligh, Plan & Elevations",
            image: "img/0c123cd362b8f82db3a7de97dbccd143.jpg",
            keywords: "Residence|Beecroft|Bligh",
            "rdf:type": "http://qldarch.net/rdf#LineDrawing"
        },
        {
            uri: "http://qldarch.net/rdf/content#00025",
            label: "Residence at Beecroft for Mr.&Mrs. R.J. Bligh, working drawing",
            image: "img/6b6c12cf89432eccb94c033b0301d16c.jpg",
            keywords: "Residence|Beecroft|Bligh",
            "rdf:type": "http://qldarch.net/rdf#LineDrawing"
        },
    ]
};
