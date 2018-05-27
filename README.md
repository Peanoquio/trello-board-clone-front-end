# trello-board-clone
A Trello board clone using JavaScript web components

## Usage

To run a sample of how this works:
* Install [JSON Server](https://github.com/typicode/json-server) needed to make fake API calls
* Go to the `data` directory where `db.json` resides then run `json-server --watch db.json`
* Once the server is runnning, simply run `trello_clone.html` through a web browser
* The web app can read from (GET) and write to (POST, PATCH, DELETE) the `db.json` file through the running server


### Web Components

The web components that are created and used for this project can be found in `js/trello_clone_components.js`

```js
customElements.define('my-card', MyCard);
customElements.define('my-card-container', MyCardContainer);
customElements.define('my-card-search', MyCardSearchBar);
customElements.define('my-card-board', MyCardBoard, { extends: 'div' });
```

### API calls

The `TrelloCloneMgr` class in `js/trello_clone_manager.js` manages the initialization and rendering of the board.
It is also responsible for handling the API calls to the JSON server where it inserts, updates, deletes data based on the actions performed on the board.

## Dependencies

Your web browser should be able to support Web Components, JS Promises and Fetch API.

## License

This is an open source project under the MIT license.  For more information, please refer to [license.txt](license.txt) 
