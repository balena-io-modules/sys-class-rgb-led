# sys-class-rgb-led

Animates `/sys/class/leds` rgb leds

## Example

```typescript
import { RGBLed, breatheGreen, blinkWhite } from 'sys-class-rgb-led';

const led = new RGBLed([
    '/sys/class/leds/pca963x:red/brightness',
    '/sys/class/leds/pca963x:green/brightness',
    '/sys/class/leds/pca963x:blue/brightness',
]);
await led.setStaticColor([0.5, 0.5, 0.5]);
// or
await led.setAnimation(breatheGreen);
// or
await led.setAnimation(blinkWhite);

await led.setStaticColor([0, 0, 0]);
await led.close();
```

A `Color` is an `Array` of 3 numbers between 0 and 1.

An `AnimationFunction` is a function that takes a timestamp in milliseconds as parameter and returns a `Color`.

`setAnimation` accepts a second optional `frequency` parameter, the default value is 10Hz.

`setAnimation` returns a `Promise` that will resolve when the first color of the animation has been set.

`setStaticColor` returns a `Promise` that will resolve when the color has been set.

This might be useful if you want to be sure that the color has been set before calling `close()`.
