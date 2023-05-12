/**
 * Copyright NetSuite, Inc. 2020 All rights reserved. 
 * The following code is a demo prototype. Due to time constraints of a demo,
 * the code may contain bugs, may not accurately reflect user requirements 
 * and may not be the best approach. Actual implementation should not reuse 
 * this code without due verification.
 * 
 * embed google map in custom portlet
 * 
 * Version    Date            Author           Remarks
 * 1.00       20 Apr 2020     jdelossantos
 * 
 */

{
    var SPARAM_EMBEDURL = 'custscript_jd_customportletmapurl';
}

/**
 * @param {nlobjPortlet} portlet Current portlet object
 * @param {Number} column Column position index: 1 = left, 2 = middle, 3 = right
 * @return {void}
 */
function embedGoogleMap(portlet, column) {
    portlet.setTitle('URL');
    
    var sEmbddedURL = nlapiGetContext().getSetting('SCRIPT', SPARAM_EMBEDURL);//'<iframe src="https://player.vimeo.com/video/388142852" width="640" height="400" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>';

    var html = [
        '<html>', 
        '<head></head>', 
        '<body>',
        '<iframe src="' + sEmbddedURL + '" width="640" height="400" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>',
        '</body>', 
        '</html>'
    ];
    nlapiLogExecution('DEBUG', 'inline html', html.join(''));
    portlet.setHtml(html.join(''));
}