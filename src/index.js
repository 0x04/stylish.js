/**
 * stylish.js
 * A CSS-JavaScript processor
 *
 * @author  Oliver Kühn
 * @email   ok@0x04.de
 * @website http://0x04.de
 * @version 0.1.1
 * @license MIT
 */

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
   * Extracts the argument string from a stylish content expression
   * @private
   * @param {String} content
   * @returns {string}
   */
  _extractArgumentString: function (content) {
    let result = '';

    if (content.length > Stylish.ATTRIBUTE_NAME.length && Stylish.REGEXP_EXPRESSION.test(content))
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
    // Get argument string of the `stylish.js` expression
    let arg = this._extractArgumentString(styleProvider.style.content);
    let nodes = [];

    if (arg.length > 0)
    {
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
          + `\tError Code: ${e.code}`
        );

        throw new Error(message);
      }

      if (styleProvider instanceof CSSStyleRule)
      {
        // Get all matching nodes by the rule selector
        document
          .querySelectorAll(styleProvider.selectorText)
          .forEach(node => nodes.push(node));
      }
      // stylish is directly applied on a element style
      else nodes.push(styleProvider);

      this._processTrigger(nodes, args, styleProvider);
    }
  },

  /**
   * Processes all triggers
   * @private
   * @param {Array|NodeList} nodes
   * @param {*} args
   * @param {CSSStyleRule|HTMLElement} styleProvider
   */
  _processTrigger: function(nodes, args, styleProvider)
  {
    this._triggers.forEach(trigger =>
    {
      try
      {
        trigger.call(this, nodes, args, styleProvider);
      }
      catch (e) {
        let message = (`[Stylish/_processTrigger] `
          + `Error while process trigger for \`${styleProvider.selectorText || styleProvider.localName}\`\n`
          + `\tError Message: ${e.message}\n`
          + `\tError Code: ${e.code}`
        );

        throw new Error(message);
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
   * Removes an expression trigger
   * @public
   * @param {function(Function)} trigger
   */
  removeTrigger: function(trigger)
  {
    let index = this._triggers.indexOf(trigger);

    if (index > -1)
    {
      this._triggers.splice(index, 1);
      this._handlers = this._handlers.filter(handler => handler.trigger === trigger);
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
  on: (() =>
  {
    /**
     * @type {Array}
     * @private
     */
    const MODES = [ 'local', 'global' ];

    /**
     * @public
     * @memberof Stylish.triggers.on
     * @param {Array} nodes
     * @param {Object} on
     * @param {Array} on.events
     * @param {String} on.mode The mode determines which elements are processed:
     *   - local: Only the element that fired the event is processed
     *   - global: All elements that are matches the expression selector are processed
     * @param {Boolean} on.capture
     * @param {CSSStyleRule|HTMLElement} styleProvider
     */
    function triggerOn(nodes, { on }, styleProvider)
    {
      if (nodes.length > 0 && typeof on === 'object' && Array.isArray(on.events))
      {
        const MODE = (MODES.indexOf(on.mode) > -1)
          ? on.mode
          : 'local';

        const EVENT_HANDLER = event =>
        {
          this._processHandler(
            (MODE === 'local') ? [ event.target ] : nodes,
            { event },
            triggerOn
          );
        };

        on.events.forEach(event =>
        {
          nodes.forEach(node =>
          {
            node.addEventListener(event, EVENT_HANDLER, on.capture);
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
  data: function triggerData(nodes, { data }, styleProvider)
  {
    if (nodes.length > 0 && typeof data === 'object')
    {
      for (let name in data)
      {
        if (data.hasOwnProperty(name))
        {
          nodes.forEach(node => {
            node.dataset[name] = data[name];
          });

          this._processHandler(nodes, { data }, triggerData);
        }
      }
    }
  }
};

let test1 = { value: 'hello' };
let test2 = { ...test1, foobar: 1 };
console.info(test2);

// Set global API
//window.Stylish = Stylish;
export { Stylish };