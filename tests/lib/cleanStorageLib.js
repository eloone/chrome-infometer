function mockStorage(quantity, isenabled, isactivated){
	
	var all = {};
	
	for(var i = 0; i < quantity; i ++){
		var entry = new Entry();
		all[entry.url] = entry;
	}
	
	function Entry(){
		var date = randomDate();
		var enabled = true;
		var activated = true;

		if(isenabled){
			switch(isenabled){
				case 'enabled':
					enabled = true;
					break;
				case 'disabled':
					enabled = false;
					break;
				case 'random':
					enabled = randomBoolean();
					break;
			}
		}

		if(isactivated){
			switch(isactivated){
				case 'active':
					activated = true;
					break;
				case 'inactive':
					activated = false;
					break;
				case 'random':
					activated = randomBoolean();
					break;
			}
		}
		
		var entry = {
			enabled : enabled,
			m1Top : activated ? 5 : null,
			m2Top : activated ? 100 : null,
			url : randomUrl(),
			time : date.getTime(),
			date : date
		};
		
		return entry;
	}

	function randomBoolean(){
		return Math.round(Math.random()) == 1;
	}
	
	function randomUrl(){
		return 'http://'+Math.random().toString(36).substring(7)+'.com'
	}
	
	function randomDate(){
		var year = 2014;
		var day = Math.round(Math.random()*30);
		var month = Math.round(Math.random()*11);
		
		return new Date(year, month, day);
	}
	
	return all;
}

function count(obj, query){
	var k = 0;
	
	//count records that match the query
	if(query){
		for(var i in obj){
			if(obj.hasOwnProperty(i)){
				var match = false;
				for(var key in query){
					if(obj[i][key] == query[key]){
						match = true;
					}else{
						match = false;
						break;
					}
				}

				if(match){
					k++;
				}
			}
		}
	}
	//count all records
	else{
		for(var i in obj){
			if(obj.hasOwnProperty(i)){
				k++;
			}
		}
	}
	
	return k;
}

function mockRemoveItems(remove, all){
	console.log(count(all));
	for(var i = 0; i < remove.length; i++){
		delete all[remove[i]];
	}

	return all;
}