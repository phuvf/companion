import type { ExportFormat } from './ExportFormat.js'
import type { UserConfigGridSize } from './UserConfigModel.js'

export interface ClientResetSelection {
	buttons: boolean
	connections: boolean
	surfaces: boolean
	triggers: boolean
	customVariables: boolean
	userconfig: boolean
}

export interface ClientExportSelection {
	buttons: boolean
	triggers: boolean
	customVariables: boolean
	connections: boolean
	surfaces: boolean
	userconfig: boolean
	format: ExportFormat
}

export interface ClientImportSelection {
	buttons: boolean
	customVariables: boolean
	surfaces: boolean
	triggers: boolean
	userconfig: boolean
}

export interface ClientPageInfo {
	name: string
	gridSize: UserConfigGridSize
}
export interface ClientImportObjectInstance {
	label: string
	instance_type: string
	sortOrder?: number
}
export interface ClientImportObject {
	type: 'page' | 'full'
	instances: Record<string, ClientImportObjectInstance>
	controls: boolean
	customVariables: boolean
	surfaces: boolean
	triggers: boolean | Record<string, { name: string }>
	userconfig: boolean
	oldPageNumber?: number
	page?: ClientPageInfo
	pages?: Record<number, ClientPageInfo>
}

export type InstanceRemappings = Record<string, string | undefined>
