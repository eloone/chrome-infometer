/* Scripts that manage the storage mechanism for the chrome sync storage */

//changes in settings from local storage that need to be written in sync storage
var storageChangesQueue = [];
var storageSynced = false;
var cleanStorageTimer;
var syncStorageTimer;

/* * * * storage processes * * * */

//daemon that executes every hour to make sure the number of items in sync storage doesn't exceed 500 items
//real limit is 512 items
//it will remove at least 100 items if nb of items > 500
//@all is the entire object returned by storage
function cleanStorage(all){

	if(!all){
		chrome.storage.sync.get(null, clean);
	}else{
		clean(all);
	}
	
	function clean(all){
		var remove = toClean(all);

		removeItems(remove);
	}

	//we clean the storage every 1 hour so it does not exceed 500 items
	//I don't see the benefits of using chrome.alarms api so I leave this as is
	cleanStorageTimer = setTimeout(cleanStorage, 3.6e+6);
}

//the storage initialisation transfers the sync storage into the local storage
function initStorage(){

	//first clear the local storage - this happens when extension is first installed/enabled
	chrome.storage.local.clear(syncToLocal);

	function syncToLocal(){
		chrome.storage.sync.get(null, function(all){
	
			cleanStorage(all);
			
			if(isEmpty(all)){
				chrome.storage.local.clear();
			}
			
			//we transfer synced content to local storage
			chrome.storage.local.set(all, function(){
				storageSynced = true;
			});
		
		});	
	}
	
}

//daemon that executes every 7 seconds to write the changes made to local storage into sync storage
//this allows to circomvent the sync storage write limit of 10 write operations/min
//chrome considers that a write operation = the call of remove/set/clear it's not the actual nb of items being processed
function syncStorage(){
	
	while(storageChangesQueue.length > 0){
		storageSynced = false;
		
		var changed = storageChangesQueue.pop();
		
		for(var url in changed){
			if(typeof(changed[url].newValue) !== 'undefined'){
				var newValue = {};
				newValue[url] = changed[url].newValue;
				
				chrome.storage.sync.set(newValue, function(){
					if(!chrome.runtime.lastError){
						storageSynced = true;
					}else{
						storageSynced = false;
					}
					
					console.log('sync storage synced');						
				});
			}
		}
	}
	
	//write to synced storage is controlled by extension here
	//this is ~8 write operations per minute /storage write limit is 10 op/min
	syncStorageTimer = setTimeout(syncStorage, 7000);
}

/* * * * sync storage cleaning helpers * * * */

//returns an array of url keys that should be removed from storage
//@all is the entire object returned by storage
function toClean(all){
	var total = 0, remove = [];

	for(var url in all){
		total++;
	}
	
	//storage capacity can't exceed 512 items
	if(total > 500){
		//first we remove any entry where the extension is disabled
		remove = removeDisabled(all);
		
		//we always remove 100 records at each round
		//we assume every hour we visit at most 100 different urls
		//if there is not enough disabled records to remove we remove the remaining least recent records			
		if(remove.length < 100){
			remove = remove.concat(removeLeastRecent(all, {howMany : 100 - remove.length, excludedKeys : remove}));
		}
	}

	return remove;
}

//returns an array of url keys where the extension is inactive
//these records represent all the tabs where the extension was once activated then deactivated by clicking on the icon
//the case where the extension is inactive and has never been active doesn't exist because we start storing records only when the icon is clicked
//@all is the entire object returned by storage
function removeDisabled(all){
	var remove = [];
	
	for(var url in all){
		if(all[url].enabled === false){
			remove.push(url);
		}
	}
	
	return remove;
}

//returns an array of url keys of least recent records regardless of activated or not
//@all is the entire object returned by storage
//@options has the key excludedKeys that is an array of url keys we want to exclude from the result
function removeLeastRecent(all, options){
	var storage = storageByDate(all);
	var byDate = storage.byDate, times = storage.sortedTimes;	
	var remove = [];
	var i = 0;
	var howMany = options.howMany;
	var excludedKeys = options.excludedKeys || null;

	while(remove.length < howMany){
		for(var j = 0; j < byDate[times[i]].length; j++ ){
			if(remove.length < howMany){
				//this allows to not include records already ready to be removed
				//avoids duplicates
				if(excludedKeys){
					if(excludedKeys.indexOf(byDate[times[i]][j].url) == -1){
						remove.push(byDate[times[i]][j].url);
					}
				}else{
					remove.push(byDate[times[i]][j].url);
				}				
			}
		}

		i++;
	}
	
	return remove;
}

//removes the items from sync storage
function removeItems(keysArray){
	chrome.storage.sync.remove(keysArray, function(){
		if(chrome.runtime.lastError){
			console.log('error in removeItems');
			console.error(chrome.runtime.lastError);
		}
		
		console.log('removed items');
	});
}

//returns a structure that holds the storage object where each record corresponds to its timestamp 
//and an array of the timestamps sorted
function storageByDate(all){
	
	var byDate = {}, times = [];

	//we put items in an structure where the time is the key
	for(var url in all){
		//simple paranoia it should never happen
		if(typeof all[url]['time'] == 'undefined'){
			console.log('The key "time" does not exist in removeLeastRecent. Cancelled removeLeastRecent.');
			return;
		}
		
		var timeMs = all[url]['time'];
		
		//each key points to an array in case same time for different tabs /don't forget the write is asynchronous		
		if(typeof byDate[timeMs] == 'undefined'){
			byDate[timeMs] = [all[url]];
		}else{
			byDate[timeMs].push(all[url]);
		}
		
		if(times.indexOf(timeMs) == -1){
			times.push(timeMs);
		}					
	}

	times.sort();

	return {
		byDate : byDate,
		sortedTimes : times
	};
}
