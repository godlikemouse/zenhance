/*!
 * zenhance
 * Copyright(c) 2016 Jason Graves
 * MIT Licensed
 */

'use strict';

var express = require('express');
var fs = require('fs');
var path = require('path');
var pathToRegexp = require('path-to-regexp');
var readline = require('readline');

var app = express();
var server = null;

var configuration = {
	path: {
		root: null,
		application: null,
		library: null,
		configs: null,
		controllers: null,
		models: null,
		views: null,
		layouts: null,
		scripts: null,
		public: null
	},
	encoding: 'UTF-8',
	server: {
		port: 3000,
		static: [
			'/public',
			'/favicon.ico'
		]
	},
	template: {
		engine: 'handlebars',
		layout: null
	},
	error: {
		reporting: true
	}
}

//registry object
var Registry = {
	_builtIn: {
		helpers: [
			'headScript',
			'headLink'
		]
	},
	_headScript: {},
	_headLink: {},

	helpers: {

		//method for retrieving head script helper
		headScript: function() {
			return {

				//method for initializing helper
				init: function(){
					Registry._headScript = {};
				},

				//method for setting a file
				setScript: function(src, type, attrs){
					type = type ? type : 'text/javascript';
					attrs = attrs ? attrs : {};

					var _attrs = [];
					for(var i in attrs){
						_attrs.push(`${i}="${attrs[i]}"`);
					}
					attrs = _attrs.join(' ');

					Registry._headScript[src] = `<script src="${src}" type="${type}" ${attrs}></script>`;
				},

				//method for retrieving head script string
				render: function(){
					var s = [];
					for(var i in Registry._headScript)
						s.push(Registry._headScript[i]);
					return configuration.template.safeString(s.join(''));
				}
			}
		},

		//method for retrieving head link helper
		headLink: function() {
			return {

				//method for initializing helper
				init: function(){
					Registry._headLink = {};
				},

				//method for setting a stylesheet
				setStylesheet: function(href, media, attrs){
					media = media ? media : 'screen';
					attrs = attrs ? attrs : {};

					var _attrs = [];
					for(var i in attrs){
						_attrs.push(`${i}="${attrs[i]}"`);
					}
					attrs = _attrs.join(' ');

					Registry._headLink[href] = `<link type="text/css" rel="stylesheet" media="${media}" href="${href}" ${attrs}></link>`;
				},

				//method for retrieving head link string
				render: function(){
					var s = [];
					for(var i in Registry._headLink)
						s.push(Registry._headLink[i]);
					return configuration.template.safeString(s.join(''));
				}

			}
		}
	}
};

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

		//ignore static routes
		if(configuration.server.static.filter(function(entry){
			var re = pathToRegexp(entry + "*");
			return re.exec(request._parsedUrl.path) ? entry : null;
		}).length){

			//send 404 if static route reaches here
			response.status(404).end();
			return;
		}

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
				name: Routing.pascalCase(controllerPath + '-controller'),
			},
			action: {
				path: actionPath,
				name: Routing.camelCase(actionPath + '-action')
			}
		};

		//zend style parameters
		if(!request.parameters){
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
		}

		//load controller
		try{
			var moduleName = (request._zenhance && request._zenhance.route) ? request._zenhance.route.module : undefined;
			var controllerClass = Zenhance.controller(routing.controller.name, moduleName);

			Routing.forward(request, response, controllerClass, routing);
		}
		catch(ex){
			publishError(ex, response);
		}
	},

	forward: function(request, response, controllerClass, routing){
		try{
			var layout = configuration.template.layout;

			//initialize builtIn plugins
			for(var i in Registry._builtIn.helpers)
				Registry.helpers[ Registry._builtIn.helpers[i] ]().init();

			var config = {
				view: {},
				request: request,
				response: response,
				layout: {
					setLayout: function(layoutName){
						layout = layoutName;
					}
				},
				helpers: Registry.helpers
			};

			//instantiate controller class
			if(!controllerClass)
				throw new Error(`Controller ${routing.controller.name} not found.`);

			var controller = new controllerClass();

			//bind config to instance
			for(var i in config)
				controller[i] = config[i];

			//bind helpers to instance
			controller.helpers = Registry.helpers;

			//verify action method exists
			if(!controller[routing.action.name])
				throw new Error(`${routing.action.name} not found in controller ${routing.controller.name}(${[configuration.path.controllers, routing.controller.name + '.js'].join(path.sep)}).`);

			//invoke action method
			controller[routing.action.name]();

			if(!controller.disableRenderer){

				//add helpers to view
				controller.view.helpers = {};
				for(var i in controller.helpers){
					//use render method for builtIn helpers
					controller.view.helpers[i] = Registry._builtIn.helpers.indexOf(i) >= 0 ? Registry.helpers[i]().render : Registry.helpers[i];
				}

				//render view
				response.render(`${routing.controller.path}/${routing.action.path}`, controller.view, function(error, html){

					if(layout){

						//use layout rendering
						var layoutPath = ['scripts', layout.split('/').join(path.sep)].join(path.sep);

						config.layout.helpers = controller.view.helpers;
						config.layout.content = configuration.template.safeString(html);
						response.render(layoutPath, config.layout);
					}
					else {

						//default rendering of view
						response.send(html);
					}
				});
			}
		}
		catch(ex){
			publishError(ex, response);
		}
	},

	//handle custom routes
	onCustomRoute: function(request, response){

		if(!request.parameters)
			request.parameters = {};

		//add in zend custom route parameters
		for(var i in request.params)
			request.parameters[i] = request.params[i];

		//add in query string parameters
		for(var i in request.query)
			request.parameters[i] = request.query[i];

		//handle module routes
		var moduleRoute = Routing.routes.filter(function(route){
			var re = pathToRegexp(route.route);
			return (route.module && re.exec(request._parsedUrl.path));
		});

		if(moduleRoute.length){

			//inject into request object for later use
			request._zenhance = {
				route: moduleRoute[0]
			};

			//override pathname for module
			request._parsedUrl.pathname = [moduleRoute.controller, moduleRoute.action].join(path.sep);
		}

		//resume normal route handling
		Routing.onRequest(request, response);
	},

	routes: {}
}

//method for initializing Zenhance
function initialize(next){

	//set root directory
	configuration.path.root = path.dirname(require.main.filename);

	//set public directory
	configuration.path.public = [configuration.path.root, 'public'].join(path.sep);

	//set application directory
	configuration.path.application = [configuration.path.root, 'application'].join(path.sep);

	//set library directory
	configuration.path.library = [configuration.path.root, 'library'].join(path.sep);

	//set configs directory
	configuration.path.configs = [configuration.path.application, 'configs'].join(path.sep);

	//set controllers directory
	configuration.path.controllers = [configuration.path.application, 'controllers'].join(path.sep);

	//set models directory
	configuration.path.models = [configuration.path.application, 'models'].join(path.sep);

	//set views directory
	configuration.path.views = [configuration.path.application, 'views'].join(path.sep);

	//set layouts directory
	configuration.path.layouts = [configuration.path.application, 'layouts'].join(path.sep);

	//set layout scripts directory
	var layoutScripts = [configuration.path.layouts, 'scripts'].join(path.sep);

	//set views scripts directory
	configuration.path.scripts = [configuration.path.views, 'scripts'].join(path.sep);

	//set index view path directory
	var indexViewPath = [configuration.path.scripts, 'index'].join(path.sep);

	//set error view path directory
	var errorViewPath = [configuration.path.scripts, 'error'].join(path.sep);

	//set application json file
	var applicationJSON = [configuration.path.configs, 'application.json'].join(path.sep);

	//set routes json file
	var routesJSON = [configuration.path.configs, 'routes.json'].join(path.sep);

	//set bootstrap file
	var bootstrapFile = [configuration.path.application, 'Bootstrap.js'].join(path.sep);

	//internal function for reading the configuration files
	function _readConfigFiles(){

		//read configuration file if available
		try{
			var content = fs.readFileSync(applicationJSON, configuration.encoding);
			if(content)
				module.exports.configuration = configuration = JSON.parse(content);
		}
		catch(ex){
			publishError(ex);
			return false;
		}

		//read routes configuration file if available
		try{
			var content = fs.readFileSync(routesJSON, configuration.encoding);
			if(content)
				Routing.routes = JSON.parse(content).routes;
		}
		catch(ex){
			publishError(ex);
		}

		//check for safeString method
		if(configuration.template.engine == 'handlebars'){
			configuration.template.safeString = function(html){
				return new (require('handlebars')).SafeString(html);
			}
		}

		try {
			var bootstrap = Zenhance.script(configuration.path.application, 'Bootstrap');
			if(bootstrap){

				bootstrap = new bootstrap();

				//reflect and execute all init methods
				for (var i of Object.getOwnPropertyNames(Object.getPrototypeOf(bootstrap))) {
					var method = bootstrap[i].name;

					if(method.indexOf('init') == 0)
						bootstrap[method]();
				}
			}
		}
		catch(ex){
			publishError(ex);
			return false;
		}

		next();
	}


	//prompt for automatic creation of barebones application if needed
	if(!fs.existsSync([configuration.path.root, 'application'].join(path.sep))){

		var i = readline.createInterface(process.stdin, process.stdout, null);
		i.question('It appears that this is the first time you are running Zenhance or required files are missing. Would you like Zenhance to create a barebones application for you and/or restore missing required files? (Y/n): ', function(answer){

			if(answer.toLowerCase() == 'y' || !answer){

				//create barebones application

				//create the public directory if it doesn't exist
				if(!fs.existsSync(configuration.path.public))
					fs.mkdirSync(configuration.path.public);

				//create the application directory if it doesn't exist
				if(!fs.existsSync(configuration.path.application))
					fs.mkdirSync(configuration.path.application);

				//create the library directory if it doesn't exist
				if(!fs.existsSync(configuration.path.library))
					fs.mkdirSync(configuration.path.library);

				//create the configs directory if it doesn't exist
				if(!fs.existsSync(configuration.path.configs))
					fs.mkdirSync(configuration.path.configs);

				//create the controllers directory if it doesn't exist
				if(!fs.existsSync(configuration.path.controllers))
					fs.mkdirSync(configuration.path.controllers);

				//create the models directory if it doesn't exist
				if(!fs.existsSync(configuration.path.models))
					fs.mkdirSync(configuration.path.models);

				//create the views directory if it doesn't exist
				if(!fs.existsSync(configuration.path.views))
					fs.mkdirSync(configuration.path.views);

				//create the layouts directory if it doesn't exist
				if(!fs.existsSync(configuration.path.layouts))
					fs.mkdirSync(configuration.path.layouts);

				//create the layout/scripts directory if it doesn't exist
				if(!fs.existsSync(layoutScripts))
					fs.mkdirSync(layoutScripts);

				//create the views/scripts directory if it doesn't exist
				if(!fs.existsSync(configuration.path.scripts))
					fs.mkdirSync(configuration.path.scripts);

				//create default index controller
				var sourceController = [__dirname, '..', 'default', 'controllers', 'IndexController.js'].join(path.sep);
				var destinationController = [configuration.path.controllers, 'IndexController.js'].join(path.sep);
				if(!fs.existsSync(destinationController))
					fs.createReadStream(sourceController).pipe(fs.createWriteStream(destinationController));

				//create default index view directory
				if(!fs.existsSync(indexViewPath))
					fs.mkdirSync(indexViewPath);

				//create default index view
				var sourceView = [__dirname, '..', 'default', 'views', 'index', 'index.handlebars'].join(path.sep);
				var destinationView = [indexViewPath, 'index.handlebars'].join(path.sep);
				if(!fs.existsSync(destinationView))
					fs.createReadStream(sourceView).pipe(fs.createWriteStream(destinationView));

				//create default error view directory
				if(!fs.existsSync(errorViewPath))
					fs.mkdirSync(errorViewPath);

				//create default error controller
				var sourceController = [__dirname, '..', 'default', 'controllers', 'ErrorController.js'].join(path.sep);
				var destinationController = [configuration.path.controllers, 'ErrorController.js'].join(path.sep);
				if(!fs.existsSync(destinationController))
					fs.createReadStream(sourceController).pipe(fs.createWriteStream(destinationController));

				//create default error view
				var sourceView = [__dirname, '..', 'default', 'views', 'error', 'index.handlebars'].join(path.sep);
				var destinationView = [errorViewPath, 'index.handlebars'].join(path.sep);
				if(!fs.existsSync(destinationView))
					fs.createReadStream(sourceView).pipe(fs.createWriteStream(destinationView));

				//create the application.json file if it doesn't exist based on current configuration
				if(!fs.existsSync(applicationJSON)){
					fs.writeFileSync(applicationJSON, JSON.stringify(configuration, null, 4), configuration.encoding, function(error){
						if(error)
							publishError(error);
					});
				}

				//create default routes file
				var sourceFile = [__dirname, '..', 'default', 'configs', 'routes.json'].join(path.sep);
				if(!fs.existsSync(routesJSON))
					fs.createReadStream(sourceFile).pipe(fs.createWriteStream(routesJSON));

				//create default bootstrap file
				var sourceFile = [__dirname, '..', 'default', 'Bootstrap.js'].join(path.sep);
				if(!fs.existsSync(bootstrapFile))
					fs.createReadStream(sourceFile).pipe(fs.createWriteStream(bootstrapFile));

			}

			_readConfigFiles();
		});

	}
	else {
		//normal execution
		_readConfigFiles();
	}
}

//method for pretty printing errors
function publishError(error, response){

	if(configuration.error.reporting){
		var message =
			`<h1>Zenhance Error</h1>
			<p><strong>
			${error.message}
			</strong></p>
			<code>
			${error.toString()}
			</code>`;

		if(response)
			response.send( message );
	}

	console.trace(error);
}

//starts the zendhance server
function start(){
	console.info('Starting Zenhance...');
	server = app.listen(configuration.server.port, function(){
		console.info(' ');
		console.info('----------------------------------------');
		console.info('Zenhance is running (', configuration.template.engine, ')');
		console.info('----------------------------------------');
		console.info('http://localhost:' + configuration.server.port);
		console.info(' ');
	});
}

//stops the zenhance server
function stop(){
	console.info('Stopping Zenhance...');

	if(server)
		server.close();

	console.info('Zenhance stopped.');
}

var Zenhance = {

	//configuration instance
	configuration: configuration,

	//express application instance
	express: {
		application: app
	},

	//main run method for Zenhance
	run: function(){
		initialize(function(){

			//static directories
			for(var i in configuration.server.static){
				var staticPath = configuration.server.static[i];
				app.use(staticPath, express.static([configuration.path.root + staticPath.split('/').join(path.sep)].join('/')))
			}

			//apply all custom routes
			for(var i in Routing.routes){

				//default verb to all
				Routing.routes[i].verb = Routing.routes[i].verb ? Routing.routes[i].verb : 'all';

				//default action to index
				Routing.routes[i].action = Routing.routes[i].action ? Routing.routes[i].action : 'index';

				try{
					if(!app[Routing.routes[i].verb])
						throw new Error(`Unsupported route verb "${Routing.routes[i].verb}" for route "${Routing.routes[i].route}".`);

					//apply custom route and verb
					app[Routing.routes[i].verb](Routing.routes[i].route, Routing.onCustomRoute);
				}
				catch(ex){
					publishError(ex);
				}
			}

			//forward everything to the controller helper
			app.all('*', Routing.onRequest);

			//setup templating engine

			//add handlebars hook for use with express
			app.engine('handlebars', function(filePath, options, callback){
				var handlebars = require('handlebars');

				//register partial helper function
				//allows for the use of partial 'path/to/partial' arg1=value1
				if(!handlebars.__partialHelper){
					handlebars.__partialHelper = function(context, options){
						try{
							var partialPath = [configuration.path.scripts, 'partials'].concat(context.split('/')).join(path.sep) + '.handlebars';
							var content = fs.readFileSync(partialPath, configuration.encoding);
							var template = handlebars.compile(content);
							var rendered = template(options.hash);
							return configuration.template.safeString(rendered);
						}
						catch(ex){
							return ex;
						}
					}
					handlebars.registerHelper('partial', handlebars.__partialHelper);
				}

				var template = require.cache[filePath];
				if(template){
					callback(null, template(options));
				}
				else{
					if(!fs.existsSync(filePath))
						return callback(null, `Error: view file ${filePath}, does not exist.`);

					fs.readFile(filePath, configuration.encoding, function(error, content){
						try{
							var template = handlebars.compile(content);
							require.cache[filePath] = template;
							return callback(null, template(options));
						}
						catch(ex){
							return callback(null, ex);
						}
					});
				}
			});

			app.set('view engine', configuration.template.engine);
			app.set('views', [configuration.path.scripts, configuration.path.layouts]);

			//start the server
			start();

			//file watcher for automatic restart of files
			fs.watch(configuration.path.root, {recursive: true}, function(event, filename){

				//configuration file change
				if(filename.indexOf('application/configs'.split('/').join(path.sep)) > -1 ||
				   filename.indexOf('application/Bootstrap.js'.split('/').join(path.sep)) > -1){

					delete require.cache[ path.resolve(filename) ];

					//restart the server
					stop();
					initialize(function(){
						start();
					});
				}

				//remove resources from require cache
				else{
					delete require.cache[ path.resolve(filename) ];
				}

			});
		});
	},

	//method for loading a script file
	script: function(configuredPath, resourceName){

		var object = undefined;

		//localize separator
		resourceName = resourceName.split('/').join(path.sep);

		var scriptFile = [configuredPath, resourceName + '.js'].join(path.sep);
		object = require.cache[scriptFile];

		if(!object){

			//verify model exists
			if(!fs.existsSync(scriptFile))
				throw new Error('File ' + scriptFile + ' not found.');

			var content = fs.readFileSync(scriptFile, configuration.encoding);
			object = eval(content);
			require.cache[scriptFile] = object;
		}

		return object;
	},

	//method for retrieving controller resources
	controller: function(name, moduleName){

		var controller = undefined;

		//load controller
		try{
			if(moduleName)
				controller = Zenhance.script([configuration.path.application, 'modules', moduleName, 'controllers'].join(path.sep), name);
			else
				controller = Zenhance.script(configuration.path.controllers, name);
		}
		catch(ex){
			publishError(ex);
		}

		return controller;
	},

	//method for retrieving library resources
	library: function(name){

		var library = undefined;

		//load library
		try{
			library = Zenhance.script(configuration.path.library, name);
		}
		catch(ex){
			publishError(ex);
		}

		return library;
	},

	//method for retrieving model resources
	model: function(name){

		var model = undefined;

		//load model
		try{
			model = Zenhance.script(configuration.path.models, name);
		}
		catch(ex){
			publishError(ex);
		}

		return model;
	},

	//public registry object
	registry: {

		//helpers
		helpers: Registry.helpers,

		//method for retrieving a registry value
		get: function(key){
			return Registry[key];
		},

		//method for setting a registry value
		set: function(key, value){
			try{
				if(['helpers', '_headLink', '_headScript'].indexOf(key) >= 0)
					throw new Error(`Zenhance registry error trying to set reserved keyword "${key}"`);

				Registry[key] = value;
			}
			catch(ex){
				publishError(ex);
			}
		}
	}
}

//export Zenhance API
module.exports = Zenhance;
