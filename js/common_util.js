const PREFIX_CARD = 'card_';
const PREFIX_CONTAINER = 'container_';


/**
 * The common utility class
 */
class CommonUtil {

    /**
     * Convert the card id to DB format
     * @param {string} cardId 
     */
    static convertCardIdToDbFormat( cardId ) {
        let cardIdDbFormat = cardId.substr( cardId.indexOf(PREFIX_CARD) + PREFIX_CARD.length );
        return cardIdDbFormat;
    }

    /**
     * Convert the container id to DB format
     * @param {string} containerId 
     */
    static convertContainerIdToDbFormat( containerId ) {
        let containerIdDbFormat = containerId.substr( containerId.indexOf(PREFIX_CONTAINER) + PREFIX_CONTAINER.length );
        return containerIdDbFormat;
    }

    /**
	 * Generates the card id
	 */
	static generateCardId() {
		// try to generate a unique id on the client side
		// UNIX timestamp and random number between 1 and 100
		return `${PREFIX_CARD}${Date.now()}_${Math.floor((Math.random() * 100) + 1)}`;
	}

} //end class