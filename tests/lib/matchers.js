var customMatchers = {
	toBeGreaterThanOrEqualTo : function(util, customEqualityTesters) {
		return {
			 compare: function(actual, expected) {
			 	 var result = {};

			 	 result.pass = actual >= expected;

			 	 if (result.pass) {
			 	 	result.message = actual + " is greater than or equal to "+ expected;
			 	 }else{
			 	 	result.message = "Expected " + actual + " to be greater than or equal to "+ expected ;
			 	 }

			 	 return result;
			 }
		};
	},
	toBeLessThanOrEqualTo : function(util, customEqualityTesters) {
		return {
			 compare: function(actual, expected) {
			 	 var result = {};

			 	 result.pass = actual <= expected;

			 	 if (result.pass) {
			 	 	result.message = actual + " is less than or equal to "+ expected;
			 	 }else{
			 	 	result.message = "Expected " + actual + " to be less than or equal to "+ expected ;
			 	 }

			 	 return result;
			 }
		};
	}
};