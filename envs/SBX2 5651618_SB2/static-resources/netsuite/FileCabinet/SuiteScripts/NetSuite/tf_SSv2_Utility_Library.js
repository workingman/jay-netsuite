/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       1 Jul 2022     Amod Deshpande
 *
 */
function getValidNumber(valueToCheck) 
{
	if (isNaN(valueToCheck) || valueToCheck == null || valueToCheck == "") 
	{
		return 0;
	} 
	else 
	{
		var parsedValue = parseFloat(valueToCheck);
		return parsedValue;
	}
}

function getAllRowsFromList(search, searchId, filters, columns) 
{
//	log.debug('Checking', 'searchId = '+ searchId);

	var searchObj = search.load({id: searchId});

	if (filters != null && filters != 'undefined')
	{	
		var srchFilters = searchObj.filters;
		for(var idx=0; idx < filters.length; idx++)
		{
			srchFilters.push(filters[idx]);
		}
		searchObj.filters = srchFilters;
	}
	
	if (columns != null && columns != 'undefined')
	{	
		var srchColumns = searchObj.columns;
		for(var idx=0; idx < columns.length; idx++)
		{
			srchColumns.push(columns[idx]);
		}
		searchObj.columns = srchColumns;
	}
	var retList = null;
	var startPos = 0;
	var endPos = 1000;

	var searchResult = searchObj.run();
	while (true) 
	{
		var currList = searchResult.getRange(startPos, endPos);
				
		if (currList == null || currList.length <= 0)
			break;
		if (retList == null) {
			retList = currList;
		} else {
			retList = retList.concat(currList);
		}
		if (currList.length < 1000) {
			break;
		}
		startPos += 1000;
		endPos += 1000;
	}

	return retList;
}

getDateTime = function(params, format) {
	var dateTime = format.format({
		value: params.date,
		type: format.Type.DATETIME
	});
	return dateTime;
};


function formatAMPM(date) {
	var hours = date.getHours();
	var minutes = date.getMinutes();
	var ampm = hours >= 12 ? 'pm' : 'am';
	hours = hours % 12;
	hours = hours ? hours : 12; // the hour '0' should be '12'
	minutes = minutes < 10 ? '0'+minutes : minutes;
	var strTime = hours + ':' + minutes + ' ' + ampm;
	return strTime;
}

function convNull(value)
{
	if(value == null)
		return '';
	return value;
}

