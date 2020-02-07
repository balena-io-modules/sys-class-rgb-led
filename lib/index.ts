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

class Led {
	private handle: fs.FileHandle;
	private ready: Promise<void>;
	private lastValue?: number;

	constructor(private path: string) {
		this.ready = this.open();
	}

	private async open() {
		if (this.handle === undefined) {
			this.handle = await fs.open(this.path, 'w');
		}
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
		const value = Math.round(intensity * 255);
		if (value !== this.lastValue) {
			await this.handle.write(value.toString(), 0);
			// On a regular file we would also need to truncate to the written value length but it looks like it's not the case on sysfs files
			this.lastValue = value;
		}
	}
}

export type Color = [number, number, number];
export type AnimationFunction = (t: number) => Color;

function delay(duration: number): Promise<void> {
	// delay that accepts Infinity
	if (duration === Infinity) {
		return new Promise(() => {
			// Never resolve
		});
	} else {
		return new Promise(resolve => {
			setTimeout(resolve, duration);
		});
	}
}

function cancellableDelay(
	duration: number,
): { promise: Promise<void>; cancel: () => void } {
	let maybeCancel: () => void;
	const cancel = () => {
		if (maybeCancel !== undefined) {
			maybeCancel();
		}
	};
	const cancelPromise: Promise<void> = new Promise(resolve => {
		maybeCancel = resolve;
	});
	const promise = Promise.race([delay(duration), cancelPromise]);
	return { promise, cancel };
}

export class RGBLed {
	private leds: [Led, Led, Led];
	private animation: AnimationFunction;
	private period: number; // in ms
	private alive = true;
	private wakeUp = () => {
		// noop until this.loop() is called
	};
	private lastRequestedColorSet = () => {
		// noop until this.setAnimation() is called
	};

	constructor(paths: [string, string, string]) {
		this.leds = paths.map(path => new Led(path)) as [Led, Led, Led];
		this.setStaticColor([0, 0, 0]);
		this.loop();
	}

	public async close() {
		this.alive = false;
		this.wakeUp();
		await Promise.all(
			this.leds.map(l => {
				l.close();
			}),
		);
	}

	private setFrequency(frequency: number) {
		if (frequency < 0) {
			throw new Error('frequency must be greater or equal to 0');
		}
		this.period = 1000 / frequency;
		this.wakeUp();
	}

	private async loop() {
		while (this.alive) {
			const start = new Date().getTime();
			await this.setColor(this.animation(start));
			// Signal that the requested color has been set
			this.lastRequestedColorSet();
			const end = new Date().getTime();
			const duration = end - start;
			const { promise, cancel } = cancellableDelay(this.period - duration);
			this.wakeUp = cancel;
			await promise;
		}
	}

	public async setAnimation(animation: AnimationFunction, frequency = 10) {
		this.animation = animation;
		this.setFrequency(frequency);
		await new Promise(resolve => {
			this.lastRequestedColorSet = resolve;
		});
	}

	public async setStaticColor(color: Color) {
		await this.setAnimation(() => color, 0);
	}

	private async setColor(color: Color) {
		await Promise.all([
			this.leds[0].setIntensity(color[0]),
			this.leds[1].setIntensity(color[1]),
			this.leds[2].setIntensity(color[2]),
		]);
	}
}

// Example animations:
export function breatheGreen(t: number): Color {
	const intensity = (1 + Math.sin(t / 1000)) / 2;
	return [0, intensity, 0];
}

export function blinkWhite(t: number): Color {
	const intensity = Math.floor(t / 1000) % 2;
	return [intensity, intensity, intensity];
}
