var storageChangesQueue = [];
var storageSynced = false;
var cleanStorageTimer;
var syncStorageTimer;

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
	cleanStorageTimer = setTimeout(cleanStorage, 3.6e+6);
}

function initStorage(){

	chrome.storage.sync.clear();

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

function syncStorage(){
	console.log('hello extension');
	console.log('storageChangesQueue in syncStorage');
	console.log(storageChangesQueue);
	
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

				console.log(newValue);
			}
		}
	}
	
	//write to synced storage is controlled by extension here
	//this is ~8 write operations per minute /storage write limit is 10 op/min
	syncStorageTimer = setTimeout(syncStorage, 7000);
}

/*******/

function toClean(all){
	var total = 0, remove = [];

	for(var url in all){
		total++;
	}
	
	//storage capacity can't exceed 512 items
	if(total > 500){
		//first we remove any entry where the extension is disabled and has never been enabled
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

function removeDisabled(all){
	var remove = [];
	
	for(var url in all){
		if(all[url].enabled === false && all[url].m1Top === null){
			remove.push(url);
		}
	}
	
	return remove;
}

function removeLeastRecent(all, options){
	//remove the 100 least recent
	var storage = storageByDate(all);
	var byDate = storage.byDate, times = storage.sortedTimes;	
	var remove = [];
	var i = 0;
	var howMany = options.howMany;
	var excludedKeys = options.excludedKeys || null;

	while(remove.length < howMany){
		for(var j = 0; j < byDate[times[i]].length; j++ ){
			if(remove.length < howMany){
				//this allows to not include records already ready to be removed in least recent records to remove
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

function removeItems(keysArray){
	chrome.storage.sync.remove(keysArray, function(){
		if(chrome.runtime.lastError){
			console.log(chrome.runtime.lastError);
		}
		
		console.log('removed items');
	});
}

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
