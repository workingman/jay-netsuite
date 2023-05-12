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
 * Version    Date				Author				Remarks
 * 1.00       08 Jun 2016     memeremilla			Initial version
 *
 */

//--import cw_util.js
//'use strict';
var F_MARGIN, F_AVE_WEIGHT, F_ITEM_WEIGHT;

/**
 * Pageinit function
 * @param {String} type
 */
function catchWeightDetailsPageInit(type)
{
	
	try{
		var stLogTitle = 'catchWeightDetailsPageInit';
		var stIdItem = nlapiGetFieldValue(FLD_SL_IR_ITEM);

		if(NSUtil.isEmpty(stIdItem))
		{
			console.log('line 34', 'stIdItem is empty');
			return;
		}
		
		var stNCurrentLineIndex = nlapiGetCurrentLineItemIndex(SBL_CW_DETAILS);
		var stCaseName = nlapiGetCurrentLineItemValue(SBL_CW_DETAILS, COL_SL_CASE);

		//Ricardo Sellanes: changed from "stNCurrentLineIndex == 0" to "stNCurrentLineIndex == 1" so Suitelet shows "Case 1" by default
		if (stNCurrentLineIndex == 1 && stCaseName == '')
		{
			nlapiSetCurrentLineItemValue(SBL_CW_DETAILS, COL_SL_CASE, 'Case ' + stNCurrentLineIndex, true, true);
			nlapiSetCurrentLineItemValue(SBL_CW_DETAILS, COL_SL_WEIGHT, 0, true, true);
		}
		
		var fTotalCWDWeight = nlapiGetFieldValue(FLD_SL_TOTAL_WEIGHT);
		window.parent.F_CATCH_WEIGHT = fTotalCWDWeight;
		
		var stLineNum = nlapiGetFieldValue(FLD_SL_IR_LINE);
		window.parent.N_LINE_NUM = stLineNum;
		console.log('custpage_ifqty: '+window.parent.nlapiGetLineItemValue('item', 'quantity', stLineNum));
		console.log('custpage_cwdetailid: '+window.parent.nlapiGetLineItemValue('item', 'quantity', stLineNum));
		nlapiSetFieldValue('custpage_ifqty', window.parent.nlapiGetLineItemValue('item', 'quantity', stLineNum));
		nlapiSetFieldValue('custpage_cwdetailid', window.parent.nlapiGetLineItemValue('item', 'custcol_cw_record_id', stLineNum));
	}
	catch(e){
		console.log(stLogTitle, e.message);
		//log.error(stLogTitle, e.message);
	}
}

/**
 * Line Init function
 * @param {String} type
 */
function catchWeightDetailsLineInit(type)
{
	
	try{
		var stLogTitle = 'catchWeightDetailsLineInit';
		var stNCurrentLineIndex = nlapiGetCurrentLineItemIndex(SBL_CW_DETAILS);
		console.log('stNCurrentLineIndex: '+stNCurrentLineIndex);
		var stCaseName = nlapiGetCurrentLineItemValue(SBL_CW_DETAILS, COL_SL_CASE);
		console.log('stCaseName: '+stCaseName);
		if (stCaseName == '')
		{
			nlapiSetCurrentLineItemValue(SBL_CW_DETAILS, COL_SL_CASE, 'Case ' + stNCurrentLineIndex, true, true);
		}
	}
	catch(e){
		console.log(stLogTitle, e.message);
		//log.error(stLogTitle, e.message);
	}
	
}

/**
 * Validate line function
 * @param {String} type
 */
function catchWeightDetailsValidateLine(type)
{
	try{
		var stLogTitle = 'catchWeightDetailsValidateLine';
		nlapiLogExecution('debug', 'aaa', 'aaa')
		//Check if inputs are valid
		var flTotalWeight = NSUtil.forceFloat(nlapiGetFieldValue(FLD_SL_TOTAL_WEIGHT));
		var flWeight = NSUtil.forceFloat(nlapiGetCurrentLineItemValue(SBL_CW_DETAILS, COL_SL_WEIGHT));
		var flQty = NSUtil.forceFloat(nlapiGetFieldValue('custpage_ifqty'));
		var stCurrIndex = nlapiGetCurrentLineItemIndex(SBL_CW_DETAILS);
		
		var stIdItem = nlapiGetFieldValue(FLD_SL_IR_ITEM); //moved 6-17-19, down to line 155
		var stRecType = nlapiGetFieldValue('custpage_type');
		
		/*var objItemFldVal = nlapiLookupField('item', stIdItem, [FLD_CW_WEIGHT_TOLERANCE, 'weight', 'unitstype', 'custitem_cw_pricing_units_type'], false)
		var objItemFldTxtVal = nlapiLookupField('item', stIdItem, ['custitem_cw_purchase_pricing_unit', 'custitem_cw_sales_pricing_unit', 'purchaseunit', 'saleunit'], true)

		F_MARGIN = NSUtil.forceFloat(objItemFldVal[FLD_CW_WEIGHT_TOLERANCE]);
		F_AVE_WEIGHT = NSUtil.forceFloat(objItemFldVal['weight']);

		var stPOUnitName = objItemFldTxtVal['custitem_cw_purchase_pricing_unit'];
        var stSOUnitName = objItemFldTxtVal['custitem_cw_sales_pricing_unit'];
		var stIdPhysicalUnitsType = objItemFldVal['custitem_cw_pricing_units_type']; //unitstype

		if (stRecType == 'Purchase Order') {
		  var flConversionRate = NSUtil.forceFloat(getUOMConversionRate(stPOUnitName, stIdPhysicalUnitsType)); //custom unit type fields
          if (flConversionRate == 0) {
              //re-do with native Physical Units Type
          	var stIdPhysicalUnitsType = objItemFldVal['unitstype']; //native Item header fields
			var stPOUnitName = objItemFldTxtVal['purchaseunit'];
          	var flConversionRate = NSUtil.forceFloat(getUOMConversionRate(stPOUnitName, stIdPhysicalUnitsType));
          }
          if ((flConversionRate == 1) && (F_AVE_WEIGHT == 1)) { //need to * by quantity
        	  F_AVE_WEIGHT = F_AVE_WEIGHT * flConversionRate * flQty;
          } else {
        	  F_AVE_WEIGHT = F_AVE_WEIGHT * flConversionRate * flQty;
		  }
        } else {
		  var flConversionRate = NSUtil.forceFloat(getUOMConversionRate(stSOUnitName, stIdPhysicalUnitsType)); //custom unit type fields
          if (flConversionRate == 0) {
              //re-do with native Physical Units Type
          	var stIdPhysicalUnitsType = objItemFldVal['unitstype']; //native Item header fields
			var stSOUnitName = objItemFldTxtVal['saleunit'];
          	var flConversionRate = NSUtil.forceFloat(getUOMConversionRate(stSOUnitName, stIdPhysicalUnitsType));
          }
          if ((flConversionRate == 2.2) || (flConversionRate == .4536)) { //need to * by quantity, oddball for kilos
        	  F_AVE_WEIGHT = F_AVE_WEIGHT * flQty;
		  } else if ((flConversionRate == 1) && (F_AVE_WEIGHT == 1)) {
			  F_AVE_WEIGHT = F_AVE_WEIGHT * flConversionRate * flQty;
          } else {
        	  F_AVE_WEIGHT = F_AVE_WEIGHT * flConversionRate;
          }
        }
		*/
		if(stCurrIndex > flQty)
		{
			alert('Case numbers exceeded Quantity.');
			return false;
		}
		
		//Added alert message when negative value is entered
		if (flWeight < 0)
		{
			alert('You cannot enter a negative weight value.');
			return false;
		}
		//--End of negative value check

		if (NSUtil.isEmpty(flWeight))
		{
			alert('Please enter a weight value.');
			return false;
		}
        
		//Check Catch Weight margin
		/*var flMarginCheck = NSUtil.forceFloat(getVariance(F_AVE_WEIGHT, flWeight));
		if (flMarginCheck > F_MARGIN) //  > 10%
		{
			alert('Warning: Weight entered is beyond threshold. Catch Weight Tolerance: ' + F_MARGIN +  '%');
		}
		*/
		var stCase = nlapiGetCurrentLineItemValue(SBL_CW_DETAILS, COL_SL_CASE);
		if (NSUtil.isEmpty(stCase))
		{
			var stNCurrentLineIndex = nlapiGetCurrentLineItemIndex(SBL_CW_DETAILS);
			nlapiSetCurrentLineItemValue(SBL_CW_DETAILS, COL_SL_CASE, 'Case ' + stNCurrentLineIndex, true, true);
		}
		return true;
	}
	catch(e){
		console.log(stLogTitle, e.message);
		//log.error(stLogTitle, e.message);
	}
}

/**
 * Recalc function
 * @param {String} type
 */
function catchWeightDetailsRecalc(type)
{
	try{
		var stLogTitle = 'catchWeightDetailsValidateLine';
		var flTotalCWDWeight = getTotalCWDWeight();
		nlapiSetFieldValue(FLD_SL_TOTAL_WEIGHT, NSUtil.roundDecimalAmount(flTotalCWDWeight, 2), true, true);
		window.parent.F_CATCH_WEIGHT = flTotalCWDWeight;
	}
	catch(e){
		console.log(stLogTitle, e.message);
		//log.error(stLogTitle, e.message);
	}
}


var NSUtil = (typeof NSUtil === 'undefined') ? {} : NSUtil;
/**
 * Evaluate if the given string or object value is empty, null or undefined.
 * @param {String} stValue - string or object to evaluate
 * @returns {Boolean} - true if empty/null/undefined, false if not
 * @author mmeremilla
 */
NSUtil.isEmpty = function(stValue)
{
	try{
		var stLogTitle = 'isEmpty';
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
	}
	catch(e){
		console.log(stLogTitle, e.message);
		//log.error(stLogTitle, e.message);
	}
};

/**
 * Evaluate if the given string is an element of the array, using reverse looping
 * @param {String} stValue - String value to find in the array
 * @param {String[]} arrValue - Array to be check for String value
 * @returns {Boolean} - true if string is an element of the array, false if not
 */
NSUtil.inArray = function(stValue, arrValue)
{
	try{
		var stLogTitle = 'inArray';
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
	}
	catch(e){
		console.log(stLogTitle, e.message);
		//log.error(stLogTitle, e.message);
	}
};
/**
 * Converts string to float. If value is infinity or can't be converted to a number, 0.00 will be returned.
 * @param {String} stValue - any string
 * @returns {Number} - a floating point number
 * @author jsalcedo
 */
NSUtil.forceFloat = function(stValue)
{
	try{
		var stLogTitle = 'forceFloat';
		var flValue = parseFloat(stValue);

		if (isNaN(flValue) || (stValue == Infinity))
		{
			return 0.00;
		}

		return flValue;
	}
	catch(e){
		console.log(stLogTitle, e.message);
		//log.error(stLogTitle, e.message);
	}
};

/**
 * Round decimal number
 * @param {Number} flDecimalNumber - decimal number value
 * @param {Number} intDecimalPlace - decimal places
 *
 * @returns {Number} - a floating point number value
 * @author memeremilla and lochengco
 */
NSUtil.roundDecimalAmount = function(flDecimalNumber, intDecimalPlace)
{
	try{
		var stLogTitle = 'roundDecimalAmount';
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
	}
	catch(e){
		console.log(stLogTitle, e.message);
		//log.error(stLogTitle, e.message);
	}
};
