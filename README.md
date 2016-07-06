Zenhance
========


A Zend Framework like approach to building enterprise NodeJS applications.

## Installation

	npm install zenhance

## Quick Start

Create a server.js file with the following contents and Zenhance will do the rest.

	var zenhance = require("zenhance");

	zenhance.run();

Upon first run Zenhance will examine the current folder structure and add all required missing directories and files.  The final product of which should look like this.

	/application
		/configs
		/controllers
		/models
		/views
			/scripts
				/partials
	/public

By default Zenhance ships with [Handlebars](http://handlebarsjs.com/) and is built on top of [Express](http://expressjs.com/).  The templating engine can be changed to use any ExpressJS compatible template engine you desire.

A default controller and view will be provided.

### Index Controller Example

The following file is located at /application/controllers/IndexController.js and contains a simple view assignment.

	'use strict';

	class IndexController {

		indexAction(){
			this.view.title = "Hello World!";
		}

	}

### Index View Example



## Configuration

Configuration is handled by the application.json file located under the /application/configs directory and has the following structure.

	{
		"path": {
			"root": "/Users/jasongraves/Documents/sandbox/node/sample-site",
			"application": "/Users/jasongraves/Documents/sandbox/node/sample-site/application",
			"configs": "/Users/jasongraves/Documents/sandbox/node/sample-site/application/configs",
			"controllers": "/Users/jasongraves/Documents/sandbox/node/sample-site/application/controllers",
			"models": "/Users/jasongraves/Documents/sandbox/node/sample-site/application/models",
			"views": "/Users/jasongraves/Documents/sandbox/node/sample-site/application/views",
			"scripts": "/Users/jasongraves/Documents/sandbox/node/sample-site/application/views/scripts",
			"public": "/Users/jasongraves/Documents/sandbox/node/sample-site/public"
		},
		"encoding": "UTF-8",
		"server": {
			"port": 3000,
			"static": [
				"public"
			]
		},
		"template": {
			"engine": "handlebars"
		}
	}

| Option | Description |
| ------ | ----------- |
| path.root | Provides the application's root directory. |
| path.application | Provides the application directory. |
| path.configs | Provides the application's configuration directory. |
| path.controllers | Provides the application's controllers directory. |
| path.models | Provides the application's models directory. |
| path.views | Provides the applications views directory. |
| path.scripts | Provides the applications scripts directory. |
| path.public | Provides the static public directory. |
| encoding | Determines the encoding type to use when reading and writing to and from files. |
| server.port | Provides the port number to use when running the Zenhance server. |
| server.static.public | Provides Express the directory names to use as static public directories. |
| template.engine | Provices Express with the templating engine to use for rendering. |



## Community

Keep track of development and community news.

* Follow [@Collaboradev on Twitter](https://twitter.com/collaboradev).
* Follow the [Collaboradev Blog](http://www.collaboradev.com).

## License

Zenhance is released under [The MIT License (MIT)](https://opensource.org/licenses/MIT)
