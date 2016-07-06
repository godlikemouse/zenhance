/*!
 * zenhance
 * Copyright(c) 2016 Jason Graves
 * MIT Licensed
 */

'use strict';

var express = require('express');
var fs = require('fs');
var path = require('path');

var app = express();
var server = null;

var configuration = {
	path: {
		root: null,
		application: null,
		configs: null,
		controllers: null,
		models: null,
		views: null,
		scripts: null,
		public: null
	},
	encoding: 'UTF-8',
	server: {
		port: 3000,
		static: [
			'public'
		]
	},
	template: {
		engine: 'handlebars'
	},
	error: {
		reporting: true
	}
}

var cache = {}

//object for handling routing
var Routing = {

	//method for pascal casing a string value
	pascalCase: function(value){

		value = value.toLowerCase();

		if(value){
			var parts = value.split('-');
			for(var i=0; i<parts.length; i++){
				parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].slice(1);
			}
			value = parts.join('');
		}

		return value;
	},

	//method for camel casing a string value
	camelCase: function(value){

		if(value){
			var parts = value.split('-');
			for(var i=0; i<parts.length; i++){
				if(i > 0)
					parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].slice(1);
			}
			value = parts.join('');
		}

		return value;
	},

	//method for handling a controller request
	onRequest: function(request, response){
		//format "controller" / "action"
		var parts = request._parsedUrl.pathname.substring(1).split('/');

		//sanitize parts removing empty entries
		for(var i=parts.length-1; i>=0; i--){
			if(!parts[i].length)
				parts.splice(i,1);
		}

		//create routing object
		var index = 0;
		var controllerPath = parts.length ? parts[index++].toLowerCase() : 'index';
		var actionPath = parts.length > 1 ? parts[index++] : 'index';

		var routing = {
			controller: {
				path: controllerPath,
				name: Routing.pascalCase(controllerPath + '-controller')
			},
			action: {
				path: actionPath,
				name: Routing.camelCase(actionPath + '-action')
			}
		};

		//zend style parameters
		if(!request.parameters)
			request.parameters = {};

		//build zend parameters
		parts = parts.slice(index);
		for(var i=0; i<parts.length; i++){
			var key = parts[i];
			var value = parts[i+1] ? parts[i+1] : undefined;
			request.parameters[key] = value;
			i++;
		}

		//build old query style parameters
		if(request._parsedUrl.query){
			var parts = request._parsedUrl.query.split('&');
			for(var i in parts){
				var kv = parts[i].split('=');
				request.parameters[ kv[0] ] = kv[1];
			}
		}

		//load controller
		try{
			var filename = [configuration.path.controllers, routing.controller.name + '.js'].join(path.sep);
			var controllerClass = cache[filename];

			if(!controllerClass){
				var controllerPath = [configuration.path.controllers, routing.controller.name + '.js'].join(path.sep);

				//verify controller exists
				if(!fs.existsSync(controllerPath))
					throw new Error(routing.controller.name + ' (' + [configuration.path.controllers, routing.controller.name + '.js'].join(path.sep) + ') not found.');

				var content = fs.readFileSync(controllerPath, configuration.encoding);
				var controllerClass = eval(content);
				cache[filename] = controllerClass;
			}

			Routing.forward(request, response, controllerClass, routing);
		}
		catch(ex){
			publishError(ex, response);
		}
	},

	forward: function(request, response, controllerClass, routing){
		try{
			var controller = new controllerClass();
			controller.view = {};
			controller.request = request;
			controller.response = response;

			if(!controller[routing.action.name])
				throw new Error(routing.action.name + " not found in controller " + routing.controller.name + ' (' + [configuration.path.controllers, routing.controller.name + '.js'].join(path.sep) + ')');

			controller[routing.action.name]();

			if(!controller.disableRenderer)
				response.render(routing.controller.path + '/' + routing.action.path, controller.view);
		}
		catch(ex){
			publishError(ex, response);
		}
	}
}





//method for initializing Zenhance
function initialize(next){

	//set root directory
	configuration.path.root = path.dirname(require.main.filename);

	//create barebones application

	//create the public directory if it doesn't exist
	configuration.path.public = [configuration.path.root, 'public'].join(path.sep);
	if(!fs.existsSync(configuration.path.public))
		fs.mkdirSync(configuration.path.public);

	//create the application directory if it doesn't exist
	configuration.path.application = [configuration.path.root, 'application'].join(path.sep);
	if(!fs.existsSync(configuration.path.application))
		fs.mkdirSync(configuration.path.application);

	//create the configs directory if it doesn't exist
	configuration.path.configs = [configuration.path.application, 'configs'].join(path.sep);
	if(!fs.existsSync(configuration.path.configs))
		fs.mkdirSync(configuration.path.configs);

	//create the controllers directory if it doesn't exist
	configuration.path.controllers = [configuration.path.application, 'controllers'].join(path.sep);
	if(!fs.existsSync(configuration.path.controllers))
		fs.mkdirSync(configuration.path.controllers);

	//create the models directory if it doesn't exist
	configuration.path.models = [configuration.path.application, 'models'].join(path.sep);
	if(!fs.existsSync(configuration.path.models))
		fs.mkdirSync(configuration.path.models);

	//create the views directory if it doesn't exist
	configuration.path.views = [configuration.path.application, 'views'].join(path.sep);
	if(!fs.existsSync(configuration.path.views))
		fs.mkdirSync(configuration.path.views);

	//create the views/scripts directory if it doesn't exist
	configuration.path.scripts = [configuration.path.views, 'scripts'].join(path.sep);
	if(!fs.existsSync(configuration.path.scripts))
		fs.mkdirSync(configuration.path.scripts);

	//create default index controller
	var sourceController = [__dirname, '../default/controllers/IndexController.js'].join(path.sep);
	var destinationController = [configuration.path.controllers, 'IndexController.js'].join(path.sep);
	if(!fs.existsSync(destinationController))
		fs.createReadStream(sourceController).pipe(fs.createWriteStream(destinationController));

	//create default index view directory
	var viewPath = [configuration.path.scripts, 'index'].join(path.sep);
	if(!fs.existsSync(viewPath))
		fs.mkdirSync(viewPath);

	//create default index view
	var sourceView = [__dirname, '../default/views/index/index.handlebars'].join(path.sep);
	var destinationView = [viewPath, 'index.handlebars'].join(path.sep);
	if(!fs.existsSync(destinationView))
		fs.createReadStream(sourceView).pipe(fs.createWriteStream(destinationView));

	//create default error view directory
	var viewPath = [configuration.path.scripts, 'error'].join(path.sep);
	if(!fs.existsSync(viewPath))
		fs.mkdirSync(viewPath);

	//create default error controller
	var sourceController = [__dirname, '../default/controllers/ErrorController.js'].join(path.sep);
	var destinationController = [configuration.path.controllers, 'ErrorController.js'].join(path.sep);
	if(!fs.existsSync(destinationController))
		fs.createReadStream(sourceController).pipe(fs.createWriteStream(destinationController));

	//create default view
	var sourceView = [__dirname, '../default/views/error/index.handlebars'].join(path.sep);
	var destinationView = [viewPath, 'index.handlebars'].join(path.sep);
	if(!fs.existsSync(destinationView))
		fs.createReadStream(sourceView).pipe(fs.createWriteStream(destinationView));

	//create the application.ini file if it doesn't exist
	var applicationJSON = [configuration.path.configs, 'application.json'].join(path.sep);
	if(!fs.existsSync(applicationJSON)){
		fs.writeFile(applicationJSON, JSON.stringify(configuration, null, 4), configuration.encoding, function(error){
			if(error)
				console.error(error);
		});
	}

	//read configuration file if available
	fs.readFile(applicationJSON, configuration.encoding, function(error, data) {
		try{
			if(error)
				throw error;

			if(data)
				module.exports.configuration = configuration = JSON.parse(data);

			next();
		}
		catch(ex){
			console.error(ex);
		}
	});

}

//method for pretty printing errors
function publishError(error, response){

	if(configuration.error.reporting){
		var message = [
			'<h1>Zenhance Error</h1>',
			'<p><strong>',
			error.message,
			'</strong></p>',
			'<code>',
			error.toString(),
			'</code>'
		];

		response.send( message.join('') );
	}

	console.error(error);
}

//starts the zendhance server
function start(){
	server = app.listen(configuration.server.port, function(){
		console.info(' ');
		console.info('----------------------------------------');
		console.info('Zenhance is running (', configuration.template.engine, ')');
		console.info('----------------------------------------');
		console.info(' ');
		console.info('http://localhost:' + configuration.server.port);
		console.info(' ');
	});
}

//stops the zenhance server
function stop(){
	console.info('Stopping Zenhance...');

	if(server)
		server.stop();

	console.info('Zenhance stopped.');
}


module.exports = {
	configuration: configuration,
	run: function(){
		initialize(function(){
			for(var i in configuration.server.static){
				app.use(express.static(configuration.server.static[i]));
			}

			//forward everything to the controller helper
			app.all('*', Routing.onRequest);

			//setup templating engine

			//add handlebars hook for use with express
			app.engine('handlebars', function(filePath, options, callback){
				var handlebars = require('handlebars');

				if(!fs.existsSync(filePath))
					return callback(null, 'Error: view file ' + filePath + ', does not exist.');

				fs.readFile(filePath, configuration.encoding, function(error, content){
					try{
						var template = handlebars.compile(content);
						var rendered = template(options);
						return callback(null, rendered);
					}
					catch(ex){
						return callback(null, ex);
					}
				});

				//register partial helper function
				//allows for the use of partial 'path/to/partial' arg1=value1
				if(!handlebars.__partialHelper){
					handlebars.__partialHelper = function(context, options){
						try{
							var partialPath = [configuration.path.scripts, 'partials'].concat(context.split('/')).join(path.sep) + '.handlebars';
							var content = fs.readFileSync(partialPath, configuration.encoding);
							var template = handlebars.compile(content);
							var rendered = template(options.hash);
							return new handlebars.SafeString(rendered);
						}
						catch(ex){
							return ex;
						}
					}
					handlebars.registerHelper('partial', handlebars.__partialHelper);
				}
			});

			app.set('view engine', configuration.template.engine);
			app.set('views', configuration.path.scripts);

			//start the server
			start();

			//file watcher for automatic restart of files
			fs.watch(configuration.path.root, {recursive: true}, function(event, filename){

				//configuration file change
				if(filename.indexOf('application.json') > -1){

					//restart the server
					stop();
					start();
				}

				//remove model from require cache
				else if(filename.indexOf('application/models') > -1){
				   delete require.cache[ path.resolve(filename) ]
				}

				//controller change
				else if(filename.indexOf('application/controllers') > -1){
					try{
						delete cache[path.resolve(filename)];
					}
					catch(ex){}
				}

			});
		});
	},
	model: function(name){
		return require([configuration.path.models, name].join(path.sep));
	}
}


