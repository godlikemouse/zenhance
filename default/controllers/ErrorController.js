'use strict';

class ErrorController {

	indexAction(){
		this.view.title = 'Uh Oh';
		this.view.description = 'Looks like something went wrong.';
	}

}
