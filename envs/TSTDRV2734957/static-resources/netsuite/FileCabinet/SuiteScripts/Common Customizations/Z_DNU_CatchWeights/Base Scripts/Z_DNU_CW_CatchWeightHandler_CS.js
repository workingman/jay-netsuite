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

//-- Import cw_util.js
var F_CATCH_WEIGHT = 0; //used global variable for parent-child window variable accessibility
var N_LINE_NUM = 1;

/**
 * Page init function
 * @param {String} type
 */
function cwDetailPageInit(type) {

	var stItemLines = nlapiGetLineItemCount('item');
	console.log('stItemLines', stItemLines);
	console.log('type', type);
	for (var intCtr = 1; intCtr <= stItemLines; intCtr++) {

		var stIsCWitem = nlapiGetLineItemValue('item', 'custcol_cw_item_ckbx', intCtr);
		var	stCWRecID = nlapiGetLineItemValue('item', 'custcol_cw_record_id', intCtr);
		if ((stIsCWitem != 'T') || (stCWRecID != '')) {
			//alert('CW Handler line 38, stIsCWitem=' + stIsCWitem + ', stCWRecID=' + stCWRecID + ', intCtr=' + intCtr);
			nlapiSetLineItemDisabled('item', COL_CATCH_WEIGHT, true, intCtr);
		}
	}

}

/**
 * Execute this when submit button is clicked on the Catch Weight Details subrecord/popup
 */
function cwDetailsSaveRecord(stIdCWD) {
	try {
//nlapiLogExecution('DEBUG', 'SaveRecord', 'Start save record');
	    var stItemLines = nlapiGetLineItemCount('item');
//nlapiLogExecution('DEBUG', 'SaveRecord', 'stItemLines = ' + stItemLines);
    	for (var intCtr = 1; intCtr <= stItemLines; intCtr++) {

		  var stIsCWitem = nlapiGetLineItemValue('item', 'custcol_cw_item_ckbx', intCtr);
		  var stIsFulfill = nlapiGetLineItemValue('item', 'itemreceive', intCtr);
		  var stCatchWeight = nlapiGetLineItemValue('item', 'custcol_cw_catch_weight', intCtr);
//nlapiLogExecution('DEBUG', 'SaveRecord', 'stIsCWitem =' + stIsCWitem + ', stCatchWeight =' + stCatchWeight);
		  
		  if (stIsCWitem == 'T' && stIsFulfill =='T' && stCatchWeight == '') {
              alert('You cannot have a blank Catch Weight Value.');
              return false;
		  }

	    }
//nlapiLogExecution('DEBUG', 'SaveRecord', 'END save record loop');
        /* nlapiSelectLineItem('item', N_LINE_NUM);
		var intNLineIndex = nlapiGetCurrentLineItemIndex('item');

		nlapiSetCurrentLineItemValue('item', COL_CATCH_WEIGHT, F_CATCH_WEIGHT, false, true);

		if (!NSUtil.isEmpty(stIdCWD)) {
			nlapiSetCurrentLineItemValue('item', 'custcol_cw_record_id', stIdCWD, false, true);

		}
		var aux = nlapiGetCurrentLineItemValue('item', COL_CATCH_WEIGHT);

		var fWeight = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', COL_CATCH_WEIGHT));


		if (!NSUtil.isEmpty(fWeight) && fWeight > 0) {
			nlapiSetLineItemDisabled('item', COL_CATCH_WEIGHT, true, intNLineIndex);

		} else {
			nlapiSetLineItemDisabled('item', COL_CATCH_WEIGHT, false, intNLineIndex);

		}
		if (NSUtil.isEmpty(stIdCWD)) {
			return true;
		} */

	} catch (error) {
		if (error.getDetails != undefined) {
			nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
			alert(error);
		} else {
			nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
			alert(nlapiCreateError('99999', error.toString()));
		}
	}
	return true;
//nlapiLogExecution('DEBUG', 'SaveRecord', '** END save record Function **');
	//The succeeding codes are implemented to close the popup that was called via nlExtOpenWindow
	//This implementation was kept to retain the intended output and it would be safe since the form is not native but a suitelet

	//Check if NS supports jQuery else use DOM manipulation
/*	if (typeof jQuery !== 'undefined') {
		var arrElements = jQuery(':contains(' + HC_POPUP_WINDOW_TITLE + ')').find('[class*="close"]')
		if (!NSUtil.isEmpty(arrElements)) {
			arrElements.click();
		}
	} else {
		document.getElementsByClassName('x-tool x-tool-close')[0].click();
	}

	if (window.opener) {
		window.ischanged = false;
		window.close();
	} */
}

//called from Suitelet, line 343
function cwDetailsSaveRecord2(stIdCWD, totalcatchweight, linenumber) {
	
	try {
		//The succeeding codes are implemented to close the popup that was called via nlExtOpenWindow
		//This implementation was kept to retain the intended output and it would be safe since the form is not native but a suitelet

		//Check if NS supports jQuery else use DOM manipulation
		if (typeof jQuery !== 'undefined') {
			var arrElements = jQuery(':contains(' + HC_POPUP_WINDOW_TITLE + ')').find('[class*="close"]')
			if (!NSUtil.isEmpty(arrElements)) {
				arrElements.click();
			}
		} else {
			document.getElementsByClassName('x-tool x-tool-close')[0].click();
		}

		if (window.opener) {
			window.ischanged = false;
			window.close();
		}

		console.log(JSON.stringify({
			stIdCWD: stIdCWD,
			linenumber: linenumber,
			totalcatchweight: totalcatchweight
		}));

		nlapiSelectLineItem('item', linenumber);
		nlapiSetCurrentLineItemValue('item', COL_CATCH_WEIGHT, totalcatchweight, true, true);

		if (!NSUtil.isEmpty(stIdCWD)) {
			console.log('about to set record id');
			nlapiSetCurrentLineItemValue('item', 'custcol_cw_record_id', stIdCWD, false, true);
		}

		var hasRateField = nlapiGetLineItemField('item', 'rate', linenumber);
		if (hasRateField) {
			console.log(nlapiGetCurrentLineItemValue('item', 'rate'));
		}

		if (totalcatchweight > 0) {
			nlapiSetLineItemDisabled('item', COL_CATCH_WEIGHT, true, linenumber);
		}
		
		if (NSUtil.isEmpty(stIdCWD)) {
			return true;
		}

	} catch (error) {
		alert('An error happened: ' + JSON.stringify(error));
		if (error.getDetails != undefined) {
			nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
			alert(error);
		} else {
			nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
			alert(JSON.stringify(error));
			alert(nlapiCreateError('99999', error.toString()));
		}
	}
}

/**
 * Field changed function
 * @param {String} type
 * @param {String} name
 * @param {String} linenum
 */
function cwUpdateRateFieldChanged(type, name, linenum) {
	// Don't run any of this code for now
	return;

	try {
		console.log('cwUpdateRateFieldChanged: ' + JSON.stringify({type: type, name: name, linenum: linenum}));
		var stLogTitle = 'cwUpdateRateFieldChanged';
		var flCatchWeight = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', COL_CATCH_WEIGHT));
		if (type == 'item' && name == COL_CATCH_WEIGHT) {
			var stRecType = nlapiGetRecordType();
//alert('Warning: stRecType= ' + stRecType + ' -- end');
			//Update rate
			if (stRecType == 'itemreceipt') {
				nlapiSelectLineItem('item', linenum);

				//var flPriceUM = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', COL_PRICE_UM)) || NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'rate'));
				//var flQty = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantity'));
				//var flRate = (flPriceUM * flCatchWeight) / flQty;

				if (flCatchWeight < 0) {
					alert('You cannot enter a negative Catch Weight Value.');
					nlapiSetCurrentLineItemValue('item', COL_CATCH_WEIGHT, 1, true, true);
				}

				if (flCatchWeight > 0) {
				    var flPriceUM = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', COL_PRICE_UM)) || NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'rate'));
    				var flQty = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', 'quantity'));
    				var flRate = (flPriceUM * flCatchWeight) / flQty;
				    nlapiSetCurrentLineItemValue('item', 'rate', roundOffValue(flRate, 2), true, true);
//alert('Setting new rate on fld change = ' + flRate);
                }
			}

			// Determine if more than threshold (both IR/IF)
			nlapiLogExecution('DEBUG', stLogTitle, 'threshold check');

			var stItemId = nlapiGetLineItemValue('item', 'item', linenum);

			var objCWItemDetails = nlapiLookupField('item', stItemId, [FLD_CW_WEIGHT_TOLERANCE, 'weight', 'unitstype', 'custitem_cw_pricing_units_type']);
			var objCWItemFldTxtValue = nlapiLookupField('item', stItemId, ['custitem_cw_purchase_pricing_unit', 'custitem_cw_sales_pricing_unit', 'purchaseunit', 'saleunit'], true); //for multiple UoM

            var stIdPhysicalUnitsType = objCWItemDetails['custitem_cw_pricing_units_type'];  //unitstype
			var stPOUnitName = objCWItemFldTxtValue['custitem_cw_purchase_pricing_unit'];
			var stSOUnitName = objCWItemFldTxtValue['custitem_cw_sales_pricing_unit'];
//alert('Warning: stRecType= ' + stRecType + ', stPOUnitName= ' + stPOUnitName + ', stIdPhysicalUnitsType= ' + stIdPhysicalUnitsType + '-- end');  //type=create
			var flWeightTolerance = NSUtil.forceFloat(objCWItemDetails.custitem_cw_weight_tolerance);
			flWeightTolerance /= 100;
			var flItemWeight = NSUtil.forceFloat(objCWItemDetails.weight);

            //To account for multiple UoM
/*            if (stRecType == 'itemreceipt') {
                var flConversionRate = NSUtil.forceFloat(getUOMConversionRate(stPOUnitName, stIdPhysicalUnitsType));
                var flWeightConv = NSUtil.forceFloat(flItemWeight * flConversionRate);
            } else if (stRecType == 'itemfulfillment') {
                var flConversionRate = NSUtil.forceFloat(getUOMConversionRate(stSOUnitName, stIdPhysicalUnitsType));
                var flWeightConv = NSUtil.forceFloat(flItemWeight * flConversionRate);
                //nlapiSetCurrentLineItemValue('item', 'custcol_cw_num_catch_wght', flCatchWeight, true, true); //Souto field ONLY!!
            } */
    		if (stRecType == 'itemreceipt') {
    			  var flConversionRate = NSUtil.forceFloat(getUOMConversionRate(stPOUnitName, stIdPhysicalUnitsType));
    	//alert('IR- 1st conv rate end; stRecType=' + stRecType + ', flConversionRate=' + flConversionRate);
    	          if (flConversionRate == 0) {
    	              //re-do with native Physical Units Type
    	          	var stIdPhysicalUnitsType = objCWItemDetails['unitstype']; //native Item header fields
					var stPOUnitName = objCWItemFldTxtValue['purchaseunit'];
    	//alert('IR- 2nd conv rate start; stRecordType=' + stRecordType + ', stIdPhysicalUnitsType=' + stIdPhysicalUnitsType);
    	          	var flConversionRate = NSUtil.forceFloat(getUOMConversionRate(stPOUnitName, stIdPhysicalUnitsType));
    	          }
    	          var flWeightConv = NSUtil.forceFloat(flItemWeight * flConversionRate);
    	    } else if (stRecType == 'itemfulfillment') {
    			  var flConversionRate = NSUtil.forceFloat(getUOMConversionRate(stSOUnitName, stIdPhysicalUnitsType));
    	          if (flConversionRate == 0) {
    	              //re-do with native Physical Units Type
    	          	var stIdPhysicalUnitsType = objCWItemDetails['unitstype']; //native Item header fields
					var stSOUnitName = objCWItemFldTxtValue['saleunit'];
    	//alert('IF- 2nd conv rate start; stRecType=' + stRecType + ', stIdPhysicalUnitsType=' + stIdPhysicalUnitsType);
    	          	var flConversionRate = NSUtil.forceFloat(getUOMConversionRate(stSOUnitName, stIdPhysicalUnitsType));
    	          }
    	//alert('IF- wgt calc; flConversionRate=' + flConversionRate + ', flItemWeight=' + flItemWeight);
    	          if ((flConversionRate == 2.2) || (flConversionRate == .4536)) { //need to * by quantity, oddball for kilos
    	        	  var flWeightConv = flItemWeight;
    	          } else {  //else if ((flConversionRate > 1) && (F_AVE_WEIGHT == 1))
    	        	  var flWeightConv = NSUtil.forceFloat(flItemWeight * flConversionRate);
    	          }
    	          //var flWeightConv = NSUtil.forceFloat(flItemWeight * flConversionRate);
    	    }
    		
			var flQty = NSUtil.forceFloat(nlapiGetLineItemValue('item', 'quantity', linenum));
			var flVariance = flQty * flWeightConv;
			var flThreshold = flVariance * flWeightTolerance;
			var flPosVariance = flVariance + flThreshold;
			var flNegVariance = flVariance - flThreshold;

            if (flCatchWeight > flPosVariance) {
				alert('Catch Weight exceeds the threshold of ' + flPosVariance);
				return false;
			} else if (flCatchWeight < flNegVariance) {
				alert('Catch Weight does not meet the threshold of ' + flNegVariance);
				return false;
			}

		}

		//Reset Catch Weight Col so user can enter new weight
		if (type == 'item' && name == 'quantity') {
			//var stItemId = nlapiGetLineItemValue('item', 'item', linenum);
			//var stIsCatchWeightItem = nlapiLookupField('item', stItemId, FLD_CATCH_WEIGHT_ITEM);
            var stIsCWitem = nlapiGetLineItemValue('item', 'custcol_cw_item_ckbx', linenum);
			if (stIsCWitem == 'T') {
				//nlapiSetLineItemValue('item', COL_CATCH_WEIGHT, linenum, '');
				nlapiSetLineItemDisabled('item', COL_CATCH_WEIGHT, false, linenum);
			}
		}

		if (stRecType == 'itemfulfillment') {
			var flCatchWeight = NSUtil.forceFloat(nlapiGetCurrentLineItemValue('item', COL_CATCH_WEIGHT));
			if (flCatchWeight < 0) {
				alert('You cannot enter a negative Catch Weight Value.');
				nlapiSetCurrentLineItemValue('item', COL_CATCH_WEIGHT, 1, true, true);
			}
		}

	} catch (err) {
		nlapiLogExecution('ERROR', 'cwUpdateRateFieldChanged', err.toString());
	}

}

function openCWDetail(stUrl, stitle, intWidth, intHeight) {
	var leftPosition = (window.screen.width / 2) - ((intWidth / 2) + 10);
	var topPosition = (window.screen.height / 2) - ((intHeight / 2) + 50);

	//window.open(stUrl, stitle, 'status=no,height=' + intHeight + ',width=' + intWidth + ',resizable=yes,left=' + leftPosition + ',top='
	//  		        + topPosition + ',screenX=' + leftPosition + ',screenY=' + topPosition + ',toolbar=no,menubar=no,scrollbars=yes,location=no,directories=no');
	nlExtOpenWindow(stUrl, stitle, intWidth, intHeight, this, true, null);
}

var NSUtil = (typeof NSUtil === 'undefined') ? {} : NSUtil;
/**
 * Evaluate if the given string or object value is empty, null or undefined.
 * @param {String} stValue - string or object to evaluate
 * @returns {Boolean} - true if empty/null/undefined, false if not
 * @author mmeremilla
 */
NSUtil.isEmpty = function(stValue) {
	if ((stValue === '') //Strict checking for this part to properly evaluate integer value.
		||
		(stValue == null) || (stValue == undefined)) {
		return true;
	} else {
		if (stValue.constructor === Array) //Strict checking for this part to properly evaluate constructor type.
		{
			if (stValue.length == 0) {
				return true;
			}
		} else if (stValue.constructor === Object) //Strict checking for this part to properly evaluate constructor type.
		{
			for (var stKey in stValue) {
				return false;
			}
			return true;
		}

		return false;
	}
};

/**
 * Evaluate if the given string is an element of the array, using reverse looping
 * @param {String} stValue - String value to find in the array
 * @param {String[]} arrValue - Array to be check for String value
 * @returns {Boolean} - true if string is an element of the array, false if not
 */
NSUtil.inArray = function(stValue, arrValue) {
	var bIsValueFound = false;

	for (var i = 0; i < arrValue.length; i++) {
		if (stValue == arrValue[i]) {
			bIsValueFound = true;
			break;
		}
	}
	return bIsValueFound;
};
/**
 * Converts string to float. If value is infinity or can't be converted to a number, 0.00 will be returned.
 * @param {String} stValue - any string
 * @returns {Number} - a floating point number
 * @author jsalcedo
 */
NSUtil.forceFloat = function(stValue) {
	var flValue = parseFloat(stValue);

	if (isNaN(flValue) || (stValue == Infinity)) {
		return 0.00;
	}

	return flValue;
};

/**
 * Round decimal number
 * @param {Number} flDecimalNumber - decimal number value
 * @param {Number} intDecimalPlace - decimal places
 *
 * @returns {Number} - a floating point number value
 * @author memeremilla and lochengco
 */
NSUtil.roundDecimalAmount = function(flDecimalNumber, intDecimalPlace) {
	//this is to make sure the rounding off is correct even if the decimal is equal to -0.995
	var bNegate = false;
	if (flDecimalNumber < 0) {
		flDecimalNumber = Math.abs(flDecimalNumber);
		bNegate = true;
	}

	var flReturn = 0.00;
	intDecimalPlace = (intDecimalPlace == null || intDecimalPlace == '') ? 0 : intDecimalPlace

	var intMultiplierDivisor = Math.pow(10, intDecimalPlace);
	flReturn = Math.round((parseFloat(flDecimalNumber) * intMultiplierDivisor).toFixed(intDecimalPlace)) / intMultiplierDivisor;
	flReturn = (bNegate) ? (flReturn * -1).toFixed(intDecimalPlace) : flReturn.toFixed(intDecimalPlace);

	return flReturn;
};
