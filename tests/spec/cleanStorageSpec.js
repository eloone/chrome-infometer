describe("cleanStorage", function() {

  beforeEach(function() {
    jasmine.addMatchers(customMatchers);
  });

  it("should clean the 100 least recent when there are more than 500 active records", function() {
	 var all = mockStorage(510, 'enabled', 'active');
	 var remove = toClean(all);
	 var storage = storageByDate(all);
	 var byDate = storage.byDate;
	 var times = storage.sortedTimes;
	 var sortedByTimes = [];

	 for(var i = 0; i < times.length; i++){
	 	sortedByTimes.push(byDate[times[i]]);
	 }

	 expect(sortedByTimes[227].time == times[227]);
	 expect(sortedByTimes[227].time < sortedByTimes[345]);
	 expect(count(all)).toEqual(510);
	 expect(remove.length).toEqual(100);

	 var cleanRecords = mockRemoveItems(remove, all);

	 expect(count(cleanRecords)).toEqual(410);

  });

  it("should clean the disabled records when there are more than 500 records", function() {
	 var disabledRecords = mockStorage(122, 'disabled', 'inactive');
	 var enabledRecords = mockStorage(194, 'enabled', 'active');
	 var activeRecords = mockStorage(194, 'disabled', 'active');

	 var all = merge(disabledRecords, enabledRecords, activeRecords);
	 var disabledAndInactive = count(all, {enabled : false, m1Top : null});
	 var remove = toClean(all);

	 expect(count(all)).toEqual(510);
	 expect(disabledAndInactive).toEqual(122);
	 expect(remove.length).toEqual(disabledAndInactive);

	 var cleanRecords = mockRemoveItems(remove, all);
	 disabledAndInactive = count(all, {enabled : false, m1Top : null});

	 expect(count(cleanRecords)).toEqual(388);
	 expect(count(disabledAndInactive)).toEqual(0);

  });

  it("should clean 100 records when there are more than 500 records and less than 100 disabled records", function() {
	 var enabledRecords = mockStorage(495, 'enabled', 'active');
	 var disabledRecords = mockStorage(15, 'disabled', 'inactive');
	 var all = merge(enabledRecords, disabledRecords);
	 var disabledToRemove = removeDisabled(all);
	 var leastRecentToRemove = removeLeastRecent(all, {howMany : 100 - disabledToRemove.length, excludedKeys : disabledToRemove});
	 var remove = toClean(all);

	 expect(count(all)).toEqual(510);
	 expect(disabledToRemove.length).toEqual(15);
	 expect(leastRecentToRemove.length).toEqual(85);
	 expect(remove.length).toEqual(100);

	 var cleanRecords = mockRemoveItems(remove, all);
	 var disabledAndInactive = count(all, {enabled : false, m1Top : null});

	 expect(count(cleanRecords)).toEqual(410);
	 expect(count(disabledAndInactive)).toEqual(0);

  });

  it("should clean at least 100 records when there are more than 500 records at each round", function() {
	 var all = mockStorage(510, 'random', 'random');
	 var remove = toClean(all);

	 expect(count(all)).toEqual(510);
	 expect(remove.length).not.toBeLessThan(100);

	 var cleanRecords = mockRemoveItems(remove, all);
	 var disabledAndInactive = count(all, {enabled : false, m1Top : null});

	 expect(count(cleanRecords)).not.toBeGreaterThan(410);
	 expect(count(disabledAndInactive)).toEqual(0);

  });
});
