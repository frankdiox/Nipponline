var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    nconf = require('nconf');

nconf.file('config.json');

var authLang = nconf.get('db_lang:user') && nconf.get('db_lang:pass') ? nconf.get('db_lang:user')+':'+nconf.get('db_lang:pass')+'@' : '',
    authForum = nconf.get('db_forum:user') && nconf.get('db_forum:pass') ? nconf.get('db_forum:user')+':'+nconf.get('db_forum:pass')+'@' : '';

var dbLang = mongoose.createConnection('mongodb://'+authLang+nconf.get('db_lang:location')+':'+nconf.get('db_lang:port')+'/'+nconf.get('db_lang:name')),
    dbForum = mongoose.createConnection('mongodb://'+authForum+nconf.get('db_forum:location')+':'+nconf.get('db_forum:port')+'/'+nconf.get('db_forum:name'));

var syllabes = dbLang.model('syllabes', 
    new Schema({}, { collection : 'syllabes' }));

var users = dbForum.model('users',
    new Schema({}, { collection : 'objects'}));

exports.getSyllabes = function(find, callback){

    syllabes.find(find, function(err,docs){
        if(err){
            callback(err);
        }

        if(docs == []){
            callback(new Error('Syllabes not found'));
        }
        else{
            callback(err,docs);
        }
    });

};

exports.getUidByUsername = function(username, callback){

    users.findOne({'_key': 'username:uid'},{'_id':0}).select(username).exec(function(err,doc){
        if(err){
            callback(err);
        }

        doc = JSON.stringify(doc);

        if(!doc){
            callback(new Error('User does not exist'));
        }
        else{
            callback(null,JSON.parse(doc)[username]);
        }
    });

};

exports.getUserFields = function(uid, fields, callback){

    var selectQuery = '';
    for(var i=0; i<fields.length; i++){
        selectQuery += ' '+fields[i];
    }

    users.findOne({'_key': 'user:'+uid},{'_id':0}).select(selectQuery).exec(function(err,doc){
        if(err){
            callback(err);
        }

        doc = JSON.stringify(doc);

        if(!doc){
            callback(new Error('User or fields don\'t not exist'));
        }
        else{
            callback(null,JSON.parse(doc));
        }
    });

};