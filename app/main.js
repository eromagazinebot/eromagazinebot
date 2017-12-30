/**
* NAME
*   Ero Magazine Bot
*
* DESCRIPTION
*   Ero magazine web scrapper twitter bot
*
* VERSION
*   0.1.0
*
* USAGE
*   Run it with npm start or grunt
*
* TEST ARGUMENTS
*   grunt run    - Run the bot
*   grunt jshint - Run jshint
*   grunt watch  - Run grunt-contrib-watch
*   
* SUBROUTINES
*   time            - Get locale time string
*   tweet           - Tweet string with optional media
*   tweet_cover     - Download cover
*   check_date      - Check result date
*   check_result    - Check the parsed results
*   parse_site      - Parse results downloaded by query_site
*   query_site      - Query a site and download results
*   query_sites     - Entry point, query all sites
*
* LICENSE
*   GNU Public License 3.0
*
* AUTHOR
*   Santasansan
**/


/**
* BASIC BOT STRUCTURE
*
* query_sites
* -> query_site(parse_site)     Download site and parse results
* -> check_result(check_cover)  Check if there is a match for every result and if so check the date
* -> tweet_cover                Get the cover
* -> tweet                      Upload the cover to twitter and add it to the tweet
*
**/

/**
* TODO
*
* Get cols attributes in a more elegant way
**/

var request    = require('request');
var jsonfile   = require('jsonfile');
var JSDOM      = require('jsdom').JSDOM;
var Twitter    = require('twitter');


/**
* Constants
**/
const DEBUG = true;

const CONSUMER_KEY        = ':)';
const CONSUMER_SECRET     = ':)';
const ACCESS_TOKEN        = ':)';
const ACCESS_TOKEN_SECRET = ':)';

const EHENTAI_SETTINGS =
    {
        'f_doujinshi': 1,
        'f_manga'    : 1,
        'f_artistcg' : 0,
        'f_gamecg'   : 0,
        'f_western'  : 0,
        'f_non-h'    : 0,
        'f_imageset' : 0,
        'f_cosplay'  : 0,
        'f_asianporn': 0,
        'f_misc'     : 0,
        'f_apply'    : 'Apply+Filter'
    };

const MONTHS =
    ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
const IS_TEST = !!process.argv[1].match('mocha');


/**
* Global variables
**/
var client = new Twitter
    ({
        consumer_key:        CONSUMER_KEY,
        consumer_secret:     CONSUMER_SECRET,
        access_token_key:    ACCESS_TOKEN,
        access_token_secret: ACCESS_TOKEN_SECRET
    });


var past;
var magazines;

var resume = '';    // Resume of results
var done   = 0;     // Number of queries done
var site_n = 2;     // Number of sites


/***************************************
* Name        : time
* Description : Get locale time string
* Takes       : Nothing
* Returns     : (str) - Time string
***************************************/
function time() { return (new Date()).toLocaleTimeString(); }


/*******************************************************************
* Name        : tweet
* Description : Tweet class helper function
* Takes       : (str) - String to tweet
*               [url] - Url of the image to be uploaded to twitter
* Returns     : Nothing
*******************************************************************/
function tweet(str, url)
    {
        var status = { status: str };
        
        if(url)
            {
                request( {method: 'GET', url: url, encoding: null }, function(err, res)
                    {
                        if(err) { throw err; }
                        console.log('  Got image.');
                        
                        
                        client.post('media/upload', { media: res.body }, function(err, media)
                            {
                                if(err) { throw err; }
                                console.log('  Media uploaded.');
                                
                                status.media_ids = media.media_id_string;
                                
                                client.post('statuses/update', status, function(err, tweet)
                                    {
                                        if(err) { throw err; }
                                        console.log('  Tweet successful: ' + tweet + '.');
                                    });
                            });
                    });
            }
        else
            {
                client.post('statuses/update', status, function(err, tweet)
                    {
                        if(err) { throw err; }
                        console.log('  Tweet successful: ' + tweet + '.');
                    });
            }
    }


/*********************************************************
* Name        : tweet_cover
* Description : Download the response cover and tweet it
* Takes       : res (obj) - Result object
* Returns     : Nothing
*********************************************************/
function tweet_cover(res)
    {
        var doc;
        var str;
        var index;
        var img_url, page_url;
        
        
        // Set the tweet text
        for(var i = 0; i < magazines.length; i++) { if(magazines[i].name === res.name) { index = i; break; } }
        
        if(res.y !== undefined)
            {
                str = `The ${MONTHS[res.m-1]} ${res.y} issue of ${magazines[index].pretty} is out at ${res.link}!`;
            }
        else if(res.n !== undefined)
            {
                str = `The Vol.${res.n} of ${magazines[index].pretty} is out at ${res.link}!`;
            }
        
        
        if(res.site === 'ehentai')
            {
                request( { method: 'GET', url: res.link }, function(err, response, body)
                    {
                        doc = (new JSDOM(body)).window.document;
                        
                        // If the page has offensive protection, return
                        if(doc.getElementsByClassName('gdtm').length === 0)
                            {
                                console.log(` ERROR: COULDN\'T DOWNLOAD GALLERY ${res.title} BECAUSE OF OFFENSIVE PROTECTION`);
                                return;
                            }
                        
                        page_url = doc.getElementsByClassName('gdtm')[0].children[0].children[0].href;
                        request( { method: 'GET', url: page_url }, function(err, response, body)
                            {
                                doc = (new JSDOM(body)).window.document;
                                
                                img_url = doc.getElementById('img').src;
                                
                                tweet(str, img_url);
                            });
                    });
            }
        else if(res.site === 'nhentai')
            {
                request( { method: 'GET', url: res.link+'/1' }, function(err, response, body)
                    {
                       doc = (new JSDOM(body)).window.document;
                       
                       img_url = doc.getElementById('image-container').children[0].children[0].src;
                       
                       tweet(str, img_url);
                    });
            }
    }


/***********************************************************
* Name        : check_date
* Description : Check if the result is new, actual or old
* Takes       : last  (obj) - Last uploaded magazine date
*               match (arr) - Regex match from the result name
*               res   (obj) - Result
* Returns     : (int) - 1 (new) 0 (actual) -1 (old)
***********************************************************/
function check_date(last, match, res)
    {
        if(last.y !== undefined && last.m !== undefined) { res.y = parseInt(match[1]); res.m = parseInt(match[2]); }
        else { res.n = parseInt(match[1]); }
        
        
        // New
        if     (last.y !== undefined && res.y > last.y) { return 1; }                                             // y-m
        else if(last.y !== undefined && last.m !== undefined && res.y === last.y && res.m > last.m) { return 1; }  // y-m
        else if(last.y === undefined && last.n !== undefined && res.n > last.n) { return 1; }                     // n
        
        // Actual
        else if(last.y !== undefined && last.m !== undefined && last.y === res.y && last.m === res.m) { return 0; } // y-m
        else if(last.y === undefined && last.n !== undefined && last.n === res.n) { return 0; }                    // n
        
        // Old
        else { return -1; }
    }


/*****************************************************************
* Name        : check_result
* Description : Check every result date and tweet it if it's new
* Takes       : res (obj) - Result object
* Returns     : Nothing
*****************************************************************/
function check_result(res)
    {
        if(DEBUG)
            {
                console.log(`\n  [${time()}] Got ${res[0].site} - ${res.length} results | Most recent upload: ${res[0].title}`);
            }


        // Check if it has changed
        if( past[ res[0].site ] === res[0].link && !DEBUG )
            {
                return;
            }
        else
            {
                console.log(`  [${time()}] New anthology found: ${res[0].title}`);
                
                past[res[0].site] = res[0].link;
                jsonfile.writeFileSync('./app/json/past.json', past);
            }
        
        
        
        if(DEBUG) { console.log(`\n  [${time()}] Checking results of ${res[0].site}`); }
        
        
        resume += `\n${res[0].site}\n`;
        
        // For each result
        ENTRY:
        for(var i = 0; i < res.length; i++)
            {
                // For each magazine
                for(var j = 0; j < magazines.length; j++)
                    {
                        var name   = magazines[j].name;
                        var last   = magazines[j].last;
                        var search = magazines[j].search;
                        
                        res[i].name = name; // Set name to reference it in the tweet
                        
                        
                        var regex = new RegExp(search.ehentai.romaji, 'i');
                        var match = res[i].title.match(regex, 'g');
                        
                        // If there is a match check its status
                        if(match)
                            {
                                var is_new = check_date(last, match, res[i]);
                                var status = is_new ===  1 ? '!' :
                                             is_new ===  0 ? 'A' :
                                             is_new === -1 ? 'O' :
                                                            'ERROR';
                                
                                // Add status to resume
                                resume += is_new === 1 ? ' ! ' : '['+status+']';
                                
                                        
                                // Add new date to magazines.json if it's new
                                if(is_new === 1)
                                    {
                                        if(last.y !== undefined) // y-m
                                            {
                                                magazines[j].last.y = parseInt(match[1]);
                                                magazines[j].last.m = parseInt(match[2]);
                                            }
                                        if(last.n !== undefined) // n
                                            {
                                                magazines[j].last.n = last.y === undefined ? parseInt(match[1])
                                                    : parseInt(match[3]);
                                            }
                                        
                                        console.log(' -- NEW MAGAZINE -- ' + magazines[j].pretty);
                                        jsonfile.writeFileSync('./app/json/magazines.json', magazines);
                                        console.log(res[i]);
                                        tweet_cover(res[i]);
                                    }
                                if(DEBUG)
                                    {
                                        // Recognized
                                        console.log( `    [${status}] ${res[i].title}: ${name}\n\t${res[i].link}\n`);
                                    }
                                
                                continue ENTRY;
                            }
                    }
                
                // Not recognized
                if(DEBUG)
                    {
                        console.log(`     ?  ${res[i].title}\n\t${res[i].link}\n`);
                    }
                
                resume += ' ? ';
            }
        
        
        done++;
        
        if(done == site_n)
            {
                console.log(resume);
            }
    }


/************************************************
* Name        : parse_site
* Description : Parse html into a result object
* Takes       : site (str) - Site to be parsed
*               body (str) - HTML body
* Returns     : res (obj)  - Result object
************************************************/
function parse_site(site, body)
    {
        var res = [];
        var cols, type, date, data, title, link;
        var i, j;
        
        
        if(site === 'ehentai')
            {
                var doc = (new JSDOM(body).window.document);
                
                /*
                * First row         : Table header
                * Second row - last : Results
                */
                var table = doc.getElementsByClassName('itg')[0];
                if(!table) { return undefined; }
                
                var rows = table.children[0] // tbody
                    .children;               // rows
                
                for(i = 1; i < rows.length; i++)
                    {
                        /*
                        * Columns : [0]type - [1]published - [2]name/link - [3]uploader
                        * [2]data : [0]img -  [1]null      - [2]a         - [3]style div
                        */
                        cols = rows[i].children;
                        if(cols[0].children[0].nodeName !== 'A') { continue; } // Skip ads
                        
                        
                        type = cols[0].children[0].innerHTML.match('alt="(.+?)"');
                        date = cols[1].textContent;
                        
                        data = cols[2].children[0]  // element list
                            .children[2];               // a
                        title = data.textContent;
                        link  = data.innerHTML.match('href="(.+?)"');
                        
                        
                        type = type[1] === undefined ? 'undef' : type[1];
                        link = link[1] === undefined ? 'undef' : link[1];
                        
                        res.push
                            ({
                                site  : 'ehentai',
                                title : title,
                                type  : type,
                                date  : date,
                                link  : link
                            });
                    }
            }
        else if(site === 'nhentai')
            {
                var json = JSON.parse(body);
                if(json.error !== undefined) { console.log('  ERROR (nhentai) - ' + json.error); return []; }
                
                for(i = 0; i < json.result.length; i++)
                    {
                        type = 'undefined';
                        
                        for(j = 0; j < json.result[i].tags.length; j++)
                            {
                                if(json.result[i].tags[j].type === 'category')
                                    {
                                        type = json.result[i].tags[j].name;
                                        break;
                                    }
                            }
                        
                        res.push
                            ({
                                site  : 'nhentai',
                                title : json.result[i].title.english,
                                type  : type,
                                date  : json.result[i].upload_date,
                                link  : 'https://nhentai.net/g/'+json.result[i].id
                            });
                    }
            }
            
        
        return res;
    }


/******************************************************
* Name        : query_site
* Description : Query a site and download search page
* Takes       : site   (str) - Site to be queried
*               search (str) - Search string
*               page   (int) - Result page
* Returns     : Nothing
******************************************************/
function query_site(site, search, page)
    {
        var entries     = [];
        var ehentai_url = '';
        var nhentai_url = '';
        
        // Concatenate query
        search = search.split(' ').join('+');
        
        
        ehentai_url = `http://e-hentai.org/?page=${page}&f_search=${search}`;
        for(var key in EHENTAI_SETTINGS) { ehentai_url += ( '&'+key+'='+EHENTAI_SETTINGS[key] ); }
        
        nhentai_url = `https://nhentai.net/api/galleries/search?query=${search}&page=${page}`;
        
        var url = site === 'ehentai'
            ? ehentai_url
            : site === 'nhentai'
                ? nhentai_url
                : undefined;
        
        
        request({ method: 'GET', url: url }, function(err, res, body)
            {
                if(err) { throw err; }
                
                entries = parse_site(site, body);
                if(entries.length === 0) { console.log('No match: ' + search); return; }
                
                check_result(entries);
            });
    }


/*********************************************
* Name        : query_sites
* Description : Query all available sites
* Takes       : search (str) - Search string
* Returns     : Nothing
*********************************************/
function query_sites(search)
    {
        console.log(`\n\n\n\n [${time()}] QUERYING SITES\n`);
        
        query_site('nhentai', search, 1); // Base page is 1
        query_site('ehentai', search, 0); // Base page is 0
    }



/**
* Execution
**/
try
    {
        past      = jsonfile.readFileSync('./app/json/past.json');
        magazines = jsonfile.readFileSync('./app/json/magazines.json');
    }
catch(err)
    {
        throw err;
    }


if(IS_TEST)
    {
        exports.client = client;
        
        exports.past         = past;
        exports.magazines    = magazines;
        exports.time         = time;
        exports.tweet        = tweet;
        exports.tweet_cover  = tweet_cover;
        exports.check_date   = check_date;
        exports.check_result = check_result;
        exports.parse_site   = parse_site;
        exports.query_site   = query_site;
        exports.query_sites  = query_sites;
    }
else
    {
        query_sites('anthology');
    }