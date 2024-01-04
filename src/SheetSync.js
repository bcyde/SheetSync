class SheetSync {
    #apiUrl = null;
    #syncInterval = null;
    #settings = {
        syncTiming: 1000, //default update every second, which should fall in well below google sheets API rate limits if only a few copies of the page are open per account
        callbacks: {}
    };    
    
    constructor(options) {					
        if (typeof options == 'object') {						
            this.#settings = {...this.#settings, ...options};
        }

        if (this.#settings.hasOwnProperty('apiKey') && this.#settings.hasOwnProperty('spreadsheetId')) {
            this.#apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${this.#settings.spreadsheetId}/values/Sheet1?key=${this.#settings.apiKey}`;
        }
    }    

    fetchData() {
        if (this.#apiUrl) {
            fetch(this.#apiUrl)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                // Process the data
                const values = data.values;
                if (values && values.length) {
                    /**
                     * columns of data should be:
                     * 0: <string> HTML element id to match
                     * 1: <string> value to be synced
                     * 2: rules to process value (default will be to just replace innerText of element)
                     * anything columns are ignored and can be used for instructional purposes
                     */                    
                    for (let i = 1; i < values.length; i++) { //start at 1 since 0 is our header row			
                        if (values[i][0] && values[i][0].length) {
                            const id = values[i][0];
                            const syncValue = values[i][1];
                            const element = document.getElementById(id);                            
                            if (element) {
                                if (values[i][2] && values[i][2].length) {
                                    try {													
                                        const processCommand = JSON.parse(values[i][2]);
                                        if (processCommand && processCommand.hasOwnProperty('action') ) {														
                                            switch(processCommand.action) {
                                                case 'background-image': //set background image																                                                    
                                                    element.style['background-image'] = 'url(' + syncValue + ')';                                                    
                                                    break;
                                                case 'className': //replaces the entire classname
                                                    element.className = syncValue; 
                                                    break;
                                                case 'classMap': //sets class based on map, but does not clear out any exisitng classes on the element (unless it was part of the map)																
                                                    if (processCommand.hasOwnProperty('value') ) {																	
                                                        const classMap = JSON.parse(processCommand.value);
                                                        //first clear our old values
                                                        element.classList.remove(...classMap.values);
                                                        //check if we have a valid value and if so, set it
                                                        const selectedOptionIndex = classMap.options.indexOf(syncValue);
                                                        if (selectedOptionIndex !== -1) {
                                                            element.classList.add(classMap.values[selectedOptionIndex]);
                                                        }
                                                    }    
                                                    break;
                                                case 'attribute': //use for data attributes or src, etc
                                                    if (processCommand.hasOwnProperty('value') ) {
                                                        element.setAttribute(processCommand.value, syncValue);
                                                    }                                                    
                                                    break;
                                                case 'style':																
                                                    if (processCommand.hasOwnProperty('value') ) {																	
                                                        element.style[processCommand.value] = syncValue;
                                                    }
                                                    break;
                                                case 'callback':																
                                                    if (processCommand.hasOwnProperty('value') ) {
                                                        if (this.#settings.callbacks.hasOwnProperty(processCommand.value) && typeof this.#settings.callbacks[processCommand.value] === 'function') {
                                                            this.#settings.callbacks[processCommand.value](element, syncValue, processCommand);
                                                        }
                                                    }                                                    
                                                    break;
                                                case 'text': //default just set innertext
                                                default: 
                                                    element.innerText = syncValue;
                                                    break;
                                            }
                                        }
                                    } catch (exception) {
                                        console.log('Error occurred while attempting to sync element at row: ' + i + ' ' + exception);
                                    }                                    
                                } else {
                                    element.innerText = syncValue;
                                }
                            }
                        }							
                    }
                }
                
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });	
        } else {
            console.log('Error no apiUrl not initialized, make sure apiKey and spreadsheetId were included in constructor.')
        }        
    }

    sync() {
        //make sure we aren't already syncing and have an interval set
        if (!this.#syncInterval) {
            this.fetchData();
            this.#syncInterval = setInterval(this.fetchData.bind(this), this.#settings.syncTiming);
        }
    }

    stopSync() {
        if (this.#syncInterval) {
            clearInterval(this.#syncInterval);
            this.#syncInterval = null;
        }
    }

    registerCallback(callback) {					
        let callbackRegistered = false;
        if (typeof callback == 'function') {
            this.#settings.callbacks[callback.name] = callback;						
        }
    }
}

export { SheetSync };
