//////////////////////////////////////////////////////////////////////////////

/**
 * The base class of the custom template
 */
class CustomTemplateElement extends HTMLElement {

	/**
	 * The contructor that will create the template clone and attach it to the shadow root
	 * @param {string} templateName 
	 * @param {string} shadowMode 
	 */
	constructor( templateName, shadowMode ) {
		super();

		let template = document.getElementById( templateName );
		let templateContent = template.content;
		// attach the clone of the template content to the shadow root
		this.myShadowRoot = this.attachShadow({mode: shadowMode});
		this.myShadowRoot.appendChild(templateContent.cloneNode(true));

		// create a custom event
		this.addToContainerEvent = new CustomEvent("addToContainer", {
			bubbles: true,
			cancelable: false,
			detail: {}, // custom data (but cannot be modified)
		});

		this.addCardToDbEvent = new CustomEvent("addCardToDb", {
			bubbles: true,
			cancelable: false,
			detail: {}, // custom data (but cannot be modified)
		});

		this.updateCardInDbEvent = new CustomEvent("updateCardInDb", {
			bubbles: true,
			cancelable: false,
			detail: {}, // custom data (but cannot be modified)
		});

		this.removeCardFromDbEvent = new CustomEvent("removeCardFromDb", {
			bubbles: true,
			cancelable: false,
			detail: {}, // custom data (but cannot be modified)
		});

		this.updateCardContainerInDbEvent = new CustomEvent("updateCardContainerInDb", {
			bubbles: true,
			cancelable: false,
			detail: {}, // custom data (but cannot be modified)
		});

		// attribute name and value
		this.attrNames = new Array();
		this.attrVals = new Array();
	}

	/**
	 * Defer the setting of the attribute until the connectedCallback event
	 * This is to ensure that attributeChangedCallback is called after connectedCallback
	 * @param {string} attrName 
	 * @param {string} attrVal 
	 */
	setAttributeOnConnect( attrName, attrVal ) {
		this.attrNames.push(attrName);
		this.attrVals.push(attrVal);
	}

	/**
	 * Once the element is attached to the DOM
	 */
	connectedCallback() {	
		let self = this;

		// listen for this event (whenever a card is added or removed from the container)
		this.myShadowRoot.addEventListener("addToContainer", function (ev) {
			console.log('=== listened to addToContainer');
			console.log(ev.data);			

			let oldCardContainerElem = document.getElementById( ev.data.oldParentElemId );
			let newCardContainerElem = document.getElementById( ev.data.newParentElemId );
			let cardElemId = ev.data.childElemId;
			let cardElem = document.getElementById( cardElemId );
			
			// note: 
			// addToContainer event will trigger attributeChangedCallback event
			// we can already do the processing here but for training/educational purposes, we will trigger another event
			// changing this attribute will trigger attributeChangedCallback of MyCardContainer class
			if ( oldCardContainerElem ) {
				oldCardContainerElem.setAttribute('removecard', cardElemId);
			}
			if ( newCardContainerElem ) {
				newCardContainerElem.setAttribute('addcard', cardElemId);	
			}				
		});

		// set the deferred attributes once the element is attached to the DOM
		for ( let i = 0, attrLen = this.attrNames.length; i < attrLen; ++i ) {
			this.setAttribute(this.attrNames[i], this.attrVals[i]);
		} //end loop
	}

} //end class


//////////////////////////////////////////////////////////////////////////////


/**
 * The main class for the draggable and editable card
 */
class MyCard extends CustomTemplateElement {

	/**
	 * The default constructor
	 */
	constructor() {
		super('card-template', 'open');	
		
		// the parent id (card container) of the card
		this.origParentElemId = null;
		this.parentElemId = null;
		// the current card container element (element in the shadow root of MyCardContainer)
		this.currCardContainerElem = null;
		// the current droppable element (where you can place the card)
		this.currDroppableElem = null;
		// offset position when moving the card (based on mouse pointer position and the top-left position of the card)
		this.shiftPosX = 0;
		this.shiftPosY = 0;	
		// original position
		this.origPosX = 0;
		this.origPosY = 0;			
	}

	/**
	 * Set the 'title' of the container
	 */
	set title(title) {
		let titleElem = this.myShadowRoot.querySelector('.title');
		titleElem.textContent = title;
	}

	/**
	 * Get the 'title' of the card
	 */
	get title() {
		let titleElem = this.myShadowRoot.querySelector('.title');
		return titleElem.textContent;
	}

	/**
	 * Set the 'description' of the card
	 */
	set description(description) {
		let descElem = this.myShadowRoot.querySelector('.description');
		descElem.textContent = description;
	}

	/**
	 * Get the 'description' of the card
	 */
	get description() {
		let descElem = this.myShadowRoot.querySelector('.description');
		return descElem.textContent;
	}

	/**
	 * Set the 'containerid' of the card
	 */
	set containerid(containerid) {
		this.setAttribute('containerid', containerid);
	}
	
	/**
	 * Get the 'containerid' of the card
	 */
	get containerid() {
		return this.hasAttribute('containerid');
	}

	/**
	 * Observe these attributes for changes
	 */
	static get observedAttributes() {
		return ['containerid']; 
	}

	/**
	 * Callback once the attribute is added, changed or removed
	 * @param {string} name 
	 * @param {string} oldValue 
	 * @param {string} newValue 
	 */
	attributeChangedCallback(name, oldValue, newValue) {
		console.log('..... attributeChangedCallback');
		console.log(name, oldValue, newValue);

		switch (name) {
			case 'containerid':
				console.log('+++++ containerid');
				this.parentElemId = newValue;
				this.origParentElemId = oldValue;
				// manage the link between the card and the container
				this.processCardContainerLink( this.id );
				break;
		}
	}

	/**
	 * Moves the target element
	 * @param {Object} targetElem 
	 * @param {number} pageX 
	 * @param {number} pageY 
	 */
	moveElem( targetElem, pageX, pageY ) {
		let posX = pageX - this.shiftPosX;
		let posY = pageY - this.shiftPosY;
		targetElem.style.left = `${posX}px`;
		targetElem.style.top = `${posY}px`;
	}

	/**
	 * Callback once the object being dragged enters a droppable area
	 * @param {Object} elem 
	 */
	enterDroppableArea( elem ) {
		console.log('..... enterDroppable');
		//console.log(elem.id);
		//console.log(elem.shadowRoot);

		// need to access the shadow DOM to modify the style (is this advisable?)
		this.currCardContainerElem = elem.shadowRoot.querySelector('.cardContainer');
		this.currCardContainerElem.style.opacity = 0.35;		
		//this.currCardContainerElem.style.background = 'pink';

		this.parentElemId = elem.id;
	}
  
	/**
	 * Callback once the object being dragged leaves a droppable area
	 * @param {Object} elem 
	 */
	leaveDroppableArea( elem ) {
		console.log('..... leaveDroppable');
		//console.log(elem.id);
		//console.log(elem.shadowRoot);

		// need to access the shadow DOM to modify the style (is this advisable?)
		this.currCardContainerElem = elem.shadowRoot.querySelector('.cardContainer');
		this.currCardContainerElem.style.opacity = 0.15;			
		//this.currCardContainerElem.style.background = 'yellow';

		this.parentElemId = this.origParentElemId;
	}

	/**
	 * Callback once the mouse pointer is down
	 * @param {Event} ev 
	 */
	onPointerDown( ev ) {
		console.log('..... onPointerDown');
		console.log(ev);

		//ev.preventDefault();

		ev.target.style.position = 'absolute';
		//ev.target.style.width = '100%';
		ev.target.style.zIndex = 10;		

		// calculate the offset position based on the mouse position and target top-left position
		let rect = ev.target.getBoundingClientRect();
		this.shiftPosX = ev.clientX - rect.left;
		this.shiftPosY = ev.clientY - rect.top;

		// move the target element
		this.moveElem( ev.target, ev.pageX, ev.pageY );

		// add the pointer move events
		this.addEventListener('pointermove', this.onPointerMove);
		this.addEventListener('mousemove', this.onPointerMove);
		//this.addEventListener('touchmove', this.onPointerMove);
	}

	/**
	 * Callback once the mouse pointer is moving
	 * @param {Event} ev 
	 */
	onPointerMove( ev ) {
		// move the target element
		this.moveElem( ev.target, ev.pageX, ev.pageY );

		ev.target.style.transform = 'rotate(7deg)';

		// workaround/hack to get the overlapped element below when dragging an element over it
		ev.target.hidden = true;
		let elemBelow = document.elementFromPoint(ev.clientX, ev.clientY);
		ev.target.hidden = false;
		if ( !elemBelow ) {
			return false;
		}		
		// droppableElem could become null if the mouse position is not over a droppable element
		let droppableElem = elemBelow.closest('.droppable');
		//console.log(droppableElem);

		// toggle between entering and leaving the droppable area
		if ( this.currDroppableElem != droppableElem ) {
			if (this.currDroppableElem) {
				this.leaveDroppableArea(this.currDroppableElem);
			}
			this.currDroppableElem = droppableElem;
			if (this.currDroppableElem) {
				this.enterDroppableArea(this.currDroppableElem);
			}
		}
	}

	/**
	 * Callback once the mouse pointer is up or out of focus from the object
	 * @param {Event} ev 
	 */
	onPointerUpOut( ev ) {
		console.log('..... onPointerUpOut');

		// remove the pointer move events
		ev.target.removeEventListener('pointermove', this.onPointerMove);
		ev.target.removeEventListener('mousemove', this.onPointerMove);
		//ev.target.removeEventListener('touchmove', this.onPointerMove);

		//ev.target.removeEventListener('pointerout', this.onPointerUpOut);
		//ev.target.removeEventListener('mouseout', this.onPointerUpOut);
		//ev.target.removeEventListener('touchout', this.onPointerUpOut);

		ev.target.style.transform = 'rotate(0deg)';
		ev.target.style.zIndex = 4;
		if ( this.currCardContainerElem ) {
			this.currCardContainerElem.style.opacity = 0.15;
		}

		// if there is a new parent element id
		if ( this.parentElemId !== null ) {
			// attach to the new parent if there is a change in parent
			if ( this.origParentElemId !== this.parentElemId ) {			
				// manage the link between the card and the container
				this.processCardContainerLink( ev.target.id );

				// format id for DB
				let cardIdDbFormat = CommonUtil.convertCardIdToDbFormat( ev.target.id );
				let columnIdDbFormat = CommonUtil.convertContainerIdToDbFormat( this.parentElemId );
				
				// added custom property to the custom event
				this.updateCardInDbEvent.data = {
					id: cardIdDbFormat,
					columnId: columnIdDbFormat,
				}
				// dispatch another event to write to DB (which will bubble up through the DOM)
				this.dispatchEvent(this.updateCardInDbEvent);
				console.log(this.updateCardInDbEvent);

			// if there is no change in the parent
			} else {
				console.log('revert to original position');
				//console.log(ev.target);
				
				// revert to original position
				ev.target.style.left = `${this.origPosX}px`;
				ev.target.style.top = `${this.origPosY}px`;	

				// set the position
				//let parentElem = document.getElementById(this.parentElemId);
				//let rect = parentElem.getBoundingClientRect();
				//ev.target.style.left = `${rect.left}px`;
				//ev.target.style.top = `${rect.top}px`;
			}					
		}
	}

	/**
	 * Manage the link/relationship between the card and the container
	 * @param {string} childId 
	 */
	processCardContainerLink( childId ) {
		// added custom property to the custom event
		this.addToContainerEvent.data = {
			oldParentElemId: this.origParentElemId,
			newParentElemId: this.parentElemId,
			childElemId: childId,
		}

		// dispatch the custom event (to be caught by the 'addToContainer' event listener)
		this.myShadowRoot.dispatchEvent(this.addToContainerEvent);
		console.log(this.addToContainerEvent);		

		console.log('+++ attach ' + childId + ' card to container ' + this.parentElemId);
		console.log('--- remove ' + childId + ' card from container ' + this.origParentElemId);

		this.origParentElemId = this.parentElemId;
	}

	/**
	 * Once the element is attached to the DOM
	 */
	connectedCallback() {	
		console.log('MyCard --- connectedCallback');
		
		super.connectedCallback();
		
		this.addEventListener('pointerdown', this.onPointerDown);
		//this.addEventListener('mousedown', this.onPointerDown);
		//this.addEventListener('touchdown', this.onPointerDown);

		this.addEventListener('pointerup', this.onPointerUpOut);
		//this.addEventListener('mouseup', this.onPointerUpOut);
		//this.addEventListener('touchup', this.onPointerUpOut);

		this.addEventListener('pointerout', this.onPointerUpOut);
		//this.addEventListener('moouseout', this.onPointerUpOut);
		//this.addEventListener('touchout', this.onPointerUpOut);

		let self = this;

		// when the delete icon is clicked
		let delCardIconElem = this.myShadowRoot.querySelector('.deleteIcon');
		delCardIconElem.addEventListener('click', function(ev) {
			console.log('..... delete card');

			// format id for DB
			let cardIdDbFormat = CommonUtil.convertCardIdToDbFormat( self.id );

			// added custom property to the custom event
			self.removeCardFromDbEvent.data = {
				id: cardIdDbFormat
			}
			// dispatch another event to delete from DB (which will bubble up through the DOM)
			self.dispatchEvent(self.removeCardFromDbEvent);
			console.log(self.removeCardFromDbEvent);

			// detach the card from the parent element
			let parentElem = document.getElementById(self.origParentElemId);
			parentElem.removecard = self.id;
			// remove the card
			self.remove();			
		});	
		
		// when the card title is modified
		let cardTitleElem = this.myShadowRoot.querySelector('.title');
		cardTitleElem.addEventListener('blur', function(ev) {
			console.log('..... update card title');
			// format id for DB
			let cardIdDbFormat = CommonUtil.convertCardIdToDbFormat( self.id );
			
			// added custom property to the custom event
			self.updateCardInDbEvent.data = {
				id: cardIdDbFormat,
				title: cardTitleElem.textContent,
			}
			// dispatch another event to write to DB (which will bubble up through the DOM)
			self.dispatchEvent(self.updateCardInDbEvent);
			console.log(self.updateCardInDbEvent);
		});

		// when the card description is modified
		let cardDescElem = this.myShadowRoot.querySelector('.description');
		cardDescElem.addEventListener('blur', function(ev) {
			console.log('..... update card description');
			// format id for DB
			let cardIdDbFormat = CommonUtil.convertCardIdToDbFormat( self.id );
			
			// added custom property to the custom event
			self.updateCardInDbEvent.data = {
				id: cardIdDbFormat,
				description: cardDescElem.textContent,
			}
			// dispatch another event to write to DB (which will bubble up through the DOM)
			self.dispatchEvent(self.updateCardInDbEvent);
			console.log(self.updateCardInDbEvent);
		});
	}	

} //end class


//////////////////////////////////////////////////////////////////////////////


/**
 * The class for the card container template
 */
class MyCardContainer extends CustomTemplateElement {

	/**
	 * The default constructor
	 */
	constructor() {
		super('card-container-template', 'open');
		// the list of cards attached to the container
		this.cards = new Map();		
	}

	/**
	 * Set the 'title' of the container
	 */
	set title(title) {
		let titleElem = this.myShadowRoot.querySelector('.cardContainerTitle');
		titleElem.textContent = title;
	}

	/**
	 * Get the 'title' of the container
	 */
	get title() {
		let titleElem = this.myShadowRoot.querySelector('.cardContainerTitle');
		return titleElem.textContent;
	}

	/**
	 * Set the 'addcard' property
	 */
	set addcard(cardElemId) {
		this.setAttribute('addcard', cardElemId);
	}
	
	/**
	 * Get the 'addcard' property
	 */
	get addcard() {
		return this.hasAttribute('addcard');
	}

	/**
	 * Set the 'removecard' property
	 */
	set removecard(cardElemId) {
		this.setAttribute('removecard', cardElemId);
	}
	
	/**
	 * Get the 'removecard' property
	 */
	get removecard() {
		return this.hasAttribute('removecard');
	}

	/**
	 * Observe these attributes for changes
	 */
	static get observedAttributes() {
		return ['addcard',  'removecard']; 
	}

	/**
	 * Callback once the attribute is added, changed or removed
	 * @param {string} name 
	 * @param {string} oldValue 
	 * @param {string} newValue 
	 */
	attributeChangedCallback(name, oldValue, newValue) {
		console.log('..... attributeChangedCallback');
		console.log(name, oldValue, newValue);

		switch (name) {
			case 'addcard':
				console.log('+++++ addcard');
				this.cards.set(newValue, newValue);				
				break;
			case 'removecard':	
				console.log('----- removecard');			
				this.cards.delete(newValue, newValue);
				break;
		}

		console.log(this.cards);
		
		// refresh the positioning of the cards
		this.refreshCardPositions();
	}

	/**
	 * Refresh the card positions within the container
	 */
	refreshCardPositions() {
		console.log('=== refreshCardPositions');

		let topPosAdjustment = 10;
		
		// container title dimensions
		let cardContainerTitleElem = this.myShadowRoot.querySelector('.cardContainerTitle');
		let cardContainerTitleRect = cardContainerTitleElem.getBoundingClientRect();
		let offsetPosY = cardContainerTitleRect.height + topPosAdjustment;
		
		// card dimensions
		let rect = this.getBoundingClientRect();
		
		let prevCardHeight = 0;
		// go through each card and set the position
		this.cards.forEach( (val, key) => {
			let cardElem = document.getElementById(key);

			// set the position	
			cardElem.origPosX = rect.left;
			cardElem.origPosY = rect.top + prevCardHeight + offsetPosY;		
			cardElem.style.left = `${cardElem.origPosX}px`;
			cardElem.style.top = `${cardElem.origPosY}px`;
			
			cardElem.parentElemId = this.id;
			cardElem.origParentElemId = this.id;

			prevCardHeight += cardElem.clientHeight - topPosAdjustment;	
			//prevCardHeight = cardElem.offsetHeight;
		});
	}

	/**
	 * Once the element is attached to the DOM
	 */
	connectedCallback() {
		console.log('MyCardContainer --- connectedCallback');

		super.connectedCallback();
		
		let self = this;

		// when the card container title is modified
		let cardContainerTitleElem = this.myShadowRoot.querySelector('.cardContainerTitle');
		cardContainerTitleElem.addEventListener('blur', function(ev) {
			console.log('..... update card container title');
			// format id for DB
			let columnIdDbFormat = CommonUtil.convertContainerIdToDbFormat( self.id );
			
			// added custom property to the custom event
			self.updateCardContainerInDbEvent.data = {
				id: columnIdDbFormat,
				title: cardContainerTitleElem.textContent,
			}
			// dispatch another event to write to DB (which will bubble up through the DOM)
			self.dispatchEvent(self.updateCardContainerInDbEvent);
			console.log(self.updateCardContainerInDbEvent);
		});

		// when the add card icon is clicked
		let addCardIconElem = this.myShadowRoot.querySelector('.addCardIcon');
		addCardIconElem.addEventListener('click', function(ev) {
			console.log('+++++ addCardIcon clicked');
			
			let cardId = CommonUtil.generateCardId();
			// create card
			let cardElem = document.createElement('my-card');
			cardElem.setAttribute('id', cardId);
			cardElem.setAttribute('class', 'cardElem');
			// attach to the board
			let boardElem = document.getElementById('board');
			boardElem.appendChild(cardElem);
			// add to this card container
			self.addcard = cardId;

			// format id for DB
			let cardIdDbFormat = CommonUtil.convertCardIdToDbFormat( cardId );
			let columnIdDbFormat = CommonUtil.convertContainerIdToDbFormat( self.id );
			
			// added custom property to the custom event
			self.addCardToDbEvent.data = {
				id: cardIdDbFormat,
				title: cardElem.title,
				description: cardElem.description,
				columnId: columnIdDbFormat
			}
			// dispatch another event to write to DB (which will bubble up through the DOM)
			self.dispatchEvent(self.addCardToDbEvent);
			console.log(self.addCardToDbEvent);
		});		
	}	

} //end class


//////////////////////////////////////////////////////////////////////////////


/**
 * The custom element class for the card search bar
 */
class MyCardSearchBar extends HTMLElement {

	/**
	 * The default contructor
	 */
	constructor() {
		super();

		let shadow = this.attachShadow({mode: 'open'});
		let docFrag = document.createDocumentFragment();

		// CSS style
		let style = document.createElement('style');
		style.textContent = `
			.searchFieldContainer {
				text-align: center;
			}
			.searchField {
				width: 30vw;
				font-size: 2vw;
  				height: 2vw;
				margin: 10px 5px 10px 5px;
				-webkit-border-radius: 50px;
				-moz-border-radius: 50px;
				border-radius: 50px;
				text-align: center;
			}
		`;

		let searchBarContainer = document.createElement('div');
		searchBarContainer.setAttribute('class', 'searchFieldContainer');
		let searchBarForm = document.createElement('form');
		let searchBarInput = document.createElement('input');
		searchBarInput.setAttribute('class', 'searchField');
		searchBarInput.setAttribute('type', 'text');

		searchBarForm.appendChild(searchBarInput);
		searchBarContainer.appendChild(searchBarForm);
		docFrag.appendChild(style);
		docFrag.appendChild(searchBarContainer);
		shadow.appendChild(docFrag);
	}

	/**
	 * Once the element is attached to the DOM
	 */
	connectedCallback() {
		//let text = '';
		this.addEventListener('keyup', function(ev) {
			// log the characters being entered	(but this will register ENTER, SHIFT, etc.)		
			//text += String.fromCharCode(ev.which);

			// get the value from the text field
			let textFieldElem = this.shadowRoot.querySelector('.searchField');
			let text = textFieldElem.value;

			// search the cards based on the search string
			this.searchCards(text);			
		});
	}

	/**
	 * Search for cards based on the search string
	 * @param {string} searchText 
	 */
	searchCards( searchText ) {
		console.log('??? searchCards');

		let elemArr = document.querySelectorAll('.cardElem');
		// go through all the cards and check the title name
		elemArr.forEach( function( elem, idx ) {
			let titleElem = elem.shadowRoot.querySelector('.title');
			let titleText = titleElem.textContent;
			// remove spaces and new lines
			titleText = titleText.replace(/(\r\n\t|\n|\r\t)/gm,"");
			// set to upper case (toggle case insensitivity)
			titleText = titleText.toUpperCase().trim();
			searchText = searchText.toUpperCase().trim();

			//console.log(searchText);
			//console.log(titleText);

			// check if the title partially contains the search parameter
			// TODO: using style display screws up attaching the card to the container
			if ( titleText.indexOf(searchText) === -1 ) {
				//elem.style.display = 'none';
				elem.style.visibility = 'hidden';
			} else {
				//elem.style.display = 'initial';
				elem.style.visibility = 'visible';
			}
		});
	}

} //end class


//////////////////////////////////////////////////////////////////////////////


/**
 * The main card board class
 */
class MyCardBoard extends HTMLElement {

	/**
	 * The default contructor
	 */
	constructor() {
		super();		
	}

} //end class


//////////////////////////////////////////////////////////////////////////////


// register the custom elements
customElements.define('my-card', MyCard);
customElements.define('my-card-container', MyCardContainer);
customElements.define('my-card-search', MyCardSearchBar);
// note: why does the shadow DOM disappear when extending an existing built-in element?
customElements.define('my-card-board', MyCardBoard, { extends: 'div' });

