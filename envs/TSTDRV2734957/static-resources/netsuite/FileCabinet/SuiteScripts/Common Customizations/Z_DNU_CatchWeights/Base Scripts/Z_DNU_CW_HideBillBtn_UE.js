/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information").
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement
 * you entered into with NetSuite.
 */

/**
 * Module Description:
 * 
 * 
 * Version    Date				Author				Remarks
 * 1.00       08 Jun 2016     memeremilla			Initial version
 *
 */

//'use strict';
var CONTEXT = nlapiGetContext();

/**
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @return {void}
 */
function cwHideBillButtonBeforeLoad(type, form, request)
{
	try
	{
		var stLoggerTitle = 'cwHideBillButtonBeforeLoad'
		nlapiLogExecution('DEBUG', stLoggerTitle, '**** START: Script entry point function.****' + ' | Operation Type: ' + type);

		if (!(type == 'view' || type == 'edit' || type == 'create'))
		{
			nlapiLogExecution('DEBUG', stLoggerTitle, 'Unsupported operation type. | **** END: Script entry point function.****');
			return;
		}

		var stTranStatus = CONTEXT.getSetting('SCRIPT', 'custscript_tran_status');
		nlapiLogExecution('DEBUG', stLoggerTitle, ' stTranStatus  = ' + stTranStatus);

		if (NSUtil.isEmpty(stTranStatus))
		{
			throw nlapiCreateError('9999', 'Missing required parameters.');
		}

		var arrStatus = stTranStatus.split(',');
		var objBtnBill = form.getButton('bill');

		//PO should not be allowed to be billed until item receipt 
		var stStatus = nlapiGetFieldValue('status');
		var stOrderStatus = nlapiGetFieldValue('orderstatus');

		nlapiLogExecution('DEBUG', stLoggerTitle, 'Arr Status: ' + arrStatus + ' | Status: ' + stStatus + ' | Order Status: ' + stOrderStatus);

		if (NSUtil.inArray(stOrderStatus, arrStatus))
		{
			nlapiLogExecution('DEBUG', stLoggerTitle, ' ln61 stOrderStatus  = ' + stOrderStatus);
            if (!(NSUtil.isEmpty(objBtnBill)))
			{
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Set Bill button visible=F');
                objBtnBill.setVisible(false);
			}
		}

		nlapiLogExecution('DEBUG', stLoggerTitle, '**** END: Script entry point function.****');
	}
	catch (error)
	{
		if (error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
			throw error;
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	}
}

//Library//

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
	     * Evaluate if the given string is an element of the array, using reverse looping
	     * @param {String} stValue - String value to find in the array
	     * @param {String[]} arrValue - Array to be check for String value
	     * @returns {Boolean} - true if string is an element of the array, false if not
	     */
	    inArray : function(stValue, arrValue)
	    {
		    var bIsValueFound = false;
            nlapiLogExecution('DEBUG', 'NSUtil.inArray', '1 stValue=' + stValue + ', arrValue=' + arrValue);
		    for (var i = 0; i < arrValue.length; i++)
		    {
			    nlapiLogExecution('DEBUG', 'NSUtil.inArray', '2 stValue=' + stValue + ', arrValue=' + arrValue);
                //if (stValue == arrValue[i]) - original
                if (stValue == 'B') //B=Pending Receipt
			    {
				    nlapiLogExecution('DEBUG', 'NSUtil.inArray', '3 stValue=' + stValue + ', arrValue=' + arrValue);
                    bIsValueFound = true;
				    break;
			    }
		    }
		    return bIsValueFound;
	    }
	};
