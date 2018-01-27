console.time('init');

let stylish = new Stylish();

function triggerCustom(nodes, args, styleProvider)
{
  if (typeof args === 'string') {
    console.log('[triggerCustom]', nodes, args, styleProvider);
    nodes.forEach(node => node.innerText = args);
  }
}

function randomColor() {
  let rgb = 'rgb(%s, %s, %s)';

  for (let i = 0; i < 4; i++) {
    rgb = rgb.replace('%s', Math.floor(Math.random() * 255));
  }

  return rgb;
}

stylish
  .addTrigger(Stylish.triggers.on)
  .addTrigger(Stylish.triggers.data)
  .addTrigger(triggerCustom)
  .addHandler(
    Stylish.triggers.on,
    function(nodes, payload, trigger)
    {
      console.info('[onHandler]', nodes, payload);
      let bgColor = randomColor();

      nodes.forEach(node => {
        node.style.backgroundColor = bgColor;
      });
    }
  )
  .addHandler(
    Stylish.triggers.data,
    function(nodes, payload, trigger)
    {
      console.info('[dataHandler]', nodes, payload);
    }
  );

stylish.process();

console.timeEnd('init');
