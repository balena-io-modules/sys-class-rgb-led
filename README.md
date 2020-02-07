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
led.setStaticColor([0.5, 0.5, 0.5]);
// or
led.setAnimation(breatheGreen);
// or
led.setAnimation(blinkWhite);
```

A `Color` is an `Array` of 3 numbers between 0 and 1.

An `AnimationFunction` is a function that takes a timestamp in milliseconds as parameter and returns a `Color`.

`setAnimation` accepts a second optional `frequency` parameter, the default value is 10Hz.
