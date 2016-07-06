Zenhance
========


A Zend Framework MVC like approach to building enterprise NodeJS applications.

## Installation

	npm install zenhance

## Quick Start

Create a server.js file with the following contents and Zenhance will do the rest.

	require("zenhance").run();

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
			this.view.title = 'Welcome to Zenhance';
			this.view.description = 'Looks like everything is working as expected.';
		}

	}

Elements assigned to this.view are automatically handed to the template engine.

### Index View Example

	<html>
		<head>
			<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.6/css/bootstrap-theme.min.css">
			<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.6/css/bootstrap.min.css">
			<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.6/js/bootstrap.min.js"></script>
		</head>
		<body>
			<div class="container">
				<div class="jumbotron">
					<h1>
						{{title}}
					</h1>
					<p>
						{{description}}
					</p>
				</div>
			</div>
		</body>
	</html>

The view simply renders out the title and description fields.  For more information on Handlebars templates see the Handlebars documentation or for Zenhance specfic Handlebars enhancements, see the Zenhance template enhancements documentation.

## Handlebars Template Enhancements

The following are enhancements added to the Handlebars template engine.

### Partial

To allow for Zend Framework like partials to be used, a new helper method has been introduced into the Handlebars template engine.

	{{partial 'global/header'}}

The above example will look for a header.handlebars template under the /application/views/scripts/partials/global directory.  If the argument to partial was passed as 'header' only, then the partial helper would look for the template at the /application/views/scripts/partials directory.

To pass information to the partial, use either existing objects introduced into the template or pass key=argument sets as specified in the Handlebars documentation under partials.

	{{partial 'global/header' headerData}}

This example expects that the controller has specified an object called headerData (this.view.headerData = {...}) in the controller.

	{{partial 'global/header' bright=true wide=false}}

This example passes two variables bright and wide which would then become accessible in the partial as {{bright}} and {{wide}}.

### Disabling The View Renderer

To disable the view renderer for a specific controller or for a specific action, specify the following.

	this.disableRenderer = true

By default this value is false however, when true the templating engine is bypassed.  This requires that the controller access this.response to send the appropriate output directly.

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
