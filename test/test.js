var assert  = require('assert');
var twitter = require('twitter');
var JSDOM   = require('JSDOM');

var main    = require('./../app/main.js');


// test twitter upload
// test ehentai access
// test ehentai page format
// test ehentai cover format
// test nhentai access
// test nhentai page format
// test nhentai cover format


/**
* Global variables
**/
var client = main.client;

var past         = main.past;
var magazines    = main.magazines;
var time         = main.time;
var tweet        = main.tweet;
var tweet_cover  = main.tweet_cover;
var check_date   = main.check_date;
var check_result = main.check_result;
var parse_site   = main.parse_site;
var query_site   = main.query_site;
var query_sites  = main.query_sites;


describe('JSON', function()
    {
        it('Past format is correct', function()
            {
                assert( typeof past.ehentai === 'string', 'ehentai past entry is not a string' );
                assert( typeof past.nhentai === 'string', 'nhentai past entry is not a string' );
            });
        it('Magazine format is correct', function()
            {
                var is_correct = true;
                
                for(var i = 0; i < magazines.length; i++)
                    {
                        is_correct = magazines[i].name         !== undefined
                            && magazines.pretty                !== undefined
                            && magazines.last                  !== undefined
                            && magazines.search                !== undefined
                            && magazines.search.ehentai        !== undefined
                            && magazines.search.ehentai.romaji !== undefined
                        
                        if(!is_correct) { break; }
                    }
                
                assert(true, 'Magazine format is not correct.');
            });
        
    });

describe('Check twitter', function()
    {
        it('Get status', function(done)
            {
                client.get('statuses/home_timeline', function(err, tweets)
                    {
                        if(err) { throw err; }
                        
                        assert(true, 'Could not access twitter');
                        done();
                    });
            });
    });

