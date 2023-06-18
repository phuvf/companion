/*
 * This file is part of the Companion project
 * Copyright (c) 2018 Bitfocus AS
 * Authors: William Viker <william@bitfocus.io>, Håkon Nessjøen <haakon@bitfocus.io>
 *
 * This program is free software.
 * You should have received a copy of the MIT licence as well as the Bitfocus
 * Individual Contributor License Agreement for companion along with
 * this program.
 *
 * You can be released from the requirements of the license by purchasing
 * a commercial license. Buying such a license is mandatory as soon as you
 * develop commercial activities involving the Companion software without
 * disclosing the source code of your own applications.
 *
 */

import Image from './Image.js'
import { ParseAlignment, parseColor } from '../Resources/Util.js'
//import {performance} from 'perf_hooks'

const colorButtonYellow = 'rgb(255, 198, 0)'
const colorWhite = 'white'
const colorBlack = 'black'
const colorDarkGrey = 'rgba(15, 15, 15, 1)'

const internalIcons = {
	// 15x8 argb
	cloud:
		`<?xml version="1.0"?>
		<svg version="1.0" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
			 width="396.9px" height="226.8px" viewBox="0 0 396.9 226.8" enable-background="new 0 0 396.9 226.8" xml:space="preserve">
		<path fill="#D9D1FF" d="M328.1,225.4c34.3,0,62.1-26.5,62.1-59.1c0-28-20.5-51.5-48-57.6C341.6,49.4,290.9,1.4,228.5,1.4
			c-42.9,0-80.2,22.6-99.6,56c-5.9-2.4-12.4-3.8-19.2-3.8c-24.6,0-44.9,17.5-48,40.1c-32,6-56.2,32.9-56.2,65.2
			c0,36.7,31.3,66.5,69.8,66.5C86,225.4,320.8,225.4,328.1,225.4z"/>
		</svg>
		
		`
}

// let lastDraw = 0

export default class GraphicsRenderer {
	/**
	 * Draw the image for an empty bank
	 * @param {number} page
	 * @param {number} bank
	 * @access public
	 * @returns Image render object
	 */
	static drawBlank(options, page, bank) {
		// let now = performance.now()
		// console.log('starting drawBlank ' + now, 'time elapsed since last start ' + (now - lastDraw))
		// lastDraw = now
		// console.time('drawBlankImage')
		const img = new Image(72, 72, 1)

		img.fillColor('black')

		if (!options.remove_topbar) {
			img.drawTextLine(2, 3, `${page}.${bank}`, 'rgb(50, 50, 50)', 8)
			img.horizontalLine(13.5, 'rgb(30, 30, 30)')
		}
		// console.timeEnd('drawBlankImage')
		return img.bufferAndTime()
	}

	/**
	 * Draw the image for a bank
	 * @param {object} options
	 * @param {object} bankStyle The style to draw
	 * @param {number | undefined} page
	 * @param {number | undefined} bank
	 * @param {string | undefined} pagename
	 * @access public
	 * @returns Image render object
	 */
	static drawBankImage(options, bankStyle, page, bank, pagename) {
		// console.log('starting drawBankImage '+ performance.now())
		// console.time('drawBankImage')
		const img = new Image(72, 72, 4)
		let draw_style = undefined

		// special button types
		if (bankStyle.style == 'pageup') {
			draw_style = 'pageup'

			img.fillColor(colorDarkGrey)

			if (options.page_plusminus) {
				img.drawTextLine(31, 20, options.page_direction_flipped ? '–' : '+', colorWhite, 18)
			} else {
				img.drawPath(
					[
						[46, 30],
						[36, 20],
						[26, 30],
					],
					colorWhite,
					2
				) // Arrow up path
			}

			img.drawTextLineAligned(36, 39, 'UP', colorButtonYellow, 10, 'center', 'top')
		} else if (bankStyle.style == 'pagedown') {
			draw_style = 'pagedown'

			img.fillColor(colorDarkGrey)

			if (options.page_plusminus) {
				img.drawTextLine(31, 36, options.page_direction_flipped ? '+' : '–', colorWhite, 18)
			} else {
				img.drawPath(
					[
						[46, 40],
						[36, 50],
						[26, 40],
					],
					colorWhite,
					2
				) // Arrow down path
			}

			img.drawTextLineAligned(36, 23, 'DOWN', colorButtonYellow, 10, 'center', 'top')
		} else if (bankStyle.style == 'pagenum') {
			draw_style = 'pagenum'

			img.fillColor(colorDarkGrey)

			if (page === undefined) {
				// Preview (no page/bank)
				img.drawTextLineAligned(36, 18, 'PAGE', colorButtonYellow, 10, 'center', 'top')
				img.drawTextLineAligned(36, 32, 'x', colorWhite, 18, 'center', 'top')
			} else if (!pagename || pagename.toLowerCase() == 'page') {
				img.drawTextLine(23, 18, 'PAGE', colorButtonYellow, 10)
				img.drawTextLineAligned(36, 32, '' + page, colorWhite, 18, 'center', 'top')
			} else {
				img.drawAlignedText(0, 0, 72, 72, pagename, colorWhite, 18, 'center', 'center')
			}
		} else if (bankStyle.style) {
			draw_style = bankStyle

			let show_topbar = bankStyle.show_topbar
			if (bankStyle.show_topbar === 'default' || bankStyle.show_topbar === undefined) {
				show_topbar = !options.remove_topbar
			}

			// handle upgrade from pre alignment-support configuration
			if (bankStyle.alignment === undefined) {
				bankStyle.alignment = 'center:center'
			}
			if (bankStyle.pngalignment === undefined) {
				bankStyle.pngalignment = 'center:center'
			}

			// Draw background color first
			!show_topbar
				? img.box(0, 0, 72, 72, parseColor(bankStyle.bgcolor))
				: img.box(0, 14, 72, 72, parseColor(bankStyle.bgcolor))

			// Draw background PNG if exists
			if (bankStyle.png64 !== undefined && bankStyle.png64 !== null) {
				try {
					let png64 = bankStyle.png64.startsWith('data:image/png;base64,') ? bankStyle.png64.slice(22) : bankStyle.png64
					let data = Buffer.from(png64, 'base64')
					const [halign, valign] = ParseAlignment(bankStyle.pngalignment)

					!show_topbar
						? img.drawFromPNGdata(data, 0, 0, 72, 72, halign, valign)
						: img.drawFromPNGdata(data, 0, 14, 72, 58, halign, valign)
				} catch (e) {
					console.error('error drawing image:', e)
					img.box(0, 14, 71, 57, 'black')
					!show_topbar
						? img.drawAlignedText(2, 2, 68, 68, 'PNG ERROR', 'red', 10, 'center', 'center')
						: img.drawAlignedText(2, 18, 68, 52, 'PNG ERROR', 'red', 10, 'center', 'center')

					GraphicsRenderer.#drawTopbar(img, show_topbar, bankStyle, page, bank)
					return {
						buffer: img.buffer(),
						updated: Date.now(),
						style: draw_style,
					}
				}
			}

			// Draw images from feedbacks
			try {
				for (const image of bankStyle.imageBuffers || []) {
					if (image.buffer) {
						const yOffset = show_topbar ? 14 : 0

						const x = image.x ?? 0
						const y = yOffset + (image.y ?? 0)
						const width = image.width || 72
						const height = image.height || 72 - yOffset

						img.drawPixelBuffer(x, y, width, height, image.buffer)
					}
				}
			} catch (e) {
				img.fillColor('black')
				!show_topbar
					? img.drawAlignedText(2, 2, 68, 68, 'IMAGE\\nDRAW\\nERROR', 'red', 10, 'center', 'center')
					: img.drawAlignedText(2, 18, 68, 52, 'IMAGE\\nDRAW\\nERROR', 'red', 10, 'center', 'center')

				GraphicsRenderer.#drawTopbar(img, show_topbar, bankStyle, page, bank)
				return {
					buffer: img.buffer(),
					updated: Date.now(),
					style: draw_style,
				}
			}

			// Draw button text
			const [halign, valign] = ParseAlignment(bankStyle.alignment)
			if (bankStyle.size == 'small') bankStyle.size = 7 // compatibility with v1 database
			if (bankStyle.size == 'large') bankStyle.size = 14 // compatibility with v1 database

			if (!show_topbar) {
				img.drawAlignedText(2, 1, 68, 70, bankStyle.text, parseColor(bankStyle.color), bankStyle.size, halign, valign)
			} else {
				img.drawAlignedText(2, 15, 68, 57, bankStyle.text, parseColor(bankStyle.color), bankStyle.size, halign, valign)
			}

			// At last draw Topbar on top
			GraphicsRenderer.#drawTopbar(img, show_topbar, bankStyle, page, bank)
		}

		// console.timeEnd('drawBankImage')
		return {
			buffer: img.buffer(),
			updated: Date.now(),
			style: draw_style,
		}
	}

	/**
	 * Draw the topbar onto an image for a bank
	 * @param {object} img Image to draw to
	 * @param {boolean} show_topbar
	 * @param {object} bankStyle The style to draw
	 * @param {number | undefined} page
	 * @param {number | undefined} bank
	 * @access private
	 */
	static #drawTopbar(img, show_topbar, bankStyle, page, bank) {
		if (!show_topbar) {
			if (bankStyle.pushed) {
				img.drawBorder(3, colorButtonYellow)
			}
		} else {
			let step = ''
			img.box(0, 0, 72, 13.5, colorBlack)
			img.horizontalLine(13.5, colorButtonYellow)

			if (typeof bankStyle.step_cycle === 'number' && page !== undefined) {
				step = `.${bankStyle.step_cycle}`
			}

			if (page === undefined) {
				// Preview (no page/bank)
				img.drawTextLine(4, 2, `x.x${step}`, colorButtonYellow, 9)
			} else if (bankStyle.pushed) {
				img.box(0, 0, 72, 14, colorButtonYellow)
				img.drawTextLine(4, 2, `${page}.${bank}${step}`, colorBlack, 9)
			} else {
				img.drawTextLine(4, 2, `${page}.${bank}${step}`, colorButtonYellow, 9)
			}
		}

		// Draw status icons from right to left
		let rightMax = 72

		// first the cloud icon if present
		if (bankStyle.cloud && show_topbar) {
			img.drawFromSVGdata( internalIcons.cloud, rightMax - 17, 3, 14, 8, 'center', 'center', 'fit')
			rightMax -= 16
		}

		// next error or warning icon
		if (page !== undefined || bank !== undefined) {
			switch (bankStyle.bank_status) {
				case 'error':
					img.box(rightMax - 10, 3, rightMax - 2, 11, 'red')
					rightMax -= 10
					break
				case 'warning':
					img.drawFilledPath(
						[
							[rightMax - 10, 11],
							[rightMax - 2, 11],
							[rightMax - 6, 3],
						],
						'rgb(255, 127, 0)'
					)
					img.drawTextLineAligned(rightMax - 6, 11, '!', colorBlack, 7, 'center', 'bottom')
					rightMax -= 10
					break
			}

			// last running icon
			if (bankStyle.action_running) {
				//img.drawTextLine(55, 3, '►', 'rgb(0, 255, 0)', 8) // not as nice
				let iconcolor = 'rgb(0, 255, 0)'
				if (bankStyle.pushed) iconcolor = colorBlack
				img.drawFilledPath(
					[
						[rightMax - 8, 3],
						[rightMax - 2, 7],
						[rightMax - 8, 11],
					],
					iconcolor
				)
				rightMax -= 8
			}
		}
	}

	/**
	 * Draw pincode entry button for given number
	 * @param {number} num Display number
	 * @returns
	 */
	static drawPincodeNumber(num) {
		const img = new Image(72, 72, 3)
		img.fillColor(colorDarkGrey)
		img.drawTextLineAligned(36, 36, `${num}`, colorWhite, 44, 'center', 'center')
		return img.bufferAndTime()
	}

	static drawPincodeEntry(code) {
		const img = new Image(72, 72, 4)
		img.fillColor(colorDarkGrey)
		img.drawTextLineAligned(36, 30, 'Lockout', colorButtonYellow, 14, 'center', 'center')
		if (code !== undefined) {
			img.drawAlignedText(0, 15, 72, 72, code.replace(/[a-z0-9]/gi, '*'), colorWhite, 18, 'center', 'center')
		}

		return img.bufferAndTime()
	}
}
