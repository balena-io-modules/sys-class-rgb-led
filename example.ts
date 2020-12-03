import { argv } from 'process';

import { Animator, RGBLed, rainbow } from './';

const leds: RGBLed[] = [];
for (let i = 1; i <= 16; i++) {
	leds.push(new RGBLed([`led${i}_r`, `led${i}_g`, `led${i}_b`]));
}

const speed = parseFloat(argv[2]) || 1;
const duration = parseFloat(argv[3]) || 10;
const frequency = parseInt(argv[4], 10) || 25;

const shift = (2 * Math.PI) / 16;

const animations = leds.map((led, index) => ({
	animation: (t: number) => rainbow(speed * t - shift * index),
	rgbLeds: [led],
}));

const animator = new Animator(animations, frequency);

setTimeout(async () => {
	// Stop the animation
	await animator.setFrequency(0);
	// Turn off the leds
	await Promise.all(leds.map((led) => led.setColor([0, 0, 0])));
}, duration * 1000);
