/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 *
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       30 Jun 2016     cmartinez        Initial version
 * 
 */

//--import cw_util.js   orig func=afterSubmit_linkInvoiceOrBill??

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function beforeLoad_updateCWLineAmount(type, form, request) 
{       
	try
	{
		var stLoggerTitle = 'beforeLoad_updateCWLineAmount';
		nlapiLogExecution('debug', stLoggerTitle, '============================= Script Entry =============================');
		

		//Script only executes on create events
	    if (type != 'create')
	    {
	    	return;
	    }
	    
	    
	    var stRecType = nlapiGetRecordType();
        var intLines = nlapiGetLineItemCount('item');
        nlapiLogExecution('debug', stLoggerTitle, '47 Record Type = ' + stRecType);
        
        if(stRecType == 'invoice')
    	{
        	//Get created from value
    	    var stCreatedFrom = nlapiGetFieldValue('createdfrom');
    	    nlapiLogExecution('debug', stLoggerTitle, 'Created From  = ' + stCreatedFrom);
    	    
    	    //If not created from sales order, exit.
    	    if(NSUtil.isEmpty(stCreatedFrom)) 
    	    {
    	    	nlapiLogExecution('debug', stLoggerTitle, 'Not created from SO.');
    	    	nlapiLogExecution('debug', stLoggerTitle, '============================= Script Exit ==============================');
    	    	return;
    	    }
    	    
    	    //Get all items from sublist
    	    var arrItems = [];
    	    for(var g = 1; g <= intLines; g++)
    	    {
    	    	var stItem = nlapiGetLineItemValue('item', 'item', g);
    	    	if(!NSUtil.isEmpty(stItem)) arrItems.push(stItem);
    	    }
    	    
    	    //Get catch weight items
    	    var arrCWItems = getCatchWeightItems(arrItems);
    	    
    	    if(NSUtil.isEmpty(arrCWItems))
    	    {
    	    	nlapiLogExecution('debug', stLoggerTitle, 'No Catch Weight items found.');
    	    	nlapiLogExecution('debug', stLoggerTitle, '============================= Script Exit ==============================');
    	    	return;
    	    }
        	
    	    //Get linked transactions and sum of catch weight per item
    	    var arrLinkedTransactions = searchLinkedTransactions(stRecType, stCreatedFrom, arrCWItems);
    	    
    	    if(NSUtil.isEmpty(arrLinkedTransactions))
    	    {
    	    	nlapiLogExecution('debug', stLoggerTitle, 'No linked transactions found.');
    	    	nlapiLogExecution('debug', stLoggerTitle, '============================= Script Exit ==============================');
    	    	return;
    	    }
    	    
    	    var arrLinkedItems = [];
    	    for(var h = 0; h < arrLinkedTransactions.length; h++)
    	    {
    	    	var stItemId = arrLinkedTransactions[h].getValue('item', null, 'group');
    	    	arrLinkedItems.push(stItemId);
nlapiLogExecution('debug', stLoggerTitle, '96 stItemId=' + stItemId);
    	    }
	        //Loop through line items to set catch weight amount as line amount
	        invcLoop : for (var i = 1; i <= intLines; i++) 
	        {
	            var stIdItem = nlapiGetLineItemValue('item', 'item', i);
	            var flPriceUM = NSUtil.forceFloat(nlapiGetLineItemValue('item', 'custcol_cw_price_um', i));
	            var flAvgWght = NSUtil.forceFloat(nlapiGetLineItemValue('item', 'custcol_cw_avg_wght', i));
	            if(!NSUtil.isEmpty(stIdItem) && NSUtil.inArray(stIdItem, arrLinkedItems))
	            {
		            var intLinkIndex = arrLinkedItems.indexOf(stIdItem);
nlapiLogExecution('debug', stLoggerTitle, '107 stIdItem=' + stIdItem + ', intLinkIndex=' + intLinkIndex);
		            var flRate = NSUtil.forceFloat(nlapiGetLineItemValue('item', 'rate', i));

            		var stOldValue = nlapiGetLineItemValue('item', 'amount', i);
	            	var flSumCatchWeightFromIF = NSUtil.forceFloat(nlapiGetLineItemValue('item','custcol_cw_act_wght', i));
	            	//var flSumCatchWeightFromIF = NSUtil.forceFloat(arrLinkedTransactions[i].getValue('custcol_cw_catch_weight', null, 'group')); //intLinkIndex, sum
nlapiLogExecution('debug', stLoggerTitle, '113 flSumCatchWeightFromIF=' + flSumCatchWeightFromIF + ', i=' + i + ', flPriceUM=' + flPriceUM + ', flRate=' + flRate);
					if ((flAvgWght == 2.2) || (flAvgWght == .4536)) { flPriceUM = flPriceUM * flAvgWght; } //for lb-kg conversions	            	
					var flNewAmount = flSumCatchWeightFromIF * flPriceUM;
	            	
	            	var flQuantity = NSUtil.roundDecimalAmount((flNewAmount / flRate), 0); //forceInt, /flRate=orig  (flPriceUM * flAvgWght)-errors when avg wght=0
nlapiLogExecution('debug', stLoggerTitle, '117 flNewAmount=' + flNewAmount + ', flAvgWght=' + flAvgWght + ', flQuantity=' + flQuantity);
	            	// Set amount as sum of catch weight from item fulfillment, multiplied with rate
	            	nlapiSetLineItemValue('item', 'custcol_cw_act_wght', i, flSumCatchWeightFromIF);
	            	nlapiSetLineItemValue('item', 'amount', i, nlapiFormatCurrency(flNewAmount));
	            	
	            	/* if(flRate != 0)
	            	{
	            		nlapiSetLineItemValue('item', 'quantity', i, flQuantity); //why is this done??
	            	}
		            
		            nlapiLogExecution('debug', stLoggerTitle, '[' + i + '] Line amount updated! Item = ' + stIdItem
		            																+ ' | Old amount = ' + stOldValue
			            															+ ' | Sum of Unbilled Catch Weight = ' + flSumCatchWeightFromIF
		            																+ ' | Line Price UM = ' + flPriceUM
		            																+ ' | NEW AMOUNT = ' + flNewAmount); */
	            }
	        }
    	}
	        
        if(stRecType == 'vendorbill')
    	{   
			
			nlapiLogExecution('DEBUG', stLoggerTitle, '141 Request Header: ' + request);
			var stCreatedFrom = '';
			var stTransformFrom = '';
			
			if(!NSUtil.isEmpty(request))
			{
				stCreatedFrom = request.getParameter('id');
				stTransformFrom = request.getParameter('transform');
			}
			
    	    nlapiLogExecution('debug', stLoggerTitle, '151 Created From = ' + stCreatedFrom + ' | Transform = ' + stTransformFrom);
    	    
    	    //If not created from purchase order, exit.
    	    if(NSUtil.isEmpty(stCreatedFrom) || stTransformFrom.toLowerCase() != 'purchord') 
    	    {
    	    	nlapiLogExecution('debug', stLoggerTitle, 'Not created from PO.');
    	    	nlapiLogExecution('debug', stLoggerTitle, '============================= Script Exit ==============================');
    	    	return;
    	    }
    	    
    	    //Get all items from sublist
    	    var arrItems = [];
    	    for(var g = 1; g <= intLines; g++)
    	    {
    	    	var stItem = nlapiGetLineItemValue('item', 'item', g);
    	    	if(!NSUtil.isEmpty(stItem)) arrItems.push(stItem);
    	    }
    	    
    	    //Get catch weight items
    	    var arrCWItems = getCatchWeightItems(arrItems);
    	    
    	    if(NSUtil.isEmpty(arrCWItems))
    	    {
    	    	nlapiLogExecution('debug', stLoggerTitle, 'No Catch Weight items found.');
    	    	nlapiLogExecution('debug', stLoggerTitle, '============================= Script Exit ==============================');
    	    	return;
    	    }
    	    
    	    //Get linked transactions and sum of catch weight per item
//nlapiLogExecution('debug', stLoggerTitle, '180 stRecType=' + stRecType + ', stCreatedFrom=' + stCreatedFrom);     	    
    	    var arrLinkedTransactions = searchLinkedTransactions(stRecType, stCreatedFrom, arrCWItems);
    	    
    	    if(NSUtil.isEmpty(arrLinkedTransactions))
    	    {
    	    	nlapiLogExecution('debug', stLoggerTitle, 'No linked transactions found.');
    	    	nlapiLogExecution('debug', stLoggerTitle, '============================= Script Exit ==============================');
    	    	return;
    	    }
    	    
    	    var arrLinkedItems = [];
    	    for(var h = 0; h < arrLinkedTransactions.length; h++)
    	    {
    	    	var stItemId = arrLinkedTransactions[h].getValue('item', null, 'group');
//nlapiLogExecution('debug', stLoggerTitle, '194 stItemId=' + stItemId);
    	    	arrLinkedItems.push(stItemId);
    	    }
    	    
    	    //Loop through line items to set catch weight amount as line amount
	        vbLoop : for (var i = 1; i <= intLines; i++) 
	        {
	            var stIdItem = nlapiGetLineItemValue('item', 'item', i);
	            var flPriceUM = NSUtil.forceFloat(nlapiGetLineItemValue('item', 'custcol_cw_price_um', i));
//nlapiLogExecution('debug', stLoggerTitle, '203 stIdItem=' + stIdItem); 
	            if(!NSUtil.isEmpty(stIdItem) && NSUtil.inArray(stIdItem, arrLinkedItems))
	            {
//nlapiLogExecution('debug', stLoggerTitle, '206 stIdItem=' + stIdItem);
                    var intLinkIndex = arrLinkedItems.indexOf(stIdItem);
		            
            		var stOldValue = nlapiGetLineItemValue('item', 'amount', i);
            		
            		var flRate = NSUtil.forceFloat(nlapiGetLineItemValue('item', 'rate', i));
nlapiLogExecution('debug', stLoggerTitle, '212 stOldValue=' + stOldValue + ', intLinkIndex=' + intLinkIndex + ', flRate=' + flRate);
                    var flSumCatchWeightFromIF = NSUtil.forceFloat(nlapiGetLineItemValue('item','custcol_cw_act_wght', i));
	            	//var flSumCatchWeightFromIF = NSUtil.forceFloat(arrLinkedTransactions[intLinkIndex].getValue('custcol_cw_catch_weight', null, 'group')); //, 'sum'
nlapiLogExecution('debug', stLoggerTitle, '214 flSumCatchWeightFromIF=' + flSumCatchWeightFromIF);
	            	var flNewAmount = flSumCatchWeightFromIF * flPriceUM;
	            	
	            	//var flQuantity = NSUtil.forceInt(flNewAmount / flRate);
	            	var flQuantity = NSUtil.roundDecimalAmount((flNewAmount / flRate), 0);
nlapiLogExecution('debug', stLoggerTitle, '219 flNewAmount=' + flNewAmount + ', flRate=' + flRate + ', flQuantity=' + flQuantity);
	            	// Set amount as sum of catch weight from item fulfillment, multiplied with rate
	            	nlapiSetLineItemValue('item', 'custcol_cw_act_wght', i, flSumCatchWeightFromIF);
	            	nlapiSetLineItemValue('item', 'amount', i, nlapiFormatCurrency(flNewAmount));
		            
	            	/* if(flRate != 0)
	            	{
	            		nlapiSetLineItemValue('item', 'quantity', i, flQuantity); //why is this done??
	            	}
	            	
		            nlapiLogExecution('debug', stLoggerTitle, '[' + i + '] Line amount updated! Item = ' + stIdItem
		            																+ ' | Old amount = ' + stOldValue
			            															+ ' | Sum of Unbilled Catch Weight = ' + flSumCatchWeightFromIF
		            																+ ' | Line Price UM = ' + flPriceUM
		            																+ ' | NEW AMOUNT = ' + flNewAmount); */
		            	
		            
	            }
	        }
    	}
	    
	    
	    nlapiLogExecution('debug', stLoggerTitle, '============================= Script Exit ==============================');
	}
	catch(error)
	{
		handleError(error);
	}
}

/**
 * Filter catch weight items from transaction sublist
 * 
 * @param arrItems
 * @returns {Array}
 */
function getCatchWeightItems(arrItems)
{
	var arrCWItems = [];

	var arrFilters = [];
	arrFilters.push(new nlobjSearchFilter(FLD_CATCH_WEIGHT_ITEM, null, 'is', 'T'));
	arrFilters.push(new nlobjSearchFilter('internalid', null, 'anyof', arrItems));
	
	var arrResults = [];
	try
	{
		arrResults = NSUtil.search('item', null, arrFilters);
	}
	catch(error)
	{
		if (error.getDetails != undefined) 
	    {
	      	nlapiLogExecution('ERROR','Process Error', 'process() ' + error.getCode() + ': ' + error.getDetails());
	    } 
	    else 
	    {
	   	 	nlapiLogExecution('ERROR','Unexpected Error', 'process() ' + error.toString());   
	    }
		arrResults = [];
	}
	
	if(!NSUtil.isEmpty(arrResults))
	{
		for(var i = 0; i < arrResults.length; i++)
		{
			var stItemId = arrResults[i].id;
			arrCWItems.push(stItemId);
		}
	}
	
	return arrCWItems;
}

/**
 * Search for linked transactions to record
 * 
 * @param stRecType
 * @param stCreatedFrom
 * @param stItemId
 * @returns {Array}
 */
function searchLinkedTransactions(stRecType, stCreatedFrom, arrCWItems)
{
	var arrResults = [];
	
	var stLinkType = 'transaction';
	switch(stRecType)
	{
		case 'invoice':
			stLinkType = 'itemfulfillment';
			break;
		case 'vendorbill':
			stLinkType = 'itemreceipt';
			break;
		default:
			stLinkType = 'transaction';
			
	}
	
	var arrFilters = [];
	//arrFilters.push(new nlobjSearchFilter('custbody_invoice_bill_id', null, 'isempty' )); //no cw id for it-not used?
	arrFilters.push(new nlobjSearchFilter('createdfrom', null, 'is', stCreatedFrom ));
	arrFilters.push(new nlobjSearchFilter('item', null, 'anyof', arrCWItems));
nlapiLogExecution('debug', 'searchLinkedTransactions', '323 stRecType=' + stRecType + ', stLinkType=' + stLinkType); 	
	var arrColumns = [];
	arrColumns.push(new nlobjSearchColumn('custcol_cw_catch_weight', null, 'group')); //, 'sum'-chg fld to txt
	arrColumns.push(new nlobjSearchColumn('item', null, 'group'));
	
	try
	{
		arrResults = NSUtil.search(stLinkType, null, arrFilters, arrColumns);
	}
	catch(error)
	{
		if (error.getDetails != undefined) 
	    {
	      	nlapiLogExecution('ERROR','Process Error', 'process() ' + error.getCode() + ': ' + error.getDetails());
	    } 
	    else 
	    {
	   	 	nlapiLogExecution('ERROR','Unexpected Error', 'process() ' + error.toString());   
	    }
		arrResults = [];
	}
	
	
	return arrResults;
}

/**
 * Log and throw error
 * 
 * @param error
 */
function handleError(error)
{
	if (error.getDetails != undefined) 
    {
      	nlapiLogExecution('ERROR','Process Error', 'process() ' + error.getCode() + ': ' + error.getDetails());
      	throw error;
    } 
    else 
    {
   	 	nlapiLogExecution('ERROR','Unexpected Error', 'process() ' + error.toString());   
   	 	throw nlapiCreateError('99999', error.toString());
    }
}

/**
 * Module Description:
 *
 * Compilation of utility functions that utilizes SuiteScript API
 *
 * Version    Date				Author				Remarks
 * 1.00       June 8, 2016		MTS Team			Initial version.
 *
 */

var NSUtil =
	{
	    /**
	     * Evaluate if the given string or object value is empty, null or undefined.
	     * @param {String} stValue - string or object to evaluate
	     * @returns {Boolean} - true if empty/null/undefined, false if not
	     * @author mmeremilla
	     */
	    isEmpty : function(stValue)
	    {
		    if ((stValue === '') //Strict checking for this part to properly evaluate integer value.
		            || (stValue == null) || (stValue == undefined))
		    {
			    return true;
		    }
		    else
		    {
			    if (stValue.constructor === Array)//Strict checking for this part to properly evaluate constructor type.
			    {
				    if (stValue.length == 0)
				    {
					    return true;
				    }
			    }
			    else if (stValue.constructor === Object)//Strict checking for this part to properly evaluate constructor type.
			    {
				    for ( var stKey in stValue)
				    {
					    return false;
				    }
				    return true;
			    }

			    return false;
		    }
	    },

	    /**
	     * Shorthand version of isEmpty
	     *
	     * @param {String} stValue - string or object to evaluate
	     * @returns {Boolean} - true if empty/null/undefined, false if not
	     * @author bfeliciano
	     */
	    _isEmpty : function(stValue)
	    {
	    	return ((stValue === '' || stValue == null || stValue == undefined)
	    			|| (stValue.constructor === Array && stValue.length == 0)
	    			|| (stValue.constructor === Object && (function(v){for(var k in v)return false;return true;})(stValue)));
	    },

	    /**
	     * Evaluate if the given string is an element of the array, using reverse looping
	     * @param {String} stValue - String value to find in the array
	     * @param {String[]} arrValue - Array to be check for String value
	     * @returns {Boolean} - true if string is an element of the array, false if not
	     */
	    inArray : function(stValue, arrValue)
	    {
		    var bIsValueFound = false;
		    for (var i = arrValue.length; i >= 0; i--)
		    {
			    //nlapiLogExecution('debug','inArray', '438 stValue=' + stValue + ', arrValue=' + arrValue[i]);
                if (stValue == arrValue[i])
			    {
				    bIsValueFound = true;
				    break;
			    }
		    }
		    return bIsValueFound;
	    },

	    /**
	     * Shorthand version of inArray
	     * @param {String} stValue - String value to find in the array
	     * @param {String[]} arrValue - Array to be check for String value
	     * @returns {Boolean} - true if string is an element of the array, false if not
	     */
	    _inArray : function(stValue, arrValue)
	    {
		    for (var i = arrValue.length; i >= 0; i--)
		    {
			    if (stValue == arrValue[i])
			    {
				    break;
			    }
		    }
		    return (i > -1);
	    },

	    /**
	     * Evaluate if the given string is an element of the array
	     * @param {String} stValue - String value to find in the array
	     * @param {String[]} arrValue - Array to be check for String value
	     * @returns {Boolean} - true if string is an element of the array, false if not
	     */
	    inArrayOld : function(stValue, arrValue)
	    {
		    var bIsValueFound = false;

		    for (var i = 0; i < arrValue.length; i++)
		    {
			    if (stValue == arrValue[i])
			    {
				    bIsValueFound = true;
				    break;
			    }
		    }

		    return bIsValueFound;
	    },

	    /**
	     * Converts string to float. If value is infinity or can't be converted to a number, 0.00 will be returned.
	     * @param {String} stValue - any string
	     * @returns {Number} - a floating point number
	     * @author jsalcedo
	     */
	    forceFloat : function(stValue)
	    {
		    var flValue = parseFloat(stValue);
nlapiLogExecution('debug','inArray', '499 stValue=' + stValue + ', flValue=' + flValue);
		    if (isNaN(flValue) || (stValue == Infinity))
		    {
			    return 0.00;
		    }

		    return flValue;
	    },

	    /**
	     * Converts string to integer. If value is infinity or can't be converted to a number, 0 will be returned.
	     * @param {String} stValue - any string
	     * @returns {Number} - an integer
	     * @author jsalcedo
	     */
	    forceInt : function(stValue)
	    {
		    var intValue = parseInt(stValue);

		    if (isNaN(intValue) || (stValue == Infinity))
		    {
			    return 0;
		    }

		    return intValue;
	    },
	       
/**
 * Round decimal number
 * @param {Number} flDecimalNumber - decimal number value
 * @param {Number} intDecimalPlace - decimal places
 * @returns {Number} - a floating point number value
 */
roundDecimalAmount : function(flDecimalNumber, intDecimalPlace)
{
	//this is to make sure the rounding off is correct even if the decimal is equal to -0.995
	var bNegate = false;
	if (flDecimalNumber < 0)
	{
		flDecimalNumber = Math.abs(flDecimalNumber);
		bNegate = true;
	}
	var flReturn = 0.00;

	if (intDecimalPlace == null || intDecimalPlace == '')
	{
		intDecimalPlace = 0;
	}

	var intMultiplierDivisor = Math.pow(10, intDecimalPlace);

	flReturn = Math.round(parseFloat(flDecimalNumber) * intMultiplierDivisor) / intMultiplierDivisor;

	if (bNegate)
	{
		flReturn = flReturn * -1;
	}

	return flReturn.toFixed(intDecimalPlace);
},

	    /**
	     * Get all of the results from the search even if the results are more than 1000.
	     * @param {String} stRecordType - the record type where the search will be executed.
	     * @param {String} stSearchId - the search id of the saved search that will be used.
	     * @param {nlobjSearchFilter[]} arrSearchFilter - array of nlobjSearchFilter objects. The search filters to be used or will be added to the saved search if search id was passed.
	     * @param {nlobjSearchColumn[]} arrSearchColumn - array of nlobjSearchColumn objects. The columns to be returned or will be added to the saved search if search id was passed.
	     * @returns {nlobjSearchResult[]} - an array of nlobjSearchResult objects
	     * @author memeremilla - initial version
	     * @author gmanarang - used concat when combining the search result
	     */
	    search : function(stRecordType, stSearchId, arrSearchFilter, arrSearchColumn)
	    {
		    if (stRecordType == null && stSearchId == null)
		    {
			    throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', 'search: Missing a required argument. Either stRecordType or stSearchId should be provided.');
		    }

		    var arrReturnSearchResults = new Array();
		    var objSavedSearch;

		    if (stSearchId != null)
		    {
			    objSavedSearch = nlapiLoadSearch((stRecordType) ? stRecordType : null, stSearchId);

			    // add search filter if one is passed
			    if (arrSearchFilter != null)
			    {
				    objSavedSearch.addFilters(arrSearchFilter);
			    }

			    // add search column if one is passed
			    if (arrSearchColumn != null)
			    {
				    objSavedSearch.addColumns(arrSearchColumn);
			    }
		    }
		    else
		    {
			    objSavedSearch = nlapiCreateSearch((stRecordType) ? stRecordType : null, arrSearchFilter, arrSearchColumn);
		    }

		    var objResultset = objSavedSearch.runSearch();
		    var intSearchIndex = 0;
		    var arrResultSlice = null;
		    do
		    {
			    if ((nlapiGetContext().getExecutionContext() === 'scheduled'))
			    {
				    try
				    {
					    this.rescheduleScript(1000);
				    }
				    catch (e)
				    {
				    }
			    }

			    arrResultSlice = objResultset.getResults(intSearchIndex, intSearchIndex + 1000);
			    if (arrResultSlice == null)
			    {
				    break;
			    }

			    arrReturnSearchResults = arrReturnSearchResults.concat(arrResultSlice);
			    intSearchIndex = arrReturnSearchResults.length;
		    }

		    while (arrResultSlice.length >= 1000);

		    return arrReturnSearchResults;
	    }
	};
