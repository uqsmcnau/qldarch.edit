#!/usr/bin/env ruby

fnre = /.*\.png/

ARGV.each { |arg|
    if arg =~ fnre
        fin = arg
        fout = arg.sub(/\.png$/, '_19x27.png')
        result = `convert #{fin} -resize 19x27 #{fout}`
        puts 'Converting #{fin} #{fout} returned #{result}'
    else
        puts 'Input file must be a .png: #{arg}'
    end
}
