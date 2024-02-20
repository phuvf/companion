import LogController from '../Log/Controller.js'
import path from 'path'
import fs from 'fs-extra'

export class InstanceUserModulesManager {
	#logger = LogController.createLogger('Instance/UserModulesManager')

	/**
	 * @type {import('./Modules.js').default}
	 * @access private
	 * @readonly
	 */
	#modulesManager

	/**
	 * Absolute path for storing user modules on disk
	 * @type {string}
	 * @access private
	 * @readonly
	 */
	#userModulesDir

	/**
	 * The directory user loaded modules will be stored in
	 * @returns {string}
	 */
	get userModulesDir() {
		return this.#userModulesDir
	}

	/**
	 * @param {import('./Modules.js').default} modulesManager
	 * @param {import('../Registry.js').AppInfo} appInfo
	 */
	constructor(modulesManager, appInfo) {
		this.#modulesManager = modulesManager
		this.#userModulesDir = path.join(appInfo.configDir, 'user-modules')
	}

	/**
	 * Initialise the user modules manager
	 */
	async init() {
		await fs.mkdirp(this.#userModulesDir)
	}

	/**
	 * Setup a new socket client's events
	 * @param {import('../UI/Handler.js').ClientSocket} _client - the client socket
	 * @access public
	 * @returns {void}
	 */
	clientConnect(_client) {
		// TODO
	}
}
