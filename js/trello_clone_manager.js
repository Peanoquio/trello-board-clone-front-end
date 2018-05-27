//////////////////////////////////////////////////////////////////////////////


/**
 * The class for the Trello clone web app
 */
class TrelloCloneMgr {

    /**
     * The default contructor
     */
	constructor() {	
		let self = this;

		this.renderBuffer = document.createDocumentFragment();
		this.serverUrl = 'http://localhost:3000/';

		// listen for this event (whenever a card is added or removed from the container)
		document.body.addEventListener("addCardToDb", function (ev) {
			console.log('////////// listened to addCardToDb');
			console.log(ev.data);	
			self.addCardToJsonDb( ev.data );
		});	

		document.body.addEventListener("updateCardInDb", function (ev) {
			console.log('////////// listened to updateCardInDb');
			console.log(ev.data);	
			self.updateCardInJsonDb( ev.data );
		});
		
		document.body.addEventListener("removeCardFromDb", function (ev) {
			console.log('////////// listened to removeCardFromDb');
			console.log(ev.data);	
			self.removeCardFromJsonDb( ev.data.id );
		});

		document.body.addEventListener("updateCardContainerInDb", function (ev) {
			console.log('////////// listened to updateCardContainerInDb');
			console.log(ev.data);	
			self.updateCardContainerInJsonDb( ev.data );
		});
	}

	/**
	 * Insert the card data into the json DB
	 * @param {Object} data 
	 */
	addCardToJsonDb( data ) {
		// write data to the server
		let optionObj = {
			method: 'POST', 
			body: JSON.stringify(data),
			headers:{
				'Content-Type': 'application/json'
			}
		};	

		this.accessJsonData( `${this.serverUrl}cards/`, optionObj );
	}

	/**
	 * Update the card data in the json DB
	 * @param {Object} data 
	 */
	updateCardInJsonDb( data ) {
		let cardId = data.id;
		// update data in the server
		let optionObj = {
			method: 'PATCH',
			body: JSON.stringify(data),
			headers:{
				'Content-Type': 'application/json'
			}
		};	

		this.accessJsonData( `${this.serverUrl}cards/${cardId}`, optionObj );
	}

	/**
	 * Delete the card data from the json DB
	 * @param {string} cardId 
	 */
	removeCardFromJsonDb( cardId ) {
		// delete data from the server
		let optionObj = {
			method: 'DELETE'
		};	

		this.accessJsonData( `${this.serverUrl}cards/${cardId}`, optionObj );
	}

	/**
	 * Update the card container data in the json DB
	 * @param {Object} data 
	 */
	updateCardContainerInJsonDb( data ) {
		let containerId = data.id;
		// update data in the server
		let optionObj = {
			method: 'PATCH',
			body: JSON.stringify(data),
			headers:{
				'Content-Type': 'application/json'
			}
		};	

		this.accessJsonData( `${this.serverUrl}columns/${containerId}`, optionObj );
	}

	/**
	 * Fetches the json data from the server
	 * Can also post json data to the server
	 * @param {string} url 
	 * @param {Object} optionsObj 
	 * @param {Object} callbackContext 
	 * @param {Function} callbackFunc 
	 * @param {Array} callbackArgs 	 
	 */
	accessJsonData( url, optionsObj = {}, 
		callbackContext = null, callbackFunc = null, callbackArgs = [] ) {
		console.log('>>>>> accessJsonData');
		
		// fetch data from the server (returns a Promise)
		fetch( url, optionsObj ).then( function( response ) {
			if ( response.ok ) {
				return response.json();
			}
			throw new Error('Response from network failed');
		}).then( function( jsonData ) { 
			console.log( jsonData );
			if ( callbackFunc && typeof callbackFunc === 'function' ) {
				callbackArgs.push( jsonData );
				// the callback function will process the json data
				callbackFunc.apply( callbackContext, callbackArgs );				
			}
			return jsonData;
		}).catch( function( error ) {
			console.log('Error encountered when fetching json data: ', error.message);
		});
	}

    /**
     * Initialize the board
     */
	initBoard() {

		// NOTE: callback hell happening right here... should have used JS Promises

		// callback function to process card data
		const fetchCardsCallback = ( trelloMgr, jsonData ) => {
			console.log('<<< fetchCardsCallback');
			console.log(jsonData);

			for ( let i = 0, dataLen = jsonData.length; i < dataLen; ++i ) {
				let data = jsonData[i];
				// create the cards
				let myCard = document.createElement('my-card');
				myCard.setAttribute('id', `${PREFIX_CARD}${data.id}`);
				myCard.setAttribute('class', 'cardElem');
				myCard.title = data.title;
				myCard.description = data.description;
				//myCard.containerid = data.columnId;
				myCard.setAttributeOnConnect('containerid', `${PREFIX_CONTAINER}${data.columnId}`);
				// attach to the document fragment to minimize reflow and repaint (offscreen rendering)	
				trelloMgr.renderBuffer.appendChild(myCard);
			} //end loop			

			trelloMgr.renderBoard();
		}
	
		// callback function to process column data
		const fetchColsCallback = ( trelloMgr, jsonData ) => {
			console.log('<<< fetchColsCallback');
			console.log(jsonData);

			for ( let i = 0, dataLen = jsonData.length; i < dataLen; ++i ) {
				let data = jsonData[i];
				// create the card containers
				let myCardContainer = document.createElement('my-card-container');
				myCardContainer.setAttribute('id', `${PREFIX_CONTAINER}${data.id}`);
				myCardContainer.setAttribute('class', 'droppable cardContainerElem');
				myCardContainer.title = data.title;
				// attach to the document fragment to minimize reflow and repaint (offscreen rendering)	
				trelloMgr.renderBuffer.appendChild(myCardContainer);
			} //end loop			

			// fetch data from the server (cards)
			let fetchCallbackArgs = [ trelloMgr ];
			trelloMgr.accessJsonData( `${trelloMgr.serverUrl}cards/`, { method: 'GET'}, trelloMgr, fetchCardsCallback, fetchCallbackArgs );
		}

		// card search
		let myCardSearch = document.createElement('my-card-search');
		myCardSearch.setAttribute('id', 'cardSearch'); 
	  
		// attach to the document fragment to minimize reflow and repaint (offscreen rendering)	
		this.renderBuffer.appendChild(myCardSearch);

		// fetch data from the server (columns)
		let fetchCallbackArgs = [ this ];		
		this.accessJsonData( `${this.serverUrl}columns/`, { method: 'GET'}, this, fetchColsCallback, fetchCallbackArgs );
	}

	/**
	 * Render the board
	 */
	renderBoard() {		
		//  the main board 
		let myCardBoard = document.createElement('my-card-board');
        myCardBoard.setAttribute('id', 'board');
		myCardBoard.appendChild(this.renderBuffer);
		document.body.appendChild(myCardBoard);	
	}

	/**
	 * Generates the board
	 */
	generateBoard() {
		this.initBoard();
		this.renderBoard();
	}

	/**
	 * Test the board creation manually
	 */
	testBoard() {
		// create cards
		let myCard = document.createElement('my-card');
		myCard.setAttribute('id', 'card1');
		myCard.setAttribute('class', 'cardElem');		

		let myCard2 = document.createElement('my-card');
		myCard2.setAttribute('id', 'card2');
		myCard2.setAttribute('class', 'cardElem');

		let myCard3 = document.createElement('my-card');
		myCard3.setAttribute('id', 'card3');
		myCard3.setAttribute('class', 'cardElem');

		// create card containers
		let myCardContainer = document.createElement('my-card-container');
		myCardContainer.setAttribute('id', 'container1');
		myCardContainer.setAttribute('class', 'droppable cardContainerElem');
		myCardContainer.setAttributeOnConnect('addcard', 'card1');

		let myCardContainer2 = document.createElement('my-card-container');
		myCardContainer2.setAttribute('id', 'container2');
		myCardContainer2.setAttribute('class', 'droppable cardContainerElem');
		myCardContainer2.setAttributeOnConnect('addcard', 'card2');
        myCardContainer2.setAttributeOnConnect('addcard', 'card3');
        
        // card search
        let myCardSearch = document.createElement('my-card-search');
		myCardSearch.setAttribute('id', 'cardSearch'); 
	  
        // attach to the document fragment to minimize reflow and repaint (offscreen rendering)	
        this.renderBuffer.appendChild(myCardSearch);				
		this.renderBuffer.appendChild(myCardContainer);
		this.renderBuffer.appendChild(myCardContainer2);
		this.renderBuffer.appendChild(myCard);	
		this.renderBuffer.appendChild(myCard2);
		this.renderBuffer.appendChild(myCard3);

		this.renderBoard();
	}

} //end class


//////////////////////////////////////////////////////////////////////////////

