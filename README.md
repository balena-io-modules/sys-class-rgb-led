# sys-class-rgb-led

Animates `/sys/class/leds` rgb leds

## Example

For controlling an RGB led using `/sys/class/leds/pca963x:{red,green,blue}/brightness` files:

```typescript
import { RGBLed, breatheGreen, blinkWhite } from 'sys-class-rgb-led';

const led = new RGBLed([
    'pca963x:red',
    'pca963x:green',
    'pca963x:blue',
]);
await led.setColor([0.5, 0.5, 0.5]);
// or
const animator = new Animator([{ animation: breatheGreen, rgbLeds: [led] }], 25)

// change the animation:
animator.mapping = [{ animation: blinkWhite, rgbLeds: [led] }];

// turn it off
animator.setFrequency(0);
await led.setColor([0, 0, 0]);
await led.close();
```

A `Color` is an `Array` of 3 numbers between 0 and 1.

An `AnimationFunction` is a function that takes a timestamp in seconds as parameter and returns a `Color`.

`Animator` accepts a second optional `frequency` parameter, the default value is 10Hz.

Check the `example.ts` file for a 16 rgb led rainbow animation
