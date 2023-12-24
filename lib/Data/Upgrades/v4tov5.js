import { translateShowStatusBarFromBoolean } from '../../Resources/Util.js'

/**
 * @param {import('../Database.js').default} db
 * @returns {void}
 */
function fixControlShowStatusBar(db) {
	const controls = db.getKey('controls', {})

	for (const control of Object.values(controls)) {
		if (control.type !== 'button') continue
		control.style.show_statusbar = translateShowStatusBarFromBoolean(control.style.show_topbar)
		delete control.style.show_topbar
	}
}

/**
 * do the database upgrades to convert from the v3 to the v4 format
 * @param {import('../Database.js').default} db
 * @param {import('winston').Logger} _logger
 * @returns {void}
 */
function convertDatabaseToV4(db, _logger) {
	fixControlShowStatusBar(db)

	const userconfig = db.getKey('userconfig', {})
	if ('remove_topbar' in userconfig) {
		userconfig.show_statusbar = userconfig.remove_topbar ? 'hidden' : 'top'
		delete userconfig.remove_topbar
	}
}

/**
 * @param {any} obj
 * @returns {void}
 */
function convertImportToV4(obj) {
	// TODO?

	// if (obj.type == 'full') {
	// 	const newObj = { ...obj }
	// 	newObj.pages = cloneDeep(newObj.pages)
	// 	delete newObj.controls

	// 	for (const page of Object.values(newObj.pages)) {
	// 		page.controls = {}
	// 	}

	// 	for (const [controlId, controlObj] of Object.entries(obj.controls)) {
	// 		const parsedId = ParseBankControlId(controlId)
	// 		if (!parsedId) continue

	// 		const xy = oldBankIndexToXY(parsedId.bank)
	// 		const pageInfo = newObj.pages[parsedId.page]
	// 		if (xy && pageInfo) {
	// 			if (!pageInfo.controls[xy[1]]) pageInfo.controls[xy[1]] = {}
	// 			pageInfo.controls[xy[1]][xy[0]] = controlObj
	// 		}
	// 	}

	// 	ensureTriggersAreObject(newObj)

	// 	return newObj
	// } else if (obj.type == 'page') {
	// 	const newObj = { ...obj }
	// 	newObj.page = cloneDeep(newObj.page)
	// 	delete newObj.controls

	// 	newObj.page.controls = {}
	// 	for (const [controlId, controlObj] of Object.entries(obj.controls)) {
	// 		const parsedId = ParseBankControlId(controlId)
	// 		if (!parsedId) continue
	// 		const xy = oldBankIndexToXY(parsedId.bank)
	// 		if (xy) {
	// 			if (!newObj.page.controls[xy[1]]) newObj.page.controls[xy[1]] = {}
	// 			newObj.page.controls[xy[1]][xy[0]] = controlObj
	// 		}
	// 	}

	// 	return newObj
	// } else {
	// 	ensureTriggersAreObject(obj)

	// 	// No change
	// 	return obj
	// }
	return obj
}

export default {
	upgradeStartup: convertDatabaseToV4,
	upgradeImport: convertImportToV4,
}
