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
 * 1.00       06 Jun 2016	  cmartinez		   Initial version
 *
 */

//--import cw_util.js

/**
 * @param {String} type Operation types: edit, xedit
 * @return {void}
 */
function updateLinesAmountBeforeSubmit(type) 
{       
	try
	{
		var stLoggerTitle = 'updateLinesAmountBeforeSubmit';
		nlapiLogExecution('debug', stLoggerTitle, '============================= Script Entry =============================');
		
		//Script only executes on edit events; create always=0, not needed
	    if (type != 'edit' && type != 'xedit')
	    {
	    	return;
	    }
	    
        var stRecType = nlapiGetRecordType();
        var intLines = nlapiGetLineItemCount('item');
        nlapiLogExecution('debug', stLoggerTitle, 'Record Type = ' + stRecType);
        
        //Loop through line items to set catch weight amount as line amount
        for (var i = 1; i <= intLines; i++) 
        {
            var stIdItem = nlapiGetLineItemValue('item', 'item', i);
            if(!Eval.isEmpty(stIdItem))
            {
	            var stBCatchWeightItem = nlapiLookupField('item', stIdItem, FLD_CATCH_WEIGHT_ITEM);
	           
	            if(stBCatchWeightItem == 'T')
	            {
	            	if(stRecType == 'salesorder')
	            	{
		            	var flAmountFulfilled = Parse.forceFloat(nlapiGetLineItemValue('item', 'custcol_cw_fulfilled_amount', i));
		            	var flAmountUnfulfilled = Parse.forceFloat(nlapiGetLineItemValue('item', 'custcol_cw_pendfulfillamt', i));

                        var flAmount = flAmountFulfilled + flAmountUnfulfilled; //new 10/1/18
					    nlapiLogExecution('debug', stLoggerTitle, 'Edited SO line amount = ' + flAmount + ', i=' + i);

                        //var flPriceUM = Parse.forceFloat(nlapiGetLineItemValue('item', 'rate', i)); //for SF 10/9/18
                        //nlapiSetLineItemValue('item', COL_PRICE_UM, i, flPriceUM); //for SF 10/9/18
		            	nlapiSetLineItemValue('item', 'amount', i, roundOffValue(flAmount, 2));

			            nlapiLogExecution('debug', stLoggerTitle, 'Line amount updated! Fulfilled Amount = ' + flAmountFulfilled + ' | Pending Fulfillment Amount = ' + flAmountUnfulfilled); // + ', flPriceUM=' + flPriceUM);
	            	}

	            	if(stRecType == 'purchaseorder')
	            	{
		            	var flAmountReceived = Parse.forceFloat(nlapiGetLineItemValue('item', 'custcol_cw_received_amount', i));
		            	var flAmountUnReceived = Parse.forceFloat(nlapiGetLineItemValue('item', 'custcol_cw_pendreceiptamt', i));
			            
		            	var flAmount = flAmountReceived + flAmountUnReceived; 
			            nlapiLogExecution('debug', stLoggerTitle, 'Edited PO line amount = ' + flAmount);
                        nlapiSetLineItemValue('item', 'amount', i, roundOffValue(flAmount, 2));
			            
			            nlapiLogExecution('debug', stLoggerTitle, 'Line amount updated! Received Amount = ' + flAmountReceived + ' | Pending Receipt Amount = ' + flAmountUnReceived);
	            	}
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
 * Compilation of common utility functions used for:
 * - Evaluating objects
 * - Parsing objects
 * - Date helper
 */
var Parse =
{
		/**
		 * Converts string to float. If value is infinity or can't be converted to a number, 0.00 will be returned.
		 * @param {String} stValue - any string
		 * @returns {Number} - a floating point number
		 * @author jsalcedo
		 */
		forceFloat : function(stValue)
		{
			var flValue = parseFloat(stValue);

			if (isNaN(flValue) || (stValue == Infinity))
			{
				return 0.00;
			}

			return flValue;
		}
};

var Eval =
{
	/**
	 * Evaluate if the given string or object value is empty, null or undefined.
	 * @param {String} stValue - string or object to evaluate
	 * @returns {Boolean} - true if empty/null/undefined, false if not
	 * @author mmeremilla
	 */
	isEmpty : function(stValue)
	{
		if ((stValue == '') || (stValue == null) || (stValue == undefined))
		{
			return true;
		}
		else
		{
			if (typeof stValue == 'string')
			{
				if ((stValue == ''))
				{
					return true;
				}
			}
			else if (typeof stValue == 'object')
			{
				if (stValue.length == 0 || stValue.length == 'undefined')
				{
					return true;
				}
			}

			return false;
		}
	}
};
