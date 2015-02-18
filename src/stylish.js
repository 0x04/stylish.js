/**
 * stylish.js
 * _DESCRIPTION_
 * Created on 2013-11-14 by ok
 * Compatibility
 * - Internet Explorer >= 9
 * - Chrome
 * - Firefox
 *
 *
 * @author     Oliver Kühn
 * @email      ok@0x04.de
 * @website    http://0x04.de
 * @version    0.1.0
 * @license    MIT
 */

(function()
{
  'use strict';


  //------------------------------------------------------------------------------
  //
  // @section Constructor
  //
  //------------------------------------------------------------------------------

  function Stylish()
  {
    this._triggers = [];
    this._handlers = [];
  }


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
  Stylish.ENABLED_ATTRIBUTE = 'stylish';

  /**
   * The expression to match
   * Chrome:
   * `content: "stylish('hello world. sq')";` => "'stylish(\'hello world. sq\')'"
   * `content: 'stylish("hello world. dq")';` => "'stylish("hello world. dq")'"
   * @const
   * @type {RegExp}
   */
  Stylish.REGEXP_EXPRESSION = /^'?stylish\((.*)\)'?$/;

  /**
   * Finds escaped quotes `\'`
   * @const
   * @type {RegExp}
   */
  Stylish.REGEXP_ESCAPED_SINGLE_QUOTE = /\\'/g;

  /**
   * Contains all selector for affected nodes
   * @type {string}
   * @private
   */
  Stylish.QUERY_SELECTOR = ([
    'link[rel="stylesheet"][href][%s]',
    'style[%s]',
    'body *[%s]'
  ])
    .join(',')
    .replace(/%s/g, Stylish.ENABLED_ATTRIBUTE);

  /**
   * Stylish prototype
   * @type {Object}
   */
  Stylish.prototype = {


    /**
     * @type {Array}
     * @private
     */
    _triggers: null,


    //------------------------------------------------------------------------------
    //
    // @section Methods
    //
    //------------------------------------------------------------------------------

    /**
     * Processes a stylesheet
     * @private
     * @param {CSSStyleSheet|CSSStyleRule} styleObject
     */
    _processStyleObject: function(styleObject)
    {
      var rules = styleObject.cssRules;

      if (rules && rules.length > 0)
      {
        for (var i = rules.length - 1; i > -1; i--)
        {
          var rule = rules[i];

          // Check nested rules in media queries etc.
          this._processStyleObject(rule);
          this._processStyleProvider(rule);
        }
      }
    },

    /**
     * Processes a style provider
     * @private
     * @param {CSSStyleRule|HTMLElement} styleProvider
     */
    _processStyleProvider: function(styleProvider)
    {
      var content = styleProvider.style.content;
      var matches, affectedNodes = [];

      // Nothing to do, so exit
      if (content.length == 0 || !Stylish.REGEXP_EXPRESSION.test(content))
      {
        return;
      }

      // Replace single quotes and get matches of expression
      matches = content
        .replace(Stylish.REGEXP_ESCAPED_SINGLE_QUOTE, '"')
        .match(Stylish.REGEXP_EXPRESSION);

      if (matches && matches.length == 2)
      {
        // Get arguments of the `stylish.js` expression
        var args;

        try
        {
          args = JSON.parse(matches[1]);
        }
        catch(e)
        {
          var message = ('[Stylish/_processStyleProvider] '
            + 'Error while parse expression `%s`\n'
            + '\tError Message: %s\n'
            + '\tError Code: %s')
            .replace('%s', styleProvider.selectorText || styleProvider.localName)
            .replace('%s', e.message)
            .replace('%s', e.code);

          //throw new Error(message);
          console.error(message);
        }

        if (styleProvider instanceof CSSStyleRule)
        {
          // Get all affected nodes by the rule selector
          var tmp = document.querySelectorAll(styleProvider.selectorText);

          for (var i = tmp.length - 1; i > -1; i--)
          {
            affectedNodes.unshift(tmp[i]);
          }
        }
        // `stylish.js` is directly applied on a element style
        else affectedNodes.push(styleProvider);

        this._processTrigger(affectedNodes, args, styleProvider);
      }
    },

    /**
     * Processes a expression result
     * @private
     * @param {*} args
     * @param {Array|NodeList} nodes
     * @param {CSSStyleRule|HTMLElement} styleProvider
     * @param {*} [payload]
     * @param {Function} [sender]
     */
    _processTrigger: function(nodes, args, styleProvider, payload, sender)
    {
      for (var triggerIndex = 0, triggerLength = this._triggers.length; triggerIndex < triggerLength; triggerIndex++)
      {
        var trigger = this._triggers[triggerIndex];
        if (trigger === undefined)
          debugger;
        if (typeof sender != 'undefined' && sender === trigger)
        {
          continue;
        }

        try
        {
          trigger.call(this, nodes, args, styleProvider, payload);
        }
        catch (e)
        {
          debugger;
          var message = ('[Stylish/_processTrigger] '
            + 'Error while executing expression `%s`\n'
            + '\tError Message: %s\n'
            + '\tError Code: %s')
            .replace('%s', (styleProvider.selectorText || styleProvider.localName))
            .replace('%s', e.message)
            .replace('%s', e.code);

          //throw new Error(message);
          console.error(message);
        }
      }
    },

    _processHandler: function(nodes, payload, trigger)
    {
      for (var index = 0, length = this._handlers.length; index < length; index++)
      {
        var data = this._handlers[index];

        if (data.trigger === trigger)
        {
          data.fn(nodes, payload);
        }
      }
    },

    /**
     * Starts the processing of `stylish.js`
     * @public
     */
    process: function()
    {
      var nodes = document.querySelectorAll(Stylish.QUERY_SELECTOR);

      for (var i = nodes.length - 1; i > -1; i--)
      {
        var node = nodes[i];

        if (node instanceof HTMLElement)
        {
          switch (node.localName)
          {
            case 'link':
            case 'style':
              this._processStyleObject(node.sheet);
              break;

            default:
              this._processStyleProvider(node);
              break;
          }
        }
      }

      return this;
    },

    /**
     * Adds an expression trigger
     * @public
     * @param {function(Function)} trigger
     */
    addTrigger: function(trigger)
    {
      this._triggers.push(trigger);
      return this;
    },

    /**
     * Removes an expression handler
     * @public
     * @param {function(Function)} handler
     */
    removeTrigger: function(handler)
    {
      var index = this._triggers.indexOf(handler);

      if (index > -1)
      {
        this._triggers.splice(index, 1);
      }

      return this;
    },

    /**
     * Adds a trigger handler
     * @param trigger
     * @param fn
     * @returns {Stylish}
     */
    addHandler: function(trigger, fn)
    {
      this._handlers.push({ trigger: trigger, fn: fn });
      return this;
    },

    /**
     * Removes a trigger handler
     * @param trigger
     * @param fn
     * @returns {Stylish}
     */
    removeHandler: function(trigger, fn)
    {
      for (var index = 0, length = this._handlers.length; index < length; index++)
      {
        var data = this._handlers[index];

        if (data.trigger === trigger && data.fn === fn)
        {
          this._handlers.splice(index--, 1);
        }
      }
      return this;
    }
  };

   /* MutationObserver test /
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
   /**/

  Stylish.triggers = {
    on: (function()
    {
      /**
       * @type {Array}
       * @private
       */
      var _modes = [ 'local', 'global' ];
      /**
       * @type {Function}
       * @private
       */
      var _currHandler;
      /**
       * @type {Function}
       * @private
       */
      var _prevHandler;

      /**
       * @public
       * @memberof Stylish.triggers
       * @param {Array} nodes
       * @param {Object} args
       * @param {CSSStyleRule|HTMLElement} styleProvider
       */
      function triggerOn(nodes, args, styleProvider)
      {
        // Nothing to do!
        if (nodes.length == 0)
        {
          return;
        }

        if (typeof args.on == 'object' && Array.isArray(args.on.events))
        {
          // The mode determines which elements are processed:
          // * local: Only the element that fired the event
          //   is processed
          // * global: All elements that are matches the
          //   expression selector are processed
          var mode = (_modes.indexOf(args.on.mode) > -1)
            ? args.on.mode
            : 'local';

          // Store previous handler for removing
          _prevHandler = _currHandler;

          _currHandler = function(event)
          {
            this._processHandler(
              (mode == 'local') ? [ event.target ] : nodes,
              { event: event },
              triggerOn
            );
          }.bind(this);

          for (var endIndex = args.on.events.length - 1, index = endIndex;
               index > -1;
               index--)
          {
            var event = args.on.events[endIndex - index];

            for (var nodeEndIndex = nodes.length - 1, nodeIndex = nodeEndIndex;
                 nodeIndex > -1;
                 nodeIndex--)
            {
              var node = nodes[nodeEndIndex - nodeIndex];

              // Ensure removement of possible previous handler
              if (typeof _prevHandler == 'function')
              {
                node.removeEventListener(event, _prevHandler);
              }

              node.addEventListener(event, _currHandler);
            }
          }
        }
      }

      return triggerOn;

    })(),

    /**
     * @public
     * @memberof Stylish.triggers
     * @param {Array} nodes
     * @param {Object} args
     * @param {CSSStyleRule|HTMLElement} styleProvider
     */
    data: (function()
    {
      function triggerData(nodes, args, styleProvider)
      {
        if (nodes.length == 0)
        {
          return;
        }

        if (typeof args.data == 'object')
        {
          for (var n in args.data)
          {
            for (var index = 0, length = nodes.length; index < length; index++)
            {
              nodes[index].setAttribute('data-' + n, args.data[n]);
            }

            this._processHandler(nodes, { data: args.data }, triggerData);
          }
        }
      }

      return triggerData;

    })()
  };

  // Set global API
  window.Stylish = Stylish;

})();