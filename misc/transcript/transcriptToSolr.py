#!/usr/bin/env python

import sys
import json
import xml.etree.ElementTree as ET

def newDoc(file, exch):
    doc = ET.Element('doc')
    id = ET.SubElement(doc, 'field', { 'name' : 'id' })
    id.text = "%s#%s" % (file, exch['time'])
    interview = ET.SubElement(doc, 'field', { 'name' : 'interview' })
    interview.text = file
    time = ET.SubElement(doc, 'field', { 'name' : 'time' })
    time.text = exch['time']
    transcript = ET.SubElement(doc, 'field', { 'name' : 'transcript' })
    transcript.text = exch['transcript']

    return doc

    
if __name__ == '__main__':
    for file in sys.argv[1:]:
        with open(file) as f:
            data = json.load(f)
            root = ET.Element('add', commitWithin='5000')
            elements = [ newDoc(file, exch) for exch in data['exchanges'] ]
            for e in elements:
                root.append(e)
            ET.ElementTree(root).write("%s.xml" % (file,), "UTF-8")
            
