/**
 * stylish.js
 * _DESCRIPTION_
 *
 * @author  Oliver Kühn
 * @email   ok@0x04.de
 * @website http://0x04.de
 * @version 0.1.1
 * @license MIT
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
  Stylish.ATTRIBUTE_NAME = 'stylish';

  /**
   * The expression to match
   * Chrome:
   * `content: "stylish('hello world. sq')";` => "'stylish(\'hello world. sq\')'"
   * `content: 'stylish("hello world. dq")';` => "'stylish("hello world. dq")'"
   * @const
   * @type {RegExp}
   */
  Stylish.REGEXP_EXPRESSION = new RegExp(`^['"]?${Stylish.ATTRIBUTE_NAME}\\((.*)\\)['"]?$`);

  /**
   * Find escaped quotes
   * @const
   * @type {RegExp}
   */
  Stylish.REGEXP_ESCAPED_QUOTES = /\\['"]/g;

  /**
   * Selector for affected nodes
   * @type {string}
   * @private
   */
  Stylish.QUERY_SELECTOR = `*[${Stylish.ATTRIBUTE_NAME}]`;

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
     * Extracts the argument part from a stylish content expression
     * @private
     * @param {String} content
     * @returns {string}
     */
    _extractArgument: function (content) {
      let result = '';

      if (content.length > 0 && Stylish.REGEXP_EXPRESSION.test(content))
      {
        result = content
          .replace(Stylish.REGEXP_EXPRESSION, '$1')
          .replace(Stylish.REGEXP_ESCAPED_QUOTES, '"')
          .trim();
      }

      return result;
    },

    /**
     * Processes a stylesheet
     * @private
     * @param {CSSStyleSheet|CSSStyleRule} styleObject
     */
    _processStyleObject: function(styleObject)
    {
      let rules = styleObject.cssRules;

      if (rules && rules.length > 0)
      {
        for (let i = 0; i < rules.length; i++)
        {
          let rule = rules[i];

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
      let arg = this._extractArgument(styleProvider.style.content);
      let affectedNodes = [];

      if (arg.length > 0)
      {
        // Get arguments of the `stylish.js` expression
        let args;

        try
        {
          args = JSON.parse(arg);
        }
        catch(e)
        {
          let message = (`[Stylish/_processStyleProvider] `
            + `Error while parse expression \`${styleProvider.selectorText || styleProvider.localName}\`\n`
            + `\tError Message: ${e.message}\n`
            + `\tError Code: ${e.code}`);

          throw new Error(message);
        }

        if (styleProvider instanceof CSSStyleRule)
        {
          // Get all affected nodes by the rule selector
          document
            .querySelectorAll(styleProvider.selectorText)
            .forEach(node => affectedNodes.push(node));
        }
        // stylish is directly applied on a element style
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
      this._triggers.forEach(trigger =>
      {
        if (sender !== trigger)
        {
          try
          {
            trigger.call(this, nodes, args, styleProvider, payload);
          }
          catch (e) {
            let message = (`[Stylish/_processTrigger] `
              + `Error while process trigger for \`${styleProvider.selectorText || styleProvider.localName}\`\n`
              + `\tError Message: ${e.message}\n`
              + `\tError Code: ${e.code}`);

            throw new Error(message);
          }
        }
      });
    },

    /**
     * Processes a handler
     * @private
     * @param nodes
     * @param payload
     * @param trigger
     */
    _processHandler: function(nodes, payload, trigger)
    {
      this._handlers.forEach(handler =>
      {
        if (trigger === handler.trigger)
        {
          handler.fn(nodes, payload);
        }
      });
    },

    /**
     * Starts the processing of `stylish.js`
     * @public
     */
    process: function()
    {
      let nodes = document.querySelectorAll(Stylish.QUERY_SELECTOR);

      nodes.forEach(node =>
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
      });

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
      let index = this._triggers.indexOf(handler);

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
      this._handlers.push({ trigger, fn });

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
      for (let index = 0; index < this._handlers.length; index++)
      {
        let handler = this._handlers[index];

        if (handler.trigger === trigger && handler.fn === fn)
        {
          this._handlers.splice(index, 1);
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
      const MODES = [ 'local', 'global' ];

      /**
       * @type {Function}
       * @private
       */
      let _currHandler;

      /**
       * @type {Function}
       * @private
       */
      let _prevHandler;

      /**
       * @public
       * @memberof Stylish.triggers.on
       * @param {Array} nodes
       * @param {Object} args
       * @param {CSSStyleRule|HTMLElement} styleProvider
       */
      function triggerOn(nodes, args, styleProvider)
      {
        // Nothing to do!
        if (nodes.length === 0)
        {
          return;
        }

        if (typeof args.on === 'object' && Array.isArray(args.on.events))
        {
          // The mode determines which elements are processed:
          // * local: Only the element that fired the event
          //   is processed
          // * global: All elements that are matches the
          //   expression selector are processed
          let mode = (MODES.indexOf(args.on.mode) > -1)
            ? args.on.mode
            : 'local';

          // Store previous handler for removing
          _prevHandler = _currHandler;

          _currHandler = event =>
          {
            this._processHandler(
              (mode === 'local') ? [ event.target ] : nodes,
              { event },
              triggerOn
            );
          };

          args.on.events.forEach(event =>
          {
            nodes.forEach(node =>
            {
              if (typeof _prevHandler === 'function')
              {
                node.removeEventListener(event, _prevHandler);
              }

              node.addEventListener(event, _currHandler);
            });
          });
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
        if (nodes.length === 0)
        {
          return;
        }

        if (typeof args.data === 'object')
        {
          for (let n in args.data)
          {
            if (args.data.hasOwnProperty(n))
            {
              nodes.forEach(node => {
                node.setAttribute(`data-${n}`, args.data[n]);
              });

              this._processHandler(nodes, { data: args.data }, triggerData);
            }
          }
        }
      }

      return triggerData;

    })()
  };

  // Set global API
  window.Stylish = Stylish;

})();