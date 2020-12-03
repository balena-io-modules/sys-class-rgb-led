/*
 * Copyright 2020 balena.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { promises as fs } from 'fs';
import { join } from 'path';

const LEDS_DIR = '/sys/class/leds';

class Led {
	private handle: fs.FileHandle;
	private ready: Promise<void>;
	private maxBrightness: number;
	private lastValue?: number;

	constructor(private name: string) {
		this.ready = this.open();
		this.ready.catch(() => {
			// Avoid unhandled rejections
		});
	}

	private async open() {
		this.maxBrightness = parseInt(
			await fs.readFile(join(LEDS_DIR, this.name, 'max_brightness'), 'utf8'),
			10,
		);
		this.handle = await fs.open(join(LEDS_DIR, this.name, 'brightness'), 'w');
	}

	public async close() {
		await this.ready;
		await this.handle.close();
	}

	public async setIntensity(intensity: number) {
		await this.ready;
		if (intensity < 0 || intensity > 1) {
			throw new Error('Led intensity must be between 0 and 1');
		}
		const value = Math.round(intensity * this.maxBrightness);
		if (value !== this.lastValue) {
			await this.handle.write(value.toString(), 0);
			// On a regular file we would also need to truncate to the written value length but it looks like it's not the case on sysfs files
			this.lastValue = value;
		}
	}
}

export type Color = [number, number, number];
export type AnimationFunction = (t: number) => Color;

export class RGBLed {
	private leds: [Led, Led, Led];

	constructor(names: [string, string, string]) {
		this.leds = names.map((name) => new Led(name)) as [Led, Led, Led];
	}

	public async close() {
		await Promise.all(this.leds.map((l) => l.close()));
	}

	public async setColor(color: Color) {
		await Promise.all([
			this.leds[0].setIntensity(color[0]),
			this.leds[1].setIntensity(color[1]),
			this.leds[2].setIntensity(color[2]),
		]);
	}
}

export class Animator {
	private intervalId?: NodeJS.Timeout;
	private lastUpdate?: Promise<void>;
	private updating = false;

	constructor(
		public mapping: Array<{ animation: AnimationFunction; rgbLeds: RGBLed[] }>,
		frequency = 10,
	) {
		this.setFrequency(frequency);
	}

	public async setFrequency(frequency: number) {
		if (frequency < 0) {
			throw new Error('frequency must be greater or equal to 0');
		}
		const period = 1000 / frequency;
		this.stop();
		if (period === Infinity) {
			// frequency is 0
			if (this.lastUpdate !== undefined) {
				await this.lastUpdate;
			}
		} else {
			this.start(period);
		}
	}

	private start(period: number) {
		if (this.intervalId === undefined) {
			this.intervalId = setInterval(() => {
				this.updateOrSkip();
			}, period);
		}
	}

	private stop() {
		if (this.intervalId !== undefined) {
			clearInterval(this.intervalId);
			this.intervalId = undefined;
		}
	}

	private updateOrSkip() {
		if (!this.updating) {
			this.lastUpdate = this.update();
		}
	}

	private async update() {
		this.updating = true;
		const t = new Date().getTime() / 1000;
		const promises: Array<Promise<void>> = [];
		for (const { animation, rgbLeds } of this.mapping) {
			const color = animation(t);
			promises.push(...rgbLeds.map((rgbLed) => rgbLed.setColor(color)));
		}
		await Promise.all(promises);
		this.updating = false;
	}
}

export function sin01(t: number) {
	// sin(t) but the output is in the [0, 1] range
	return (1 + Math.sin(t)) / 2;
}

// Example animations:
export function breatheGreen(t: number): Color {
	return [0, sin01(t), 0];
}

const THIRD_OF_PI = Math.PI / 3;

export function rainbow(t: number): Color {
	return [sin01(t), sin01(t + 2 * THIRD_OF_PI), sin01(t + 4 * THIRD_OF_PI)];
}

export function blinkWhite(t: number): Color {
	const intensity = Math.floor(t) % 2;
	return [intensity, intensity, intensity];
}
