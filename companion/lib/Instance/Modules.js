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

import fs from 'fs-extra'
import { isPackaged } from '../Resources/Util.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { cloneDeep } from 'lodash-es'
import jsonPatch from 'fast-json-patch'
import { InstanceModuleScanner } from './ModuleScanner.js'
import LogController from '../Log/Controller.js'
import { assertNever } from '@companion-module/base'

const ModulesRoom = 'modules'

/**
 * @typedef {{
 *   basePath: string
 *   helpPath: string | null
 *   display: ModuleDisplayInfo
 *   manifest: import('@companion-module/base').ModuleManifest
 *   isOverride?: boolean
 *   isPackaged: boolean
 * }} ModuleInfo
 */

/**
 * @typedef {import('@companion-app/shared/Model/ModuleInfo.js').ModuleDisplayInfo} ModuleDisplayInfo
 */

/**
 * @typedef {{
 *   basePath: string
 *   helpPath: string | null
 *   display: ModuleDisplayInfo
 *   manifest: import('@companion-module/base').ModuleManifest
 *   isPackaged: boolean
 * }} NewModuleVersionInfo
 *
 * @typedef {{
 *   type: 'builtin' | 'dev' | 'user'
 *   id?: string
 * }} NewModuleUseVersion
 *
 */

class NewModuleInfo {
	/**
	 * @type {string}
	 */
	id

	/**
	 * @type {string[]}
	 */
	replacedByIds = []

	/**
	 * @type {NewModuleVersionInfo | null}
	 */
	builtinModule = null

	/**
	 * @type {Record<string, NewModuleVersionInfo | undefined>}
	 */
	devVersions = {}

	/**
	 * @type {Record<string, NewModuleVersionInfo | undefined>}
	 */
	userVersions = {}

	/**
	 * @type {NewModuleUseVersion | null}
	 */
	useVersion = null

	/**
	 * @param {string} id
	 */
	constructor(id) {
		this.id = id
	}

	/**
	 * @returns {NewModuleVersionInfo | null}
	 */
	getSelectedVersion() {
		if (!this.useVersion) return null
		switch (this.useVersion.type) {
			case 'builtin':
				return this.builtinModule
			case 'dev':
				return this.useVersion.id ? this.devVersions[this.useVersion.id] ?? null : null
			case 'user':
				return this.useVersion.id ? this.userVersions[this.useVersion.id] ?? null : null

			default:
				assertNever(this.useVersion.type)
				return null
		}
	}
}

export default class InstanceModules {
	#logger = LogController.createLogger('Instance/Modules')

	/**
	 * Last module info sent to clients
	 * @type {Record<string, ModuleDisplayInfo> | null}
	 * @access private
	 */
	#lastModulesJson = null

	/**
	 * The core instance controller
	 * @type {import('./Controller.js').default}
	 * @access public
	 */
	#instanceController

	/**
	 * The core interface client
	 * @type {import('../UI/Handler.js').default}
	 * @access public
	 */
	#io

	/**
	 * Known module info
	 * @type {Map<string, NewModuleInfo>}
	 * @access private
	 * @readonly
	 */
	#knownModules = new Map()

	// /**
	//  * Module renames
	//  * @type {Map<string, string>}
	//  * @access private
	//  * @readonly
	//  */
	// #moduleRenames = new Map()

	/**
	 * Module scanner helper
	 * @access private
	 * @readonly
	 */
	#moduleScanner = new InstanceModuleScanner()

	/**
	 * @param {import("../UI/Handler.js").default} io
	 * @param {import("express").Router} api_router
	 * @param {import("./Controller.js").default} instance
	 */
	constructor(io, api_router, instance) {
		this.#io = io
		this.#instanceController = instance

		api_router.get('/help/module/:moduleId/*', this.#getHelpAsset)
	}

	/**
	 *
	 * @param {string} id
	 * @returns {NewModuleInfo}
	 */
	#getOrCreateModuleEntry(id) {
		let moduleInfo = this.#knownModules.get(id)
		if (!moduleInfo) {
			moduleInfo = new NewModuleInfo(id)
			this.#knownModules.set(id, moduleInfo)
		}
		return moduleInfo
	}

	/**
	 * Initialise instances
	 * @param {string} extraModulePath - extra directory to search for modules
	 */
	async initInstances(extraModulePath) {
		/**
		 * @param {string} subpath
		 * @returns {string}
		 */
		function generatePath(subpath) {
			if (isPackaged()) {
				return path.join(__dirname, subpath)
			} else {
				return fileURLToPath(new URL(path.join('../../..', subpath), import.meta.url))
			}
		}

		const searchDirs = [
			// Paths to look for modules, lowest to highest priority
			path.resolve(generatePath('bundled-modules')),
		]

		const legacyCandidates = await this.#moduleScanner.loadInfoForModulesInDir(
			generatePath('module-legacy/manifests'),
			false
		)

		// Start with 'legacy' candidates
		for (const candidate of legacyCandidates) {
			candidate.display.isLegacy = true
			const moduleInfo = this.#getOrCreateModuleEntry(candidate.manifest.id)
			moduleInfo.builtinModule = candidate
		}

		// Load modules from other folders in order of priority
		for (const searchDir of searchDirs) {
			const candidates = await this.#moduleScanner.loadInfoForModulesInDir(searchDir, false)
			for (const candidate of candidates) {
				const moduleInfo = this.#getOrCreateModuleEntry(candidate.manifest.id)
				moduleInfo.builtinModule = candidate
			}
		}

		if (extraModulePath) {
			this.#logger.info(`Looking for extra modules in: ${extraModulePath}`)
			const candidates = await this.#moduleScanner.loadInfoForModulesInDir(extraModulePath, true)
			for (const candidate of candidates) {
				const moduleInfo = this.#getOrCreateModuleEntry(candidate.manifest.id)
				moduleInfo.devVersions['default'] = candidate // TODO - allow multiple
			}

			this.#logger.info(`Found ${candidates.length} extra modules`)
		}

		// Figure out the redirects. We do this afterwards, to ensure we avoid collisions and circles
		// TODO - could this have infinite loops?
		const allModuleEntries = Array.from(this.#knownModules.entries()).sort((a, b) => a[0].localeCompare(b[0]))
		for (const [id, moduleInfo] of allModuleEntries) {
			const allVersions = [
				...Object.values(moduleInfo.devVersions),
				...Object.values(moduleInfo.userVersions),
				moduleInfo.builtinModule,
			]
			for (const moduleVersion of allVersions) {
				if (moduleVersion && Array.isArray(moduleVersion.manifest.legacyIds)) {
					for (const legacyId of moduleVersion.manifest.legacyIds) {
						const fromEntry = this.#getOrCreateModuleEntry(legacyId)
						fromEntry.replacedByIds.push(id)
					}
				}
				// TODO - is there a risk of a legacy module replacing a modern one?
			}
		}

		// /**
		//  *
		//  * @param {[id: string, NewModuleVersionInfo | undefined][]} versions
		//  * @returns {string | null}
		//  */
		// function chooseBestVersion(versions) {
		// 	const versionStrings = versions.map((ver) => ver[0])
		// 	if (versionStrings.length <= 1) return versionStrings[0] ?? null

		// 	versionStrings.sort((a, b) => {
		// 		const a2 = semver.parse(a)
		// 		if (!a2) return 1

		// 		const b2 = semver.parse(b)
		// 		if (!b2) return -1

		// 		return a2.compare(b2)
		// 	})

		// 	return versionStrings[0]
		// }

		// Choose the version of each to use
		for (const [_id, moduleInfo] of allModuleEntries) {
			if (moduleInfo.replacedByIds.length > 0) continue

			const firstDevVersion = Object.keys(moduleInfo.devVersions)[0]
			if (firstDevVersion) {
				// TODO - properly
				moduleInfo.useVersion = {
					type: 'dev',
					id: firstDevVersion,
				}
				continue
			}

			const firstUserVersion = Object.keys(moduleInfo.userVersions)[0]
			if (firstUserVersion) {
				// TODO - properly
				moduleInfo.useVersion = {
					type: 'user',
					id: firstUserVersion,
				}
				continue
			}

			if (moduleInfo.builtinModule) {
				moduleInfo.useVersion = { type: 'builtin' }
				continue
			}
		}

		// Log the loaded modules
		for (const id of Array.from(this.#knownModules.keys()).sort()) {
			const moduleInfo = this.#knownModules.get(id)
			if (!moduleInfo || !moduleInfo.useVersion) continue

			const moduleVersion = moduleInfo.getSelectedVersion()
			if (!moduleVersion) continue

			if (moduleInfo.useVersion.type === 'dev') {
				this.#logger.info(
					`${moduleVersion.display.id}@${moduleVersion.display.version}: ${moduleVersion.display.name} (Overridden${
						moduleVersion.isPackaged ? ' & Packaged' : ''
					})`
				)
			} else {
				this.#logger.debug(
					`${moduleVersion.display.id}@${moduleVersion.display.version}: ${moduleVersion.display.name}`
				)
			}
		}
	}

	/**
	 * Reload modules from developer path
	 * @param {string} fullpath
	 */
	async reloadExtraModule(fullpath) {
		this.#logger.info(`Attempting to reload module in: ${fullpath}`)

		// nocommit redo this

		// const reloadedModule = await this.#moduleScanner.loadInfoForModule(fullpath, 'dev')
		// if (reloadedModule) {
		// 	this.#logger.info(
		// 		`Found new module "${reloadedModule.display.id}" v${reloadedModule.display.version} in: ${fullpath}`
		// 	)

		// 	// Replace any existing module
		// 	this.#knownModules.set(reloadedModule.manifest.id, {
		// 		...reloadedModule,
		// 		isOverride: true,
		// 	})

		// 	// Now broadcast to any interested clients
		// 	if (this.#io.countRoomMembers(ModulesRoom) > 0) {
		// 		const oldObj = this.#lastModulesJson?.[reloadedModule.manifest.id]
		// 		if (oldObj) {
		// 			const patch = jsonPatch.compare(oldObj, reloadedModule.display)
		// 			if (patch.length > 0) {
		// 				this.#io.emitToRoom(ModulesRoom, `modules:patch`, {
		// 					type: 'update',
		// 					id: reloadedModule.manifest.id,
		// 					patch,
		// 				})
		// 			}
		// 		} else {
		// 			this.#io.emitToRoom(ModulesRoom, `modules:patch`, {
		// 				type: 'add',
		// 				id: reloadedModule.manifest.id,
		// 				info: reloadedModule.display,
		// 			})
		// 		}
		// 	}

		// 	this.#lastModulesJson = cloneDeep(this.#getClientModulesJson())

		// 	// restart usages of this module
		// 	this.#instanceController.reloadUsesOfModule(reloadedModule.manifest.id)
		// } else {
		// 	this.#logger.info(`Failed to find module in: ${fullpath}`)
		// }
	}

	/**
	 * Checks whether an instance_type has been renamed
	 * @param {string} instance_type
	 * @returns {string} the instance_type that should be used (often the provided parameter)
	 */
	verifyInstanceTypeIsCurrent(instance_type) {
		const moduleInfo = this.#knownModules.get(instance_type)
		if (!moduleInfo || moduleInfo.replacedByIds.length === 0) return instance_type

		// TODO - should this handle deeper references?
		// TODO - should this choose one of the ids properly?
		return moduleInfo.replacedByIds[0]
	}

	/**
	 * Setup a new socket client's events
	 * @param {import('../UI/Handler.js').ClientSocket} client - the client socket
	 * @access public
	 */
	clientConnect(client) {
		client.onPromise('modules:subscribe', () => {
			client.join(ModulesRoom)

			return this.#lastModulesJson || this.#getClientModulesJson()
		})

		client.onPromise('modules:unsubscribe', () => {
			client.leave(ModulesRoom)
		})

		client.onPromise('connections:get-help', this.#getHelpForModule)
	}

	/**
	 * Get display version of module infos
	 * @returns {Record<string, ModuleDisplayInfo>}
	 */
	#getClientModulesJson() {
		/** @type {Record<string, ModuleDisplayInfo>} */
		const result = {}

		for (const [id, module] of this.#knownModules.entries()) {
			const moduleVersion = module.getSelectedVersion()
			if (moduleVersion) result[id] = moduleVersion.display
		}

		return result
	}

	/**
	 *
	 * @access public
	 * @param {string} moduleId
	 * @return {ModuleInfo | undefined}
	 */
	getModuleManifest(moduleId) {
		return this.#knownModules.get(moduleId)?.getSelectedVersion() ?? undefined
	}

	/**
	 * Load the help markdown file for a specified moduleId
	 * @access public
	 * @param {string} moduleId
	 * @returns {Promise<[err: string, result: null] | [err: null, result: import('@companion-app/shared/Model/Common.js').HelpDescription]>}
	 */
	#getHelpForModule = async (moduleId) => {
		try {
			const moduleInfo = this.#knownModules.get(moduleId)?.getSelectedVersion() // TODO - better selection
			if (moduleInfo && moduleInfo.helpPath) {
				const stats = await fs.stat(moduleInfo.helpPath)
				if (stats.isFile()) {
					const data = await fs.readFile(moduleInfo.helpPath)
					return [
						null,
						{
							markdown: data.toString(),
							baseUrl: `/int/help/module/${moduleId}/`,
						},
					]
				} else {
					this.#logger.silly(`Error loading help for ${moduleId}`, moduleInfo.helpPath)
					this.#logger.silly('Not a file')
					return ['nofile', null]
				}
			} else {
				return ['nofile', null]
			}
		} catch (err) {
			this.#logger.silly(`Error loading help for ${moduleId}`)
			this.#logger.silly(err)
			return ['nofile', null]
		}
	}

	/**
	 * Return a module help asset over http
	 * @param {import('express').Request<{ moduleId:string }>} req
	 * @param {import('express').Response} res
	 * @param {import('express').NextFunction} next
	 * @returns
	 */
	#getHelpAsset = (req, res, next) => {
		const moduleId = req.params.moduleId.replace(/\.\.+/g, '')
		// @ts-ignore
		const file = req.params[0].replace(/\.\.+/g, '')

		const moduleInfo = this.#knownModules.get(moduleId)?.getSelectedVersion() // TODO - better selection
		if (moduleInfo && moduleInfo.helpPath && moduleInfo.basePath) {
			const fullpath = path.join(moduleInfo.basePath, 'companion', file)
			if (file.match(/\.(jpe?g|gif|png|pdf|companionconfig)$/) && fs.existsSync(fullpath)) {
				// Send the file, then stop
				res.sendFile(fullpath)
				return
			}
		}

		// Try next handler
		next()
	}
}
