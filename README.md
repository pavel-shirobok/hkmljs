# HKML.JS
**H**ot **K**ey **M**arkup **L**anguage.

[Demo](http://labs.ramshteks.com/demo/hkmljs/)

This library will help u make a quick map for hot keys. Just like 1-2-3-Fibonacci.

Hkml.js is firstly language. So need to understand how it work.

Hkml support next expressions and it combinations:

```KEY1+KEY2``` - trigger when user pressed KEY1 and KEY2 at the same time
```KEY1>>KEY2``` - trigger when user pressed first KEY1 then KEY2
```KEY1>N>KEY2``` - trigger when user pressed first KEY1 then KEY2, and between presses less N ms.

## Get it?
okay...

## JS API

so when u understand how hkml works, we can start understanding of JS API.

```
//Creating handler for dom object. By default this is document
var hotKeyHandler = hkml([dom target]);

//Listen hot key(markup instanceOf String), callback is function(markup, status){/* status == true when hotkey is triggered*/}
hotKeyHandler.on(markup, callback);

//triggering some callback by markup string
hotKeyHandler.trigger(markup)

//removing listener by markup string
hotKeyHandler.remove(markup);
```

Some examples u can see at ```example/js/app.js```.

### Example of hkml markup

```

A+B>>Z
A+B+C>>D+F
A>100>B>100>C

```