
var express = require('express');
var request = require('request');
var cheerio = require('cheerio');
var mongoose = require('mongoose');

var Article = require('../models/article');
var Comment = require('../models/comment');


var router = express.Router();


router.get('/', function (req, res) {
    //find all the articles
    Article.find({}).sort({_id: 'desc'}).exec(function (err, data) {
        //put everything found into an array
        var dataIn = [];
        // For each article, create an object that handlebars will use to render the article.
        data.forEach(function (article) {
            dataIn.push({
                title: article.title,
                link: article.link,
                blurb: article.blurb,
                author: article.author,
                image: article.image,
                articleID: article.articleID
            });
        });
        // Render index based on the result object compiled above.
        res.render('index', {result: dataIn});
    });
});


router.get('/:id', function(req, res) {
    //get comments 
    // ID is the article ID.
    var articleID = req.params.id;
    // Find all comments for that article ID.
    Article.find({articleID: articleID}).populate('comments').exec(function(err, data) {
        if (err) {
            console.log(err);
        } else {
            if (data.length > 0) {
                var commentData = [];
                data[0].comments.forEach(function(comment) {
                    commentData.push({
                        id: comment._id,
                        author: comment.author,
                        text: comment.text,
                        timestamp: comment.timestamp,
                        articleID: articleID
                    });
                });

                var articleTitle = data[0].title;
                var link = data[0].link;
                commentData.push({articleID: articleID, articleTitle: articleTitle, link: link});

                res.render('comment', {commentData: commentData});
            } else {
                res.redirect('/');
            }
        }
    });
});


router.get('/api/news', function (req, res) {
    //scrape data
    console.log("hit the scrape news route");
    //goto VOX news and get the data
    request('https://www.vox.com/news', function (error, response, html) {

        //convert data to a readable format
        var $ = cheerio.load(html);

        //expect data to come in with 'm-block' and i: and element:
        $('.m-block').each(function (i, element) {

            //stuff from the article
            var title = $(element).children('.m-block__body').children('header').children('h3').text();
            var link = $(element).children('.m-block__body').children('header').children('h3').children('a').attr('href');
            var blurb = $(element).children('.m-block__body').children('.m-block__body__blurb').text();

            //all the authors
            var author = [];
            var authorsObject = $(element).children('.m-block__body').children('.m-block__body__byline').children('a');

            //account for only 1 entry
            if (authorsObject.length === 1) {
                author = authorsObject.text();
            // If the byline section has multiple items,
            } else {
                for (var k = 0; k < authorsObject.length; k++) {
                    //push all the authors into the array
                    author.push(authorsObject[k].children[0].data);
                }
                //if more than one author, put in "&" between them
                author = author.join(' & ');
            };

            // any images ?
            var image = $(element).children('.m-block__image').children('a').children('img').data('original');

            //id to be used if it was grabbed before
            var articleID = $(element).children('.m-block__body').children('.m-block__body__byline').children('span').data('remote-admin-entry-id');

            //mongoose schema
            var newArticle = {
                title: title,
                link: link,
                blurb: blurb,
                author: author,
                image: image,
                articleID: articleID
            };

            // We're going to query the Article collection for an article by this ID.
            var query = {articleID: articleID};

            // Run that query. If matched, update with 'newArticle'. If no match, create with 'newArticle.'
            Article.findOneAndUpdate(query, newArticle, {upsert: true}, function (err) {
                if (err) {
                    console.log(err);
                    throw err;
                };
            });
        });
        res.redirect('/');

    });
});


router.post('/api/comment/:article', function(req, res) {
    //add new comment
    console.log('hit add comment route');
    var articleID = req.params.article;
    var text = req.body.text;
    var author = req.body.author;

    var newComment = {
        text: text,
        author: author
    };

    Comment.create(newComment, function(err, data) {
        if (err) {
            console.log(err);
        } else {
            Article.findOneAndUpdate({articleID: articleID}, { $push: { 'comments': data._id } }, { new: true }, function(error) {
                if (error) {
                    console.log(error);
                } else {
                    res.redirect('/' + articleID);
                }
            });
        }
    });

});

router.get('/api/comment/:article/:comment', function(req, res) {
    //deleting old comments
    //shouldn't be a get, change later
    console.log('hit the delete route');
    var id = req.params.comment;
    var articleID = req.params.article;
    Comment.remove({_id: id}, function(err) {
        if (err) {
            console.log(err);
        } else {
            Article.findOneAndUpdate({articleID: articleID}, { $pull: { comments: id } }, {safe: true}, function(error, data) {
                if (error) {
                    console.log(error);
                } else {
                    console.log(data);
                    res.redirect('/' + articleID);
                }
            });
        }
    });
});


console.log("controller loaded");
/*      as a last step after app is running to stop bad routes
router.use('*', function (req, res) {
    res.redirect('/');
});
*/

// Export routes.
module.exports = router;
