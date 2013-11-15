/**
 * stylish.js
 * _DESCRIPTION_
 * Created on 2013-11-14 by ok
 * 
 * @author     Oliver Kühn
 * @email      ok@0x04.de
 * @website    http://0x04.de
 * @version    0.1
 * @license    MIT
 */

(function()
{
	'use strict';
	
	
	//------------------------------------------------------------------------------
	//
	// @section Properties
	//
	//------------------------------------------------------------------------------
	
	/**
	 * Name of the "stylish-enabled" attribute
	 * @const
	 * @type {string}
	 */
	var ENABLED_ATTRIBUTE = 'stylish';
	
	/**
	 * The expression to match
	 * Chrome:
	 * `content: "stylish('hello world. sq')";` => "'stylish(\'hello world. sq\')'"
	 * `content: 'stylish("hello world. dq")';` => "'stylish("hello world. dq")'"
	 * @const
	 * @type {RegExp}
	 */
	var REGEXP_EXPRESSION = /^'?stylish\((.*)\)'?$/;
	
	/**
	 * Finds escaped quotes `\'`
	 * @const
	 * @type {RegExp}
	 */
	var REGEXP_ESCAPED_SINGLE_QUOTE = /\\'/g;
	
	/**
	 * Contains all selector for affected nodes
	 * @type {string}
	 * @private
	 */
	var _selectors = ([
			'link[rel="stylesheet"][href][%s]',
			'style[%s]',
			'body *[%s]'
		])
		.join(',')
		.replace(/%s/g, ENABLED_ATTRIBUTE);
	
	/**
	 * @type {Array}
	 * @private
	 */
	var _expressionHandler = [];
	
	
	//------------------------------------------------------------------------------
	//
	// @section Methods
	//
	//------------------------------------------------------------------------------
	
	/**
	 * Compatibility function:
	 * Gets the associated link/style node from styleSheet.
	 * W3C: `styleSheet.ownerNode`, MS: `styleSheet.owningElement`
	 * @param {CSSStyleSheet} styleSheet
	 * @return {Node}
	 */
 	function __ownerNode(styleSheet)
	{
		return (styleSheet.ownerNode || styleSheet.owningElement);
	}
	
	/**
	 * Compatibility function:
	 * Gets the rule list from styleObject
	 * W3C: `styleObject.cssRules`, MS: `styleObject.rules`
	 * @param {CSSStyleSheet|CSSStyleRule} styleObject
	 * @returns {Array}
	 */
	function __cssRules(styleObject)
	{
		return (styleObject.cssRules || styleObject.rules || []);
	}
	
	/**
	 * Processes a stylesheet 
	 * @param {CSSStyleSheet|CSSStyleRule} styleObject
	 */
	function processStyleObject(styleObject)
	{
		var rules = __cssRules(styleObject);
		
		if (rules.length > 0)
		{
			for (var i = rules.length - 1; i > -1; i--)
			{
				var rule = rules[i];
				
				// Check nestes rules in media queries etc.
				processStyleObject(rule);
				processStyleProvider(rule);
			}
		}
	}
	
	/**
	 * Processes a style provider
	 * @param {CSSStyleRule|HTMLElement} styleProvider
	 */
	function processStyleProvider(styleProvider)
	{
		var content = styleProvider.style.content;
		var matches, affectedNodes = [];
		
		// Nothing to do, so exit
		if (content.length == 0 || !REGEXP_EXPRESSION.test(content))
		{
			return;
		}
		
		// Replace single quotes and get matches of expression
		matches = content
			.replace(REGEXP_ESCAPED_SINGLE_QUOTE, '"')
			.match(REGEXP_EXPRESSION);
		
		if (matches && matches.length == 2)
		{
			// Get arguments of the stylish expression
			var args = JSON.parse(matches[1]);
			
			if (styleProvider instanceof CSSStyleRule)
			{
				// Get all affected nodes the rule selector
				var tmp = document.querySelectorAll(styleProvider.selectorText);
				
				for (var i = tmp.length - 1; i > -1; i--)
				{
					affectedNodes.unshift(tmp[i]);
				}
			}
			// stylish is directly applied on a element style
			else affectedNodes.push(styleProvider);
			
			processExpression(args, affectedNodes, styleProvider);
		}
	}
	
	/**
	 * Processes a expression result
	 * @param {*} args
	 * @param {Array} nodes
	 * @param {CSSStyleRule|HTMLElement} styleProvider
	 */
	function processExpression(args, nodes, styleProvider)
	{
		//console.info('[stylish/processExpression]', args, nodes, styleProvider);
		
		for (var expressionIndex = 0, expressionLength = _expressionHandler.length; expressionIndex < expressionLength; expressionIndex++)
		{
			for (var nodeIndex = nodes.length - 1; nodeIndex > -1; nodeIndex--)
			{
				var node = nodes[nodeIndex];
				// data-stylish-arguments, data-stylish-provider
				//node.dataset.stylishArguments = args;
				//node.dataset.stylishProvider = styleProvider;
				_expressionHandler[expressionIndex]
					.call(node, args, styleProvider);
			}
		}
	}
	
	/**
	 * Adds an expression handler
	 * @param {Function} handler
	 */
	function addExpressionHandler(handler)
	{
		_expressionHandler.push(handler);
	}
	
	/**
	 * Removes an expression handler
	 * @param {Function} handler
	 */
	function removeExpressionHandler(handler)
	{
		var index = _expressionHandler.indexOf(handler);
		
		if (index > -1)
		{
			_expressionHandler.splice(index, 1);
		}
	}
	
	/**
	 * Initialisation
	 */
	function init()
	{
		var nodes = document.querySelectorAll(_selectors);
		
		for (var i = nodes.length - 1; i > -1; i--)
		{
			var node = nodes[i];
			
			if (node instanceof HTMLElement)
			{
				switch (node.localName)
				{
					case 'link':
					case 'style':
						// @TODO: `node.sheet` IE? General compatibility?
						processStyleObject(node.sheet);
						processStyleProvider(node);
						break;
					
					default:
						processStyleProvider(node);
						break;
				}
			}
		}
	}
	
	/*/ MutationObserver test
	document.addEventListener('DOMContentLoaded', function(event)
	{
		var target = document.body;
		
		var observer = new MutationObserver(function(mutations)
		{
			mutations.forEach(function(mutation)
			{
				console.log('[mutation]', mutation.type);
			});
		});
		
		var config = { attributes: true, childList: true, characterData: true };
		
		observer.observe(target, config);
	});
	/*/
	
	// Set global api
	window.stylish = {
		init: init,
		addExpressionHandler: addExpressionHandler,
		removeExpressionHandler: removeExpressionHandler
	};
	
})();