module.exports = {
	name: 'Chinese',
	code: 'zh-CN',

	// DEFAULT
	COMMAND_UNKNOWN: '该命令不存在。',
	NONE: '无',
	NAME: '名称',
	PASSWORD: '密码',
	QUANTITY: '数量',
	DELETE: '删除',
	DATE: '日期',
	HOURS: '小时',
	DURATION: '持续时间',
	DESCRIPTION: '描述',
	START: '开始',
	CANCEL: '取消',
	FINISHED: '已完成',
	CONFIRM: '确认',
	VALIDATE: '验证',
	VALIDATED: '已验证',
	PENDING: '待定',
	LOGISTICS: '物流',
	ASSIGNEE: '受让人',
	REVOKE: '撤销',
	BACK: '返回',
	INTERACTION_ERROR: '未找到此操作的交互。',
	PREFIX_MESSAGE: '嗨%author%！我的前缀是%prefix%，要获取帮助%prefix%help',
	STATUS: '状态',

	// COMMANDS

	// GITHUB
	GITHUB_REPLY: '仓库链接：%url%',
	GITHUB_MESSAGE: '你可以关注更新并通过 pull request 参与改进：协助更新阵营物资、提议新命令或提交 issue。',
	GITHUB_NOT_CONFIGURED: '未配置 GitHub 链接。',

	// FOXHOLE
	FOXHOLE_TITLE: 'Foxhole – 玩家与战争',
	FOXHOLE_PLAYERS_CURRENT: '在线玩家',
	FOXHOLE_WAR_TITLE: '当前战争',
	FOXHOLE_WAR_NUMBER: '战争 #',
	FOXHOLE_WAR_WINNER: '获胜方',
	FOXHOLE_WAR_REQUIRED_TOWNS: '胜利所需城镇',
	FOXHOLE_WAR_START: '征服开始',
	FOXHOLE_WINNER_NONE: '进行中',
	FOXHOLE_WINNER_WARDEN: 'Warden',
	FOXHOLE_WINNER_COLONIAL: 'Colonial',
	FOXHOLE_UNAVAILABLE: '数据不可用',
	FOXHOLE_ALL_UNAVAILABLE: '外部服务（Steam、Foxhole）无响应，请稍后再试。',

	COMMAND_EXECUTE_ERROR: '执行命令时发生错误。',
	OWNER_ONLY: '此命令仅适用于机器人所有者。',
	NO_DM: '我无法在私信中执行该命令！',
	NO_PERMS: '您没有使用此命令的权限。',
	ARGS_MISSING: '您没有提供任何参数，%author%！',
	COMMAND_USAGE: '正确的用法应为：%prefix%%command% %usage%',
	COMMAND_COOLDOWN: '请等待%time%秒，然后再次使用“%command%”命令。',

	// SERVER ---------------------------------------------

	// SERVER INIT
	SERVER_IS_ALREADY_INIT: '该服务器已经初始化。',
	SERVER_IS_INIT: '服务器已初始化。',
	SERVER_IS_NOT_INIT: '服务器尚未初始化，请使用“/setup”命令进行初始化。',

	// SERVER SHOW CONFIGURATION
	SERVER_TITLE_CONFIGURATION: '服务器配置',
	SERVER_FIELD_GUILD_NAME: '服务器名称',
	SERVER_FIELD_GUILD_ID: '服务器ID',
	SERVER_FIELD_GUILD_LANG: '服务器语言',
	SERVER_FIELD_GUILD_CAMP: '服务器阵营',

	// SERVER SETUP
	SERVER_SET_LANG_REPLY: '服务器语言已更改为**%lang%**。',
	SERVER_SET_CAMP_REPLY: '服务器阵营已更改为**%camp%**。',

	// OPERATION ---------------------------------------------
	OPERATION_CREATOR: '创建者',

	// OPERATION CREATE
	OPERATION_CREATE_TITLE: '操作%title%',
	OPERATION_CREATE_LABEL_DATE: '操作日期（dd/mm/yyyy）',
	OPERATION_CREATE_LABEL_TIME: '操作时间（hh:mm）',
	OPERATION_CREATE_LABEL_DURATION: '操作持续时间（以分钟为单位）',
	OPERATION_CREATE_LABEL_DESCRIPTION: '操作描述',

	// OPERATION GROUP
	OPERATION_NOT_EXIST: '此操作不存在。',
	OPERATION_NOT_HAVE_GROUPS: '此操作没有分组。',

	// OPERATION BUTTONS


	// OPERATION SUCCESS
	OPERATION_CREATE_SUCCESS: '已创建操作%title%。',
	OPERATION_LAUNCH_SUCCESS: '操作%title%已启动！',
	OPERATION_FINISHED_SUCCESS: '操作%title%已完成！',
	OPERATION_CANCELED_SUCCESS: '操作%title%已取消！',

	// OPERATION ERRORS
	OPERATION_TITLE_FORMAT_ERROR: '标题必须是字母数字字符，不得包含特殊字符。',
	OPERATION_CREATE_ERROR: '创建操作时发生错误。',
	OPERATION_DATE_FORMAT_ERROR: '日期格式不正确。',
	OPERATION_TIME_FORMAT_ERROR: '时间格式不正确。',
	OPERATION_DURATION_FORMAT_ERROR: '持续时间格式不正确。',
	OPERATION_DESCRIPTION_FORMAT_ERROR: '描述格式不正确。',
	OPERATION_LAUNCH_ERROR: '启动操作时发生错误。',
	OPERATION_FINISHED_ERROR: '完成操作时发生错误。',
	OPERATION_CANCELED_ERROR: '取消操作时发生错误。',
	OPERATION_ARE_NO_OWNER_ERROR: '您不是此操作的所有者。',

	// GROUP ---------------------------------------------
	GROUP_NOT_EXIST: '此分组不存在。',
	THREAD_NOT_EXIST: '此主题不存在。',
	THREAD_CLOSED_OR_ARCHIVED: '此主题已关闭或已存档。',
	GROUPS_OF_OPERATION: '操作分组%title%',

	GROUP_TITLE: '操作%title%的物流#%size%',

	// GROUP SUCCESS
	GROUP_CREATE_SUCCESS: '已创建物流主题！',

	// GROUP ERRORS
	GROUP_CREATE_ERROR: '实施物流时发生错误！',
	THREAD_CLOSE_ERROR: '关闭主题时发生错误！',
	THREAD_ARE_NO_OWNER_ERROR: '您不是此主题的所有者！',
	GROUP_NO_MATERIALS: '此组中没有材料。',

	// LOGISTIC ---------------------------------------------

	LOGISTIC_LIST_COMMANDS: '物流命令列表',

	// MATERIAL ---------------------------------------------

	MATERIAL: '材料',
	MATERIAL_NOT_EXIST: '此材料不存在。',
	MATERIAL_DETAIL: '材料详细信息',
	MATERIAL_ADD: '添加材料',
	MATERIAL_REMOVE: '删除材料',
	MATERIAL_SELECT_QUANTITY: '选择数量',
	MATERIAL_CONFIRMATION: '确认材料',
	MATERIAL_REVOKE: '撤销材料',
	MATERIAL_ENTER_ID: '输入材料ID',

	MATERIAL_NOMBER: '材料数量',
	MATERIAL_VALIDATE: '已验证的材料',
	MATERIAL_INVALIDATE: '未验证的材料',
	MATERIAL_QUANTITY_ASK: '要求的数量',
	MATERIAL_QUANTITY_GIVEN: '提供的数量',
	MATERIAL_CREATOR: '创建者',
	MATERIAL_PERSON_IN_CHARGE: '负责人',
	MATERIAL_LIST_OF_GROUP: '组材料列表',
	MATERIAL_LOCALIZATION: '存储位置',
	MATERIAL_HAVE_NO_NAME_OR_QUANTITY: '材料必须具有名称和数量。',
	MATERIAL_SELECT_TYPE: '选择要添加的材料类型',
	MATERIAL_SMALL_ARMS: '小型武器',
	MATERIAL_HEAVY_ARMS: '重型武器',
	MATERIAL_UTILITIES: '实用工具',
	MATERIAL_SHIPABLES: '可发运物品',
	MATERIAL_VEHICLES: '车辆',
	MATERIAL_UNIFORMS: '制服',
	MATERIAL_RESOURCES: '资源',
	MATERIAL_MEDICAL: '医疗',

	MATERIAL_LIST_SMALL_ARMS: '可用小型武器列表',
	MATERIAL_LIST_HEAVY_ARMS: '可用重型武器列表',
	MATERIAL_LIST_UTILITIES: '可用实用工具列表',
	MATERIAL_LIST_SHIPABLES: '可用可发运物品列表',
	MATERIAL_LIST_VEHICLES: '可用车辆列表',
	MATERIAL_LIST_UNIFORMS: '可用制服列表',
	MATERIAL_LIST_RESOURCES: '可用资源列表',

	// 新类别
	CATEGORY_UTILITIES: '实用工具',
	CATEGORY_INFANTRY_WEAPONS: '步兵武器',
	CATEGORY_AMMUNITION: '弹药',
	CATEGORY_RESOURCES: '资源',
	CATEGORY_VEHICLES: '车辆',

	// 实用工具子类别
	SUBCATEGORY_TOOLS: '工具',
	SUBCATEGORY_FIELD_EQUIPMENT: '野战装备',
	SUBCATEGORY_MOUNTED_EQUIPMENT: '安装设备',
	SUBCATEGORY_MEDICAL: '医疗',
	SUBCATEGORY_UNIFORMS: '制服',
	SUBCATEGORY_OUTFITS: '服装',

	// 步兵武器子类别
	SUBCATEGORY_SMALL_ARMS: '轻型武器',
	SUBCATEGORY_MELEE_WEAPONS: '近战武器',
	SUBCATEGORY_MACHINE_GUNS: '机枪',
	SUBCATEGORY_HEAVY_ARMS: '重型武器',
	SUBCATEGORY_GRENADES: '手榴弹',
	SUBCATEGORY_LAUNCHERS: '发射器',
	SUBCATEGORY_MORTAR: '迫击炮',

	// 弹药子类别
	SUBCATEGORY_LIGHT_AMMO: '轻型弹药',
	SUBCATEGORY_TANK_AMMO: '坦克弹药',
	SUBCATEGORY_AIRCRAFT_AMMO: '飞机弹药',
	SUBCATEGORY_ARTILLERY_AMMO: '火炮弹药',
	SUBCATEGORY_MISC_AMMO: '杂项弹药',
	SUBCATEGORY_FLAMETHROWER_AMMO: '火焰喷射器弹药',

	// 资源子类别
	SUBCATEGORY_BMAT: '基础材料',
	SUBCATEGORY_EMAT: '爆炸材料',
	SUBCATEGORY_HEMAT: '重型爆炸材料',
	SUBCATEGORY_RMAT: '精炼材料',
	SUBCATEGORY_GRAVEL: '砾石',

	// 车辆子类别
	SUBCATEGORY_VEHICLES: '车辆',

	MATERIAL_SUBCATEGORY_EMPTY: '此类别中没有可用材料。',

	// MATERIAL SUCCESS
	MATERIAL_CREATE_SUCCESS: '已创建材料。',
	MATERIAL_DELETE_SUCCESS: '已删除材料。',

	// MATERIAL ERRORS
	MATERIAL_CREATE_ERROR: '创建材料时发生错误。',
	MATERIAL_UPDATE_ERROR: '更新材料时发生错误。',
	MATERIAL_DELETE_ERROR: '删除材料时发生错误。',
	MATERIAL_SELECT_ERROR: '选择材料时发生错误。',
	MATERIAL_VALIDATE_ERROR: '验证材料时发生错误。',
	MATERIAL_CONFIRM_ERROR: '确认材料时发生错误。',
	MATERIAL_ASSIGN_ERROR: '指定材料时发生错误。',
	MATERIAL_ARE_NO_CREATOR_ERROR: '您不是此材料的创建者。',
	MATERIAL_ARE_NO_OWNER_ERROR: '您不是此材料的所有者。',
	MATERIAL_QUANTITY_ERROR: '数量必须是正数。',
	MATERIAL_SELECT_QUANTITY_ERROR: '选择数量时发生错误。',
	MATERIAL_LOCALIZATION_ERROR: '位置格式不正确。',
	MATERIAL_BACK_ERROR: '返回上一页时发生错误。',

	// STOCKPILE ---------------------------------------------

	STOCKPILE: '储备',
	STOCKPILE_LIST_COMMANDS: '库存命令列表',
	STOCKPILE_LIST: '库存列表',

	// STOCKPILE SUCCESS
	STOCKPILE_CREATE_SUCCESS: '库存已创建。',
	STOCKPILE_DELETE_SUCCESS: '库存已删除。',

	// STOCKPILE ERRORS
	STOCKPILE_LIST_EMPTY: '没有库存。',
	STOCKPILE_NOT_EXIST: '此库存不存在。',
	STOCKPILE_INVALID_ID: '库存ID无效。',
	STOCKPILE_CREATE_ERROR: '创建库存时发生错误。',
	STOCKPILE_DELETE_ERROR: '删除库存时发生错误。',
	STOCKPILE_INVALID_NAME: '库存名称无效。',
	STOCKPILE_INVALID_PASSWORD: '密码无效。',
};
