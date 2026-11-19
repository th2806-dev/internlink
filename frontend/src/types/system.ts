export interface SystemMenuItem {
  code: string;
  name: string;
  moduleCode: string;
  sortOrder: number;
  funcUrl: string | null;
  iconName: string | null;
  badgeText: string | null;
  groupName?: string | null;
  children: SystemMenuItem[];
}

export interface SysFunction {
  id: string;
  autoId: number;
  code: string;
  name: string;
  description: string | null;
  parentAutoId: number | null;
  parentId: string | null;
  moduleCode: string;
  sortOrder: number;
  isAction: boolean;
  isActive: boolean;
  funcUrl: string | null;
  iconName: string | null;
  badgeText: string | null;
  isVisibleInMenu: boolean;
  isView: boolean;
  isNew: boolean;
  isEdit: boolean;
  isDelete: boolean;
  isExport: boolean;
  children: SysFunction[];
}

export interface SaveSysFunction {
  code: string;
  name: string;
  moduleCode: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isAction: boolean;
  isActive: boolean;
  funcUrl: string | null;
  iconName: string | null;
  badgeText: string | null;
  isVisibleInMenu: boolean;
  isView: boolean;
  isNew: boolean;
  isEdit: boolean;
  isDelete: boolean;
  isExport: boolean;
}

export interface SysFieldPolicy {
  id: string;
  formCode: string;
  fieldKey: string;
  roleId: number | null;
  isVisible: boolean;
  isRequired: boolean;
  isReadOnly: boolean;
  customLabel: string | null;
  defaultValue: string | null;
  validationRegex: string | null;
  errorMessage: string | null;
  sortOrder: number;
}

export interface SaveSysFieldPolicy {
  fieldKey: string;
  isVisible: boolean;
  isRequired: boolean;
  isReadOnly: boolean;
  customLabel: string | null;
  defaultValue: string | null;
  validationRegex: string | null;
  errorMessage: string | null;
  sortOrder: number;
}

export interface SysGridConfig {
  fieldCode: string;
  headerTitle: string;
  columnWidth: number;
  isVisible: boolean;
  isFrozen: boolean;
  frozenSide?: "left" | "right";
  sortOrder: number;
  headerBgColor?: string | null;
  headerTextColor?: string | null;
  cellFormatType: "text" | "date" | "number" | "percent" | "currency";
  cellColorRuleJson?: string | null;
}

export type SaveSysGridConfig = SysGridConfig;
