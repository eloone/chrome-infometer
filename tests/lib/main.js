function merge(){
	var result = {}, objs = [].slice.call(arguments, 0);

	for(var i = 0; i < objs.length; i++){
		for(var k in  objs[i]){
			if(objs[i].hasOwnProperty(k)){
				result[k] = objs[i][k];
			}
		}
	}

	return result;
}