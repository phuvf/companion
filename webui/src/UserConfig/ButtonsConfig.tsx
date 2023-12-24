import React from 'react'
import { CButton } from '@coreui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUndo } from '@fortawesome/free-solid-svg-icons'
import CSwitch from '../CSwitch'
import type { UserConfigModel } from '@companion/shared/Model/UserConfigModel'
import { DropdownInputField } from '../Components'
import { DropdownChoice } from '@companion-module/base'

interface ButtonsConfigProps {
	config: UserConfigModel
	setValue: (key: keyof UserConfigModel, value: any) => void
	resetValue: (key: keyof UserConfigModel) => void
}

export function ButtonsConfig({ config, setValue, resetValue }: ButtonsConfigProps) {
	return (
		<>
			<tr>
				<th colSpan={0} className="settings-category">
					Buttons
				</th>
				<th className="fit"></th>
				<th></th>
			</tr>

			<tr>
				<td>Flip counting direction on page up/down buttons</td>
				<td>
					<div className="form-check form-check-inline mr-1 float-right">
						<CSwitch
							color="success"
							checked={config.page_direction_flipped}
							size={'lg'}
							onChange={(e) => setValue('page_direction_flipped', e.currentTarget.checked)}
						/>
					</div>
				</td>
				<td>
					<CButton onClick={() => resetValue('page_direction_flipped')} title="Reset to default">
						<FontAwesomeIcon icon={faUndo} />
					</CButton>
				</td>
			</tr>

			<tr>
				<td>Show + and - instead of arrows on page up/down buttons</td>
				<td>
					<div className="form-check form-check-inline mr-1 float-right">
						<CSwitch
							color="success"
							checked={config.page_plusminus}
							size={'lg'}
							onChange={(e) => setValue('page_plusminus', e.currentTarget.checked)}
						/>
					</div>
				</td>
				<td>
					<CButton onClick={() => resetValue('page_plusminus')} title="Reset to default">
						<FontAwesomeIcon icon={faUndo} />
					</CButton>
				</td>
			</tr>

			<tr>
				<td>Show the topbar on each button. This can be overridden per-button</td>
				<td>
					<div className="form-check form-check-inline mr-1 float-right">
						<DropdownInputField
							choices={SHOW_HIDE_STATUS_BAR}
							setValue={(val) => setValue('show_statusbar', val)}
							value={config.show_statusbar}
							multiple={false}
						/>
					</div>
				</td>
				<td>
					<CButton onClick={() => resetValue('show_statusbar')} title="Reset to default">
						<FontAwesomeIcon icon={faUndo} />
					</CButton>
				</td>
			</tr>
		</>
	)
}

const SHOW_HIDE_STATUS_BAR: DropdownChoice[] = [
	{ id: 'top', label: 'Top' },
	{ id: 'bottom', label: 'Bottom' },
	{ id: 'hidden', label: 'Hide' },
]
