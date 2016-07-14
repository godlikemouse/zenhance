Zenhance
========


A Zend Framework MVC like approach to building enterprise NodeJS applications.

Zenhance does a lot of the heavy lifting for you such as auto routing to controllers and views, automatic caching and optimization as well as loading and unloading of modified files.  This leaves you the developer more time to focus on developing your application without the need to stop and restart the node server.

## Installation

	npm install zenhance

## Quick Start

Create a server.js file with the following contents and Zenhance will do the rest.

	require("zenhance").run();

Now run the server

    #> node server.js

Upon first run Zenhance will examine the current folder structure and add all required missing directories and files.  The final product of which should look like this.

	/application
		Bootstrap.js
		/configs
			application.json
			routes.json
		/controllers
			IndexController.js
			ErrorController.js
		/layouts
			/scripts
		/models
		/views
			/scripts
				/index
					index.handlebars
				/error
					index.handlebars
				/partials
    /library
	/public

By default Zenhance ships with [Handlebars](http://handlebarsjs.com/) and is built on top of [Express](http://expressjs.com/).  The templating engine can be changed to use any [Express](http://expressjs.com/) compatible template engine you desire.

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

The following file is located at /application/views/scripts/index/index.handlebars.

### Index View Example

	<html>
		<head>
			<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.6/css/bootstrap.min.css">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.6/css/bootstrap-theme.min.css">
			<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jquery/2.2.4/jquery.min.js"></script>
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

## Zenhance Documentation

View the [Zenhance Documentation](https://github.com/godlikemouse/zenhance/wiki/Zenhance-Documentation).


## Community

Keep track of development and community news.

* Follow [@Collaboradev on Twitter](https://twitter.com/collaboradev).
* Follow the [Collaboradev Blog](http://www.collaboradev.com).

## License

Zenhance is released under [The MIT License (MIT)](https://opensource.org/licenses/MIT)
